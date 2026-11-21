// Self-host Wikimedia Commons images (runs after `astro build`, before pagefind).
// Why: hotlinked Commons thumbnails are generated on demand and rate-limited, so large sizes often
// time out or show as broken (tested 21 Nov 2026: 9 of 177 timed out, 20 took >5 s).
// What: finds every upload./thumb.wikimedia.org image URL in dist/**/*.html, downloads each once
// (cached in .cache/wm, restored by actions/cache in CI), copies it to dist/img/wm/, and rewrites the HTML.
// Credits/links to commons.wikimedia.org/wiki/File:... are untouched. If a download fails, the original
// URL stays, so the build never breaks. Wikimedia asks bots to send a descriptive User-Agent.
import { readdir, readFile, writeFile, mkdir, copyFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const DIST = 'dist';
const CACHE = '.cache/wm';
const OUT = path.join(DIST, 'img', 'wm');
const SITE = 'https://pahadpariksha.in';
const UA = 'PahadParikshaBuild/1.0 (https://pahadpariksha.in/contact/; static site image cache)';
const RE = /https:\/\/(?:upload|thumb)\.wikimedia\.org\/wikipedia\/commons\/[^"'\s,)<>]+?\.(?:jpe?g|png|svg|gif|webp)(?=["'\s,)<>]|$)/gi;

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith('.html')) yield p;
  }
}
const exists = async (p) => { try { return (await stat(p)).size > 0; } catch { return false; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function localName(url) {
  const clean = url.replace(/&amp;/g, '&');
  const h = createHash('sha1').update(clean.replace('://thumb.', '://upload.')).digest('hex').slice(0, 10);
  const tail = decodeURIComponent(clean.split('/').pop()).replace(/[^A-Za-z0-9._-]+/g, '_').slice(-60);
  return `${h}-${tail}`;
}

async function download(url, dest) {
  if (process.env.LOCALIZE_OFFLINE) return 'offline (test mode)';
  const src = url.replace(/&amp;/g, '&').replace('://thumb.', '://upload.');
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(src, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(90_000) });
      if (res.status === 429 || res.status >= 500) { await sleep(5000 * attempt); continue; }
      if (!res.ok) return `HTTP ${res.status}`;
      const type = res.headers.get('content-type') || '';
      if (!type.startsWith('image/')) return `not an image (${type})`;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 200) return 'empty';
      await writeFile(dest, buf);
      return 'ok';
    } catch (e) {
      if (attempt === 4) return String(e.message || e);
      await sleep(3000 * attempt);
    }
  }
  return 'gave up';
}

if (!process.env.CI && !process.env.LOCALIZE_IMAGES) {
  console.log('[localize-images] skipped (runs in CI; set LOCALIZE_IMAGES=1 to force)');
  process.exit(0);
}

const files = [];
for await (const f of walk(DIST)) files.push(f);
const urls = new Set();
const html = new Map();
for (const f of files) {
  const t = await readFile(f, 'utf8');
  const found = t.match(RE);
  if (found) { html.set(f, t); found.forEach((u) => urls.add(u)); }
}
await mkdir(CACHE, { recursive: true });
await mkdir(OUT, { recursive: true });

const map = new Map();
let fetched = 0, cached = 0;
const failed = [];
const queue = [...urls];
async function worker() {
  while (queue.length) {
    const u = queue.shift();
    const name = localName(u);
    const c = path.join(CACHE, name);
    if (await exists(c)) cached++;
    else {
      const r = await download(u, c);
      if (r !== 'ok') { failed.push(`${r}  ${u}`); continue; }
      fetched++;
      await sleep(400); // be gentle with Wikimedia
    }
    await copyFile(c, path.join(OUT, name));
    map.set(u, `${SITE}/img/wm/${encodeURIComponent(name)}`);
  }
}
await Promise.all([worker(), worker(), worker()]);

let changed = 0;
for (const [f, t] of html) {
  let n = t;
  for (const [u, local] of map) n = n.split(u).join(local);
  if (n !== t) { await writeFile(f, n); changed++; }
}
console.log(`[localize-images] ${urls.size} Wikimedia images: ${cached} from cache, ${fetched} downloaded, ${failed.length} left as hotlinks; ${changed} HTML files rewritten`);
if (failed.length) console.log(failed.slice(0, 30).map((x) => '  ' + x).join('\n'));
