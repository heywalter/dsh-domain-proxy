import { Dispatcher, ProxyAgent, getGlobalDispatcher, setGlobalDispatcher, errors } from 'undici';
import { normalizeConfig, matches, ambientProxyNames } from './config.js';
import { observeDispatch } from './observation.js';
const OWNER = Symbol.for('dsh-domain-proxy.owner.v1');
function callbackResult(promise, callback) {
  if (callback === undefined) return promise;
  if (typeof callback !== 'function') throw new TypeError('Expected callback function.');
  promise.then(() => callback(null), error => callback(error));
}
export class DomainDispatcher extends Dispatcher {
  constructor(original, proxy, config, generation = 0) {
    super(); this.original = original; this.proxy = proxy; this.config = config; this.generation = generation;
    this.mode = 'active'; this.counts = { proxyAttempts: 0, originalAttempts: 0 }; this.draining = undefined;
  }
  dispatch(options, handler) {
    if (this.mode === 'closed' || this.mode === 'destroyed') {
      queueMicrotask(() => handler.onError(new errors.ClientClosedError())); return false;
    }
    const proxied = this.mode === 'active' && matches(options.origin, this.config);
    observeDispatch(options.origin, this.config, proxied, this.generation);
    this.counts[proxied ? 'proxyAttempts' : 'originalAttempts']++;
    return (proxied ? this.proxy : this.original).dispatch(options, handler);
  }
  // A retired router can remain referenced by another plugin. It must stay a
  // harmless pass-through instead of dispatching into its closed proxy.
  retire() {
    if (this.mode === 'active') this.mode = 'passthrough';
    return this.drain();
  }
  drain() {
    if (!this.draining) this.draining = Promise.resolve().then(() => this.proxy.close());
    return this.draining;
  }
  close(callback) {
    this.mode = 'closed';
    return callbackResult(this.drain(), callback);
  }
  destroy(error, callback) {
    if (typeof error === 'function') { callback = error; error = undefined; }
    this.mode = 'destroyed';
    return callbackResult(Promise.resolve().then(() => this.proxy.destroy(error)), callback);
  }
}
export function createRuntime(initial = {}, options = {}) {
  if (globalThis[OWNER]) throw new Error('DOMAIN_PROXY_DUPLICATE: disable the other domain-proxy instance first.');
  const owner = {}; globalThis[OWNER] = owner;
  let active, config, closed = false, generation = 0;
  const retired = new Map();
  const makeProxy = options.makeProxy ?? (url => new ProxyAgent(url));
  function retire(router) {
    if (!router) return;
    if (getGlobalDispatcher() === router) setGlobalDispatcher(router.original);
    const task = router.retire().catch(() => router.proxy.destroy().catch(() => undefined));
    retired.set(router, task);
    task.finally(() => retired.delete(router));
  }
  function configure(next) {
    if (closed) throw new Error('DOMAIN_PROXY_CLOSED');
    const normalized = normalizeConfig(next);
    if (active && getGlobalDispatcher() !== active && normalized.enabled) throw new Error('DOMAIN_PROXY_CONFLICT: another plugin replaced the network dispatcher. Disable it and restart.');
    if (config && ['enabled','proxyUrl','domains','includeSubdomains'].every(key => JSON.stringify(config[key]) === JSON.stringify(normalized[key]))) { config = normalized; return; }
    // Construct before mutating global state, so validation/allocation failure
    // cannot destroy the working route.
    const proxy = normalized.enabled ? makeProxy(normalized.proxyUrl) : undefined;
    retire(active); active = undefined; generation++;
    if (proxy) {
      active = new DomainDispatcher(getGlobalDispatcher(), proxy, normalized, generation);
      setGlobalDispatcher(active);
    }
    config = normalized;
  }
  try { configure(initial); } catch (error) { delete globalThis[OWNER]; throw error; }
  return {
    configure,
    snapshot() {
      return { config, generation, active: Boolean(active && getGlobalDispatcher() === active), conflict: Boolean(active && getGlobalDispatcher() !== active),
        counts: active ? { ...active.counts } : { proxyAttempts: 0, originalAttempts: 0 },
        drainingConnections: retired.size, ambientProxyVariables: ambientProxyNames(),
        scope: 'DSH backend global Fetch/Undici. Other destinations retain their existing route. Model availability is not tested.' };
    },
    async close({ forceAfterMs = 2000 } = {}) {
      if (closed) return;
      closed = true; retire(active); active = undefined;
      if (globalThis[OWNER] === owner) delete globalThis[OWNER];
      const pending = [...retired.values()];
      let timer;
      try {
        await Promise.race([Promise.allSettled(pending), new Promise(resolve => {
          timer = setTimeout(() => {
            // Only final plugin disposal has a bounded shutdown. Ordinary
            // configuration changes never forcibly terminate an existing stream.
            Promise.allSettled([...retired.keys()].map(r => r.proxy.destroy())).then(resolve);
          }, forceAfterMs);
        })]);
      } finally { clearTimeout(timer); }
    },
  };
}
