export const API_PATH = '/domain-proxy/api';
const loopback = address => address === '::1' || address === '127.0.0.1' || address === '::ffff:127.0.0.1';
export function trusted(request) {
  if (!loopback(request.socket?.remoteAddress) || request.headers['x-dsh-domain-proxy'] !== '1') return false;
  try {
    if (/[\\/?#@]/.test(request.headers.host ?? '')) return false;
    const host = new URL('http://' + request.headers.host);
    if (!['127.0.0.1','localhost','[::1]'].includes(host.hostname) || host.username || host.password || host.pathname !== '/') return false;
    // Desktop's authenticated protocol bridge deliberately removes Origin.
    // Cross-origin browsers cannot set our custom header without a preflight,
    // and this endpoint does not grant CORS or accept OPTIONS.
    if (request.headers.origin && new URL(request.headers.origin).host !== host.host) return false;
    if (request.headers['sec-fetch-site'] === 'cross-site') return false;
    return true;
  } catch { return false; }
}
export function send(response, status, value) {
  response.writeHead(status, { 'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff' });
  response.end(JSON.stringify(value));
}
export async function readBody(request) {
  if (!request.headers['content-type']?.startsWith('application/json')) throw new Error('JSON_REQUIRED');
  let size = 0; const chunks = [];
  for await (const part of request) {
    size += part.length;
    if (size > 8192) throw new Error('BODY_TOO_LARGE');
    chunks.push(part);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
