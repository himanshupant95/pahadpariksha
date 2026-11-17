import data from '../data/digest.json';

export interface Ref { title: string; link: string; source: string }
export interface Detail { k: string; v: string }
export interface Point { id: string; date: string; fact: string; cat: string; imp: number; tag: string; refs: Ref[]; details?: Detail[] }

export const CAT_ORDER = ['योजना/नीति', 'प्रशासन', 'नियुक्ति', 'पुरस्कार/सम्मान', 'खेल', 'रिपोर्ट/रैंकिंग', 'परियोजना/अवसंरचना', 'अर्थव्यवस्था', 'पर्यावरण', 'संस्कृति/धर्म', 'विज्ञान/शिक्षा', 'परीक्षा/भर्ती', 'अन्य'];
export const digestUpdated: string | undefined = (data as any).updated;
export const points = (): Point[] => (((data as any).points ?? []) as Point[]).slice().sort((a, b) => b.date.localeCompare(a.date) || b.imp - a.imp);

const MONTHS = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
const d0 = (s: string) => new Date(s + 'T00:00:00Z');
const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** ISO week: key like 2026-w47, with Monday–Sunday range. */
export function weekOf(date: string) {
  const d = d0(date); const day = (d.getUTCDay() + 6) % 7; // Mon=0
  const mon = new Date(d); mon.setUTCDate(d.getUTCDate() - day);
  const sun = new Date(mon); sun.setUTCDate(mon.getUTCDate() + 6);
  const th = new Date(mon); th.setUTCDate(mon.getUTCDate() + 3);
  const y = th.getUTCFullYear(); const jan4 = new Date(Date.UTC(y, 0, 4));
  const w = 1 + Math.round(((+th - +jan4) / 864e5 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return { key: `${y}-w${String(w).padStart(2, '0')}`, start: ymd(mon), end: ymd(sun) };
}
export const monthOf = (date: string) => date.slice(0, 7);

export const fmtDay = (s: string) => { const d = d0(s); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
export const fmtShort = (s: string) => { const d = d0(s); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`; };
export const weekLabel = (start: string, end: string) => { const a = d0(start), b = d0(end);
  return a.getUTCMonth() === b.getUTCMonth() ? `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}` : `${fmtShort(start)} – ${fmtDay(end)}`; };
export const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

/** Compilation pages with too few points look thin to Google: they get noindex and stay out of the sitemap
 *  until they fill up (both flip back automatically on the next build). */
export const MIN_WEEK_POINTS = 12;
export const MIN_MONTH_POINTS = 30;
export function thinPaths(): string[] {
  return [
    ...weeks().filter((w) => w.items.length < MIN_WEEK_POINTS).map((w) => `/current-affairs/week/${w.key}/`),
    ...months().filter((m) => m.items.length < MIN_MONTH_POINTS).map((m) => `/current-affairs/month/${m.key}/`),
  ];
}

export function weeks() {
  const map = new Map<string, { key: string; start: string; end: string; items: Point[] }>();
  for (const p of points()) { const w = weekOf(p.date); (map.get(w.key) ?? map.set(w.key, { ...w, items: [] }).get(w.key)!).items.push(p); }
  return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
}
export function months() {
  const map = new Map<string, Point[]>();
  for (const p of points()) { const m = monthOf(p.date); (map.get(m) ?? map.set(m, []).get(m)!).push(p); }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([key, items]) => ({ key, items }));
}
export function byCategory(items: Point[]) {
  const map = new Map<string, Point[]>();
  for (const p of items) (map.get(p.cat) ?? map.set(p.cat, []).get(p.cat)!).push(p);
  return [...map.entries()].sort((a, b) => CAT_ORDER.indexOf(a[0]) - CAT_ORDER.indexOf(b[0]))
    .map(([cat, list]) => [cat, list.sort((a, b) => b.imp - a.imp || a.date.localeCompare(b.date))] as const);
}
export function byDay(items: Point[]) {
  const map = new Map<string, Point[]>();
  for (const p of items) (map.get(p.date) ?? map.set(p.date, []).get(p.date)!).push(p);
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}
