import { request, ProxyAgent } from 'undici';
import { normalizeConfig, ambientProxyNames, ConfigError } from './config.js';
export async function diagnose(input, { timeoutMs = 8000, signal } = {}) {
  const config = normalizeConfig(input);
  if (!config.domains.length) throw new ConfigError('DOMAINS','Choose at least one API hostname to check.');
  const host = config.domains[0];
  const agent = new ProxyAgent(config.proxyUrl);
  const start = performance.now();
  const report = { checkedAt: new Date().toISOString(), target: host, proxy: config.proxyUrl,
    route: 'explicit diagnostic proxy; this does not prove the running DSH plugin is active',
    ambientProxyVariables: ambientProxyNames(), modelTest: 'not-run', credentialsSent: false };
  try {
    const combined = signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs);
    // Fixed HTTPS root, no credentials/body, no redirect following or body
    // collection. A valid HTTP response establishes transport only.
    const response = await request('https://' + host + '/', { method: 'HEAD', dispatcher: agent,
      signal: combined, maxRedirections: 0, headersTimeout: timeoutMs, bodyTimeout: timeoutMs });
    await response.body.dump();
    return { ...report, transport: 'reachable', httpStatus: response.statusCode, elapsedMs: Math.round(performance.now() - start),
      message: 'TLS/HTTP reached through the proxy; model authentication and generation are not tested.' };
  } catch (error) {
    const rawCode = error?.code ?? error?.cause?.code;
    const known = ['ECONNREFUSED','ECONNRESET','ENOTFOUND','ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_ABORTED','DEPTH_ZERO_SELF_SIGNED_CERT','SELF_SIGNED_CERT_IN_CHAIN','CERT_HAS_EXPIRED','ERR_TLS_CERT_ALTNAME_INVALID'];
    const code = known.includes(rawCode) ? rawCode : ['AbortError','TimeoutError'].includes(error?.name) ? error.name : 'PROXY_OR_TARGET_UNREACHABLE';
    return { ...report, transport: 'failed', code, elapsedMs: Math.round(performance.now() - start),
      message: 'Check the proxy address, CONNECT support, target reachability and trusted certificates. TLS validation remains enabled.' };
  } finally { await agent.destroy(); }
}
