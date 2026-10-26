import Schema from '@deepseek-ai/schemastery';
import { normalizeConfig, DEFAULTS } from './config.js';
import { createRuntime } from './router.js';
import { diagnose } from './doctor.js';
import { API_PATH, trusted, send, readBody } from './http.js';
import { providerChoices } from './providers.js';
import { createObserver } from './observation.js';
export const name = 'domain-proxy';
export const Config = Schema.object({
  recording: Schema.boolean().default(false).description('Record recent call metadata in memory / 记录最近调用元数据').volatile(),
  enabled: Schema.boolean().default(false).description('Enable domain routing / 启用域名分流').volatile(),
  proxyUrl: Schema.string().default('http://127.0.0.1:7890').description('Local HTTP(S) proxy / 本机代理地址').volatile(),
  domains: Schema.array(Schema.string()).default([]).description('Exact API hostnames / API 域名').volatile(),
  includeSubdomains: Schema.boolean().default(false).description('Also match subdomains / 包含子域名').volatile(),
});
export function apply(ctx, input = {}) {
  // Validate before registering any side effects.
  const readConfig = () => normalizeConfig(Object.fromEntries(Object.keys(DEFAULTS).map(key => [key, typeof input[key]?.get === 'function' ? input[key].get() : input[key] ?? DEFAULTS[key]])));
  let config = readConfig();
  const runtime = createRuntime(config);
  const observer = createObserver();
  observer.configure(config.recording);
  ctx.on('llm/stream', (options, next) => observer.wrap(options, next, runtime.snapshot().generation));
  let providerCatalog = () => ({available:false,items:[]});
  ctx.inject(['llm','settings'], child => {
    providerCatalog=()=>{try{return {available:true,items:providerChoices(child.llm.listConfigurableProviders(),child.settings.describe({redactSecrets:true}),child.llm.listProviders())};}catch{return {available:false,items:[]};}};
    child.effect(()=>()=>{providerCatalog=()=>({available:false,items:[]});});
  });
  let disposed = false;
  const sync = () => {
    if (disposed) return;
    const next = readConfig();
    if (JSON.stringify(next) !== JSON.stringify(config)) { runtime.configure(next); observer.configure(next.recording); config = next; }
  };
  ctx.effect(() => () => { disposed = true; observer.configure(false); return runtime.close(); }, 'domain-proxy: release owned connections');
  ctx.on('app-boot/config-reload', sync);
  ctx.inject(['settings','webServer'], web => {
    let probing = false;
    const abort = new AbortController();
    const namespace = ctx.fiber.entry?.options?.id ?? ctx.fiber.entry?.id ?? 'domain-proxy';
    const descriptor = () => web.settings.describe({ redactSecrets: true }).find(x => x.ns === namespace);
    const state = () => { sync(); return { ...runtime.snapshot(), observation: observer.snapshot(), providers: providerCatalog(), observedAt: new Date().toISOString(), revision: descriptor()?.revision ?? null }; };
    web.effect(() => web.settings.configure({ auto: false }, ctx.fiber));
    web.effect(() => () => abort.abort());
    web.effect(() => web.webServer.register({ kind: 'exact', path: API_PATH, handler: async (req, res) => {
      if (!trusted(req)) return send(res, 403, { error: 'LOCAL_UI_REQUIRED' });
      if (req.method === 'GET') return send(res, 200, state());
      if (req.method !== 'POST') return send(res, 405, { error: 'METHOD_NOT_ALLOWED' });
      try {
        const body = await readBody(req);
        if (body.action === 'save') {
          if (!Number.isSafeInteger(body.revision)) return send(res,409,{error:'REFRESH_REQUIRED'});
          const next = normalizeConfig(body.config);
          // Do not persist a config that the active runtime already knows will
          // conflict with another network plugin.
          if (runtime.snapshot().conflict && next.enabled) return send(res,409,{error:'NETWORK_PLUGIN_CONFLICT'});
          await web.settings.update(namespace, next, body.revision);
          sync();
          return send(res,200,state());
        }
        if (body.action === 'clear-records') {
          observer.clear(); return send(res,200,state());
        }
        if (body.action === 'check') {
          if (probing) return send(res,429,{error:'CHECK_ALREADY_RUNNING'});
          const draft = normalizeConfig(body.config);
          probing = true;
          try { return send(res,200,{ report: await diagnose(draft, {signal:abort.signal}) }); }
          finally { probing = false; }
        }
        return send(res,400,{error:'UNKNOWN_ACTION'});
      } catch (error) {
        const validation = error?.name === 'ConfigError';
        return send(res,400,{error: validation ? error.code : 'CONFIGURATION_NOT_APPLIED',
          message: validation ? error.message : 'Refresh the page and check DSH plugin compatibility. Existing values may have changed.'});
      }
    }}), 'domain-proxy: local settings API');
  });
}
