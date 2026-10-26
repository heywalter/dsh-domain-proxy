import { AsyncLocalStorage } from 'node:async_hooks';

// In-memory metadata only. Never retain stream chunks, messages, headers,
// request paths, session IDs, tool arguments or raw error messages.
const context = new AsyncLocalStorage();
const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const label = value => typeof value === 'string' ? value.slice(0, 160) : 'unknown';
const content = chunk => (
  ['text-delta', 'reasoning-delta'].includes(chunk.type) && typeof chunk.text === 'string' && chunk.text.length > 0
) || (chunk.type === 'tool-call-delta' && typeof chunk.argumentsDelta === 'string' && chunk.argumentsDelta.length > 0);
const allowedErrors = new Set(['AUTH','RATE_LIMIT','SERVER','TIMEOUT','TRANSPORT','ABORTED','EMPTY_RESPONSE','CONTEXT_WINDOW_EXCEEDED','NO_ADAPTER','INVALID_REQUEST']);

export function observeDispatch(origin, config, proxied, generation) {
  const call = context.getStore();
  if (!call || !call.accept()) return;
  let host;
  try { host = new URL(String(origin)).hostname.toLowerCase().replace(/\.$/, ''); } catch { return; }
  const matched = config.domains.find(x => host === x || config.includeSubdomains && host.endsWith('.' + x)) ?? null;
  const route = {host, matchedRule: matched, path: proxied ? 'proxy-dispatch' : 'original-dispatch',
    proxy: proxied ? config.proxyUrl : null, generation};
  call.dispatchCount++; call.row.dispatchCount = call.dispatchCount;
  // Bound redirect/retry fan-out without retaining URL paths or bodies.
  if (call.routes.length < 16) call.routes.push(route);
  else { call.routesTruncated = true; call.row.routesTruncated = true; }
}

export function createObserver({ limit = 100, clock = () => performance.now(), wall = () => new Date().toISOString() } = {}) {
  let enabled = false, epoch = 0, sequence = 0, rows = [];
  function clear() { epoch++; rows = []; }
  function configure(value) { if (enabled !== value) { enabled = value; clear(); } }
  function wrap(options, next, configGeneration) {
    if (!enabled) return next();
    const capturedEpoch = epoch;
    return (async function* () {
      if (!enabled || epoch !== capturedEpoch) { yield* next(); return; }
      const start = clock(), id = ++sequence;
      const row = {id, startedAt: wall(), provider: label(options.provider), model: label(options.model),
        generation: configGeneration, status: 'running', finishReason: null, errorCode: null,
        routes: [], routesTruncated: false, dispatchCount: 0,
        ttfcMs: null, streamMs: null, totalMs: null, maxContentGapMs: null,
        inputTokens: null, outputTokens: null, cacheReadTokens: null, cacheWriteTokens: null,
        streamTps: null, endToEndTps: null, retries: null, usageSource: 'unavailable'};
      let first = null, previous = null, blockStart = null, blockEnd = null, exhausted = false, iterator;
      const call = {row, routes: row.routes, dispatchCount: 0, routesTruncated: false,
        accept: () => enabled && epoch === capturedEpoch};
      rows.unshift(row); if (rows.length > limit) rows.length = limit;
      try {
        iterator = context.run(call, () => next()[Symbol.asyncIterator]());
        while (true) {
          const result = await context.run(call, () => iterator.next());
          if (result.done) { exhausted = true; break; }
          const chunk = result.value, now = clock();
          if (chunk?.type === 'block-start' && blockStart === null) blockStart = now;
          if (chunk?.type === 'block-end') blockEnd = now;
          if (chunk && content(chunk)) {
            if (first === null) { first = now; row.ttfcMs = now - start; }
            if (previous !== null) row.maxContentGapMs = Math.max(row.maxContentGapMs ?? 0, now - previous);
            previous = now;
          }
          if (chunk?.type === 'usage') {
            for (const field of ['inputTokens','outputTokens','cacheReadTokens','cacheWriteTokens']) row[field] = number(chunk.usage?.[field]);
            row.usageSource = 'dsh-adapter';
          }
          if (chunk?.type === 'finish') {
            const reason = chunk.reason?.kind;
            row.finishReason = ['stop','max-tokens','tool-calls','error','aborted'].includes(reason) ? reason : 'unknown';
            row.status = ['stop','max-tokens','tool-calls'].includes(reason) ? 'completed' : reason === 'aborted' ? 'aborted' : 'failed';
            const code = chunk.reason?.failure?.code;
            row.errorCode = code ? (allowedErrors.has(code) ? code : 'OTHER') : null;
            // Stop total timing at protocol finish, not at the consumer's later return.
            row.totalMs = now - start;
          }
          yield chunk; // Preserve exact chunk identity and protocol order.
        }
      } catch (error) {
        row.status = options.signal?.aborted ? 'aborted' : 'failed';
        row.errorCode = allowedErrors.has(error?.code) ? error.code : 'OTHER';
        throw error;
      } finally {
        try {
          if (!exhausted && iterator?.return) await context.run(call, () => iterator.return());
        } finally {
          if (row.status === 'running') row.status = options.signal?.aborted || !exhausted ? 'aborted' : 'incomplete';
          row.totalMs ??= clock() - start;
          row.streamMs = blockStart !== null && blockEnd !== null && blockEnd > blockStart ? blockEnd - blockStart : null;
          row.streamTps = row.status === 'completed' && row.outputTokens !== null && row.streamMs ? row.outputTokens * 1000 / row.streamMs : null;
          row.endToEndTps = row.status === 'completed' && row.outputTokens !== null && row.totalMs > 0 ? row.outputTokens * 1000 / row.totalMs : null;
          row.dispatchCount = call.dispatchCount; row.routesTruncated = call.routesTruncated;
        }
      }
    })();
  }
  return {
    configure, clear, wrap,
    snapshot: () => ({enabled, limit, retention: 'memory-until-clear-disable-or-restart',
      records: structuredClone(rows)}),
  };
}
