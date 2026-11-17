// UKPSC relay — runs on Google Cloud Run in Mumbai (asia-south1).
// psc.uk.gov.in refuses connections from outside India, so GitHub's US runners can't read it.
// This tiny service fetches ONLY psc.uk.gov.in public pages and returns the HTML unchanged.
// Not an open proxy: fixed host, allow-listed paths, 5-minute cache, max 1 instance.
import http from 'node:http';

const HOST = 'https://psc.uk.gov.in';
const ALLOWED = /^\/(candidate-corner\/[a-z-]+)?$/; // "/" and section pages like /candidate-corner/results
const TTL = 5 * 60 * 1000;
const cache = new Map();

async function upstream(path) {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < TTL) return hit;
  const r = await fetch(HOST + path, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PahadParikshaBot/1.0; +https://pahadpariksha.in)', 'Accept-Language': 'hi,en;q=0.8' },
    signal: AbortSignal.timeout(25000),
  });
  const entry = { at: Date.now(), status: r.status, body: await r.text() };
  if (r.ok) cache.set(path, entry);
  return entry;
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('ukpsc-relay ok'); }
  if (u.pathname !== '/fetch' || req.method !== 'GET') { res.writeHead(404); return res.end(); }
  const path = u.searchParams.get('path') || '/';
  if (!ALLOWED.test(path)) { res.writeHead(400, { 'content-type': 'text/plain' }); return res.end('path not allowed'); }
  try {
    const { status, body } = await upstream(path);
    res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'x-upstream-status': String(status) });
    res.end(body);
  } catch (e) {
    res.writeHead(502, { 'content-type': 'text/plain' });
    res.end(`upstream error: ${e.cause?.code || ''} ${e.message}`);
  }
}).listen(process.env.PORT || 8080);
