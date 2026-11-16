// Fetches latest notices from UKSSSC and UKPSC homepages, merges new ones into src/data/notices.json.
// Writes new items to new-notices.json (for the GitHub issue alert). Run: node scripts/fetch-notices.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as cheerio from 'cheerio';

const DATA = 'src/data/notices.json';
const MAX_ITEMS = 300;
const UA = 'Mozilla/5.0 (compatible; PahadParikshaBot/1.0; +https://pahadpariksha.in)';

const SOURCES = [
  {
    name: 'UKSSSC',
    url: 'https://sssc.uk.gov.in/',
    // news ticker + the homepage notice lists
    selector: '.newsticker li a, .gen-list li a',
    // drop footer "useful links" (English titles to other govt portals)
    keep: (title, href) => /[\u0900-\u097F]/.test(title) || /\.pdf($|\?)/i.test(href),
  },
  {
    name: 'UKPSC',
    url: 'https://psc.uk.gov.in/',
    selector: '.custom-marque-section .marque-size a',
    // Paused: psc.uk.gov.in times out for GitHub's (US) runners. Re-enable when the job runs from an Indian network.
    disabled: true,
  },
];

const SKIP = /tender|quotation|निविदा|कोटेशन|photo gallery|फोटो/i;

function categorize(t) {
  const s = t.toLowerCase();
  if (/admit|प्रवेश पत्र|प्रवेश-पत्र/.test(s)) return 'प्रवेश पत्र';
  if (/answer ?key|उत्तर कुंजी|उत्तरकुंजी|objection|आपत्ति/.test(s)) return 'उत्तर कुंजी';
  if (/result|परिणाम|merit|मेरिट|संस्तुति|recommendation|selected|चयनित/.test(s)) return 'परिणाम';
  if (/interview|साक्षात्कार/.test(s)) return 'साक्षात्कार';
  if (/advt|advertisement|विज्ञापन|recruitment|भर्ती|online application|आवेदन/.test(s)) return 'भर्ती/विज्ञापन';
  if (/syllabus|पाठ्यक्रम/.test(s)) return 'पाठ्यक्रम';
  if (/exam date|परीक्षा तिथि|calendar|कैलेंडर|schedule|कार्यक्रम/.test(s)) return 'परीक्षा तिथि';
  return 'सूचना';
}

const clean = (t) => t.replace(/\s+/g, ' ').replace(/\bNew\b\s*$/i, '').replace(/हेतु क्लिक करें\s*$/, '').trim();
const idOf = (src, title, url) => createHash('sha1').update(`${src}|${title}|${url}`).digest('hex').slice(0, 12);

async function scrape(src) {
  const res = await fetch(src.url, { headers: { 'User-Agent': UA, 'Accept-Language': 'hi,en;q=0.8' }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${src.name}: HTTP ${res.status}`);
  const $ = cheerio.load(await res.text());
  const out = [];
  const seen = new Set();
  $(src.selector).each((_, el) => {
    const title = clean($(el).text());
    let href = ($(el).attr('href') || '').trim();
    if (!title || title.length < 15 || !href || href === '#' || SKIP.test(title)) return;
    try { href = new URL(href, src.url).href; } catch { return; }
    if (src.keep && !src.keep(title, href)) return;
    const id = idOf(src.name, title, href);
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ id, source: src.name, title, url: href, category: categorize(title) });
  });
  if (out.length === 0) throw new Error(`${src.name}: 0 items parsed — page layout may have changed`);
  return out;
}

const existing = JSON.parse(await readFile(DATA, 'utf8'));
const known = new Set(existing.map((n) => n.id));
const firstRun = existing.length === 0;
const now = new Date().toISOString();
const fresh = [];
const errors = [];

for (const src of SOURCES.filter((s) => !s.disabled)) {
  try {
    const items = await scrape(src);
    console.log(`${src.name}: ${items.length} items`);
    for (const it of items) if (!known.has(it.id)) { fresh.push({ ...it, firstSeen: now }); known.add(it.id); }
  } catch (e) {
    const cause = e.cause ? ` (${e.cause.code || ''} ${e.cause.message || e.cause})` : '';
    console.error(`ERROR ${src.name}: ${e.message}${cause}`);
    errors.push(`${src.name}: ${e.message}${cause}`);
  }
}

const merged = [...fresh, ...existing].slice(0, MAX_ITEMS);
await writeFile(DATA, JSON.stringify(merged, null, 2) + '\n');
await writeFile('new-notices.json', JSON.stringify({ firstRun, items: fresh, errors }, null, 2));
console.log(`new: ${fresh.length}${firstRun ? ' (first run — seeding, no alert)' : ''}; errors: ${errors.length}`);
if (errors.length && errors.length === SOURCES.filter((s) => !s.disabled).length) process.exit(1);
