import data from '../data/news.json';

export interface NewsItem {
  id: string; title: string; link: string; source: string; sources?: string[];
  published: string; lang: 'hi' | 'en'; score: number; cat: string; firstSeen: string;
}

export const newsUpdated: string | undefined = (data as any).updated;
export const allNews = (): NewsItem[] => ((data as any).items as NewsItem[]) ?? [];

const istDay = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

/** Items grouped by IST date (newest first), within the last `days`. */
export function newsByDay(days = 30) {
  const cut = Date.now() - days * 864e5;
  const groups = new Map<string, NewsItem[]>();
  for (const n of allNews()) {
    if (Date.parse(n.published) < cut) continue;
    const d = istDay(n.published);
    (groups.get(d) ?? groups.set(d, []).get(d)!).push(n);
  }
  for (const list of groups.values()) list.sort((a, b) => b.score - a.score || b.published.localeCompare(a.published));
  return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

/** Top items of the last few days for the homepage. */
export const topNews = (n = 5, days = 3) =>
  allNews().filter((x) => Date.parse(x.published) > Date.now() - days * 864e5)
    .sort((a, b) => b.score - a.score || b.published.localeCompare(a.published)).slice(0, n);
