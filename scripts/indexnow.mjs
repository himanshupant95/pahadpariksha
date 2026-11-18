// IndexNow: tell Bing/Yandex/Seznam/Naver etc. which pages are new or changed, right after a deploy.
// build step:  node scripts/indexnow.mjs prepare  → hashes every sitemap page in dist/, writes dist/indexnow-manifest.json,
//              compares with the manifest on the live site and writes indexnow-urls.txt (new + changed pages only)
// after deploy: node scripts/indexnow.mjs submit  → POSTs indexnow-urls.txt to api.indexnow.org
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const SITE = 'https://pahadpariksha.in';
const HOST = 'pahadpariksha.in';
const LIST = 'indexnow-urls.txt';
const mode = process.argv[2];

async function key() {
  const f = (await readdir('public')).find((n) => /^[0-9a-f]{32}\.txt$/.test(n));
  if (!f) throw new Error('IndexNow key file missing in public/');
  return f.replace('.txt', '');
}

if (mode === 'prepare') {
  const idx = await readFile('dist/sitemap-index.xml', 'utf8');
  const maps = [...idx.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(SITE, 'dist'));
  const urls = [];
  for (const m of maps) urls.push(...[...(await readFile(m, 'utf8')).matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => x[1]));
  const manifest = {};
  for (const u of urls) {
    const path = 'dist' + new URL(u).pathname + (u.endsWith('/') ? 'index.html' : '');
    try {
      // ignore the rotating "आज का प्रश्न" block so a page only counts as changed when its real content changes
      const html = (await readFile(path, 'utf8')).replace(/<section class="daily"[\s\S]*?<\/section>/g, '');
      manifest[u] = createHash('sha1').update(html).digest('hex').slice(0, 12);
    } catch { /* page listed but not built — skip */ }
  }
  await writeFile('dist/indexnow-manifest.json', JSON.stringify(manifest));
  let live = null;
  try {
    const r = await fetch(`${SITE}/indexnow-manifest.json?t=${Date.now()}`, { signal: AbortSignal.timeout(15000) });
    if (r.ok) live = await r.json();
  } catch { /* first run or site unreachable */ }
  // first run (no live manifest yet): submit every page once
  const changed = Object.keys(manifest).filter((u) => !live || live[u] !== manifest[u]);
  await writeFile(LIST, changed.join('\n'));
  console.log(`indexnow: ${Object.keys(manifest).length} pages, ${changed.length} new/changed${live ? '' : ' (no live manifest — first submission)'}`);
  changed.slice(0, 30).forEach((u) => console.log('  ' + u));
} else if (mode === 'submit') {
  let urls = [];
  try { urls = (await readFile(LIST, 'utf8')).split('\n').filter(Boolean); } catch {}
  if (!urls.length) { console.log('indexnow: nothing new or changed'); process.exit(0); }
  const k = await key();
  const body = { host: HOST, key: k, keyLocation: `${SITE}/${k}.txt`, urlList: urls.slice(0, 10000) };
  // give GitHub Pages' CDN a moment so engines fetching right away get the new version
  await new Promise((r) => setTimeout(r, 30000));
  const r = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  console.log(`indexnow: submitted ${urls.length} URL(s) → HTTP ${r.status} ${r.status === 200 || r.status === 202 ? '(accepted)' : await r.text()}`);
  if (r.status >= 400 && r.status !== 429) process.exitCode = 1;
} else {
  console.error('usage: node scripts/indexnow.mjs prepare|submit');
  process.exit(2);
}
