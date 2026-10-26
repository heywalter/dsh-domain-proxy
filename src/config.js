import { domainToASCII } from 'node:url';
import { isIP } from 'node:net';
export const DEFAULTS = Object.freeze({ enabled: false, recording: false, proxyUrl: 'http://127.0.0.1:7890', domains: [], includeSubdomains: false });
export class ConfigError extends Error { constructor(code, message) { super(message); this.name = 'ConfigError'; this.code = code; } }
export function normalizeConfig(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ConfigError('CONFIG', 'Expected a configuration object.');
  for (const key of Object.keys(input)) if (!Object.hasOwn(DEFAULTS, key)) throw new ConfigError('CONFIG', 'Unknown configuration field.');
  const config = { ...DEFAULTS, ...input };
  if (typeof config.recording !== 'boolean' || typeof config.enabled !== 'boolean' || typeof config.includeSubdomains !== 'boolean') throw new ConfigError('CONFIG', 'Switch values must be boolean.');
  let proxy;
  try { proxy = new URL(config.proxyUrl); } catch { throw new ConfigError('PROXY_URL', 'Enter a local HTTP(S) proxy URL, without credentials.'); }
  if (!['http:', 'https:'].includes(proxy.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(proxy.hostname) ||
      proxy.username || proxy.password || proxy.pathname !== '/' || proxy.search || proxy.hash) {
    throw new ConfigError('PROXY_URL', 'Use a loopback HTTP(S) proxy URL without credentials, path, query or fragment.');
  }
  if (!Array.isArray(config.domains) || (config.enabled && !config.domains.length) || config.domains.length > 32) throw new ConfigError('DOMAINS', 'Enter 1–32 API hostnames.');
  const domains = config.domains.map(value => {
    if (typeof value !== 'string' || value.length > 254 || /[:/\\@?#*\s]/u.test(value.trim())) throw new ConfigError('DOMAINS', 'Use hostnames only; URLs, ports and wildcards are not accepted.');
    const host = domainToASCII(value.trim().toLowerCase().replace(/\.$/, ''));
    if (!host || host.length > 253 || isIP(host) || !host.includes('.') ||
        host.split('.').some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) throw new ConfigError('DOMAINS', 'Enter valid DNS hostnames.');
    return host;
  });
  return { enabled: config.enabled, recording: config.recording, proxyUrl: proxy.origin, domains: [...new Set(domains)], includeSubdomains: config.includeSubdomains };
}
export function matches(origin, config) {
  let host;
  try { host = new URL(String(origin)).hostname.toLowerCase().replace(/\.$/, ''); } catch { return false; }
  return config.domains.some(domain => host === domain || config.includeSubdomains && host.endsWith('.' + domain));
}
export function ambientProxyNames(env = process.env) {
  return ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','http_proxy','https_proxy','all_proxy','no_proxy','NODE_USE_ENV_PROXY'].filter(k => Boolean(env[k]));
}
