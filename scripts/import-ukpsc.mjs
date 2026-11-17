// Manual UKPSC import. psc.uk.gov.in blocks foreign IPs, so GitHub can't scrape it. Each morning Claude runs
// scripts/ukpsc-extract.browser.js in Himanshu's browser (Indian connection), saves the output as JSON and runs:
//   node scripts/import-ukpsc.mjs ukpsc.json [--since YYYY-MM-DD]
// Input: [{section, adv, title, date, end, href, apply}] (dates dd-mm-yyyy). New items are merged into
// src/data/notices.json; open UKPSC applications go into src/data/recruitments.json (marked manual).
import { readFile, writeFile } from 'node:fs/promises';
import { SOURCES, categorize, clean, idOf, toISO } from './notice-lib.mjs';

const [file, ...flags] = process.argv.slice(2);
if (!file) { console.error('usage: node scripts/import-ukpsc.mjs ukpsc.json [--since YYYY-MM-DD]'); process.exit(1); }
const since = flags.includes('--since') ? flags[flags.indexOf('--since') + 1] : null;

const site = SOURCES.find((s) => s.name === 'UKPSC');
const raw = JSON.parse(await readFile(file, 'utf8'));
const notices = JSON.parse(await readFile('src/data/notices.json', 'utf8'));
const recruits = JSON.parse(await readFile('src/data/recruitments.json', 'utf8').catch(() => '[]'));
const known = new Set(notices.map((n) => n.id));
const today = new Date().toISOString().slice(0, 10);
const now = new Date().toISOString();

const fresh = [];
for (const r of raw) {
  if (!r.href || !r.title) continue;
  if (/^instructions?$/i.test(r.title.trim())) continue; // every answer key has an "Instructions" PDF — noise
  const date = toISO(r.date || '');
  if (since && date && date < since) continue;
  const title = clean(r.adv && !r.title.includes(r.adv) ? `${r.adv} — ${r.title}` : r.title);
  const id = idOf('UKPSC', title, r.href);
  if (known.has(id)) continue;
  known.add(id);
  const end = toISO(r.end || '');
  fresh.push({ id, source: 'UKPSC', title: end ? `${title} (अंतिम तिथि ${r.end.replaceAll('-', '/')})` : title, url: r.href,
    category: site.categoryFromUrl(r.href) || categorize(title), firstSeen: date ? `${date}T06:00:00.000Z` : now });

  // an open UKPSC application → "चालू भर्तियाँ" box (same shape as the UKSSSC portal rows)
  if (/recruitment/.test(r.href) && /^(advertisement|notification)$/i.test(r.title.trim()) && end && end >= today
      && /pscuk\.net\.in|ukpsc\.net\.in/.test(r.apply || '') && !recruits.some((x) => x.title === r.adv)) {
    recruits.push({ source: 'UKPSC', advt: 'UKPSC', type: 'UKPSC', title: r.adv, start: date, end, url: r.href, apply: r.apply, manual: true });
  }
}

const all = [...fresh, ...notices].sort((a, b) => b.firstSeen.localeCompare(a.firstSeen)); // keep the list chronological
await writeFile('src/data/notices.json', JSON.stringify(all.slice(0, 300), null, 2) + '\n');
await writeFile('src/data/recruitments.json', JSON.stringify(recruits, null, 2) + '\n');
console.log(`UKPSC import: ${raw.length} read, ${fresh.length} new`);
for (const f of fresh) console.log(`  + [${f.category}] ${f.title.slice(0, 110)}`);
