// One-off: test which commission URLs are reachable from this runner.
const urls = process.argv.slice(2);
const ip = await fetch('https://ipinfo.io/json').then(r => r.json()).catch(e => ({ error: String(e) }));
console.log('runner:', ip.ip, ip.city, ip.country, ip.org);
for (const u of urls) {
  const t = Date.now();
  try {
    const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36' }, signal: AbortSignal.timeout(25000), redirect: 'follow' });
    const body = await r.text();
    console.log(`OK  ${r.status} ${u} -> ${r.url} ${body.length}B ${Date.now() - t}ms title=${(body.match(/<title>([^<]*)/i) || [])[1]?.trim().slice(0, 60)}`);
  } catch (e) {
    console.log(`ERR ${u} ${Date.now() - t}ms ${e.name} ${e.cause?.code || ''} ${e.cause?.message || e.message}`);
  }
}
