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
  if (/answer ?key|उत्तर ?कुंजी|objection|आपत्ति/.test(s)) return 'उत्तर कुंजी';
  if (/स्थगन|postpone|परीक्षा तिथि|exam date|calendar|कैलेंडर|परीक्षा कार्यक्रम/.test(s)) return 'परीक्षा तिथि';
  if (/टंकण|आशुलेखन|typing|steno(graphy)? test|कौशल/.test(s)) return 'कौशल परीक्षा';
  if (/अभिलेख|सन्निरीक्षा|document verification|डॉक्यूमेंट/.test(s)) return 'अभिलेख सत्यापन';
  if (/result|परिणाम|merit|मेरिट|श्रेष्ठता|संस्तुति|recommendation|selected|चयनित|निरस्तीकरण/.test(s)) return 'परिणाम';
  if (/interview|साक्षात्कार/.test(s)) return 'साक्षात्कार';
  if (/syllabus|पाठ्यक्रम/.test(s)) return 'पाठ्यक्रम';
  if (/ऑनलाइन आवेदन|online application|विज्ञापन|advertisement|सीधी भर्ती|fill application/.test(s)) return 'भर्ती/विज्ञापन';
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

// ---- Open applications: UKSSSC application portal lists every advertisement with start/end dates ----
const RECRUIT = 'src/data/recruitments.json';
const toISO = (d) => { const m = d.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null; };
async function scrapeRecruitments() {
  const url = 'https://ukssscrecruitment.in/';
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`UKSSSC portal: HTTP ${res.status}`);
  const $ = cheerio.load(await res.text());
  const rows = [];
  $('table tr').each((_, tr) => {
    const td = $(tr).find('td');
    if (td.length < 5) return;
    const advt = clean($(td[1]).text());
    const start = toISO($(td[3]).text()), end = toISO($(td[4]).text());
    if (!/UKSSSC/i.test(advt) || !end) return;
    const href = $(td[5] || td[td.length - 1]).find('a').attr('href');
    rows.push({ source: 'UKSSSC', advt, type: clean($(td[0]).text()), title: clean($(td[2]).text()), start, end,
      url: href ? new URL(href, url).href : url, apply: url });
  });
  if (!rows.length) throw new Error('UKSSSC portal: 0 advertisements parsed — layout may have changed');
  return rows;
}

const existing = JSON.parse(await readFile(DATA, 'utf8'));
// re-apply the latest category rules to everything already stored
for (const n of existing) n.category = categorize(n.title);
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

let newAdvts = [];
try {
  const prev = JSON.parse(await readFile(RECRUIT, 'utf8').catch(() => '[]'));
  const rec = await scrapeRecruitments();
  console.log(`UKSSSC portal: ${rec.length} advertisements`);
  const prevKeys = new Set(prev.map((r) => r.advt));
  newAdvts = rec.filter((r) => !prevKeys.has(r.advt)).map((r) => ({ id: idOf('advt', r.advt, r.end), source: r.source, title: `नई भर्ती: ${r.title} (विज्ञापन ${r.advt}, अंतिम तिथि ${r.end.split('-').reverse().join('/')})`, url: r.apply, category: 'भर्ती/विज्ञापन' }));
  if (prev.length === 0) newAdvts = []; // first run: seed silently
  await writeFile(RECRUIT, JSON.stringify(rec, null, 2) + '\n');
} catch (e) {
  console.error(`ERROR ${e.message}`);
  errors.push(e.message);
}
for (const a of newAdvts) fresh.push({ ...a, firstSeen: now });

const merged = [...fresh, ...existing].slice(0, MAX_ITEMS);
await writeFile(DATA, JSON.stringify(merged, null, 2) + '\n');
await writeFile('new-notices.json', JSON.stringify({ firstRun, items: fresh, errors }, null, 2));
console.log(`new: ${fresh.length}${firstRun ? ' (first run — seeding, no alert)' : ''}; errors: ${errors.length}`);
if (errors.length && errors.length === SOURCES.filter((s) => !s.disabled).length) process.exit(1);
