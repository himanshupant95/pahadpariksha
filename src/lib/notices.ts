// Single place that decides what is still "live" on the notices page and homepage.
import notices from '../data/notices.json';
import recruitments from '../data/recruitments.json';
import overrides from '../data/notice-overrides.json';

export interface Notice { id: string; source: string; title: string; url: string; category: string; firstSeen: string; expires?: string }
export interface Recruitment { source: string; advt: string; type: string; title: string; start: string; end: string; url: string; apply: string }

const DAY = 864e5;
const ADMIT_DEFAULT_DAYS = 10; // UKSSSC usually releases admit cards ~7–10 days before the exam
const OTHER_DAYS = 60;          // answer keys, results etc. stay listed for 2 months
const endOfDayIST = (d: string) => `${d}T23:59:59+05:30`;
const ov = overrides as Record<string, { expired?: boolean; examDate?: string }>;

export function withExpiry(n: Notice): Notice | null {
  const o = ov[n.id];
  if (o?.expired) return null;
  if (n.category === 'भर्ती/विज्ञापन') return null; // open applications come from the portal table (has real last dates)
  let expires: string;
  if (n.category === 'प्रवेश पत्र') expires = o?.examDate ? endOfDayIST(o.examDate) : new Date(Date.parse(n.firstSeen) + ADMIT_DEFAULT_DAYS * DAY).toISOString();
  else expires = new Date(Date.parse(n.firstSeen) + OTHER_DAYS * DAY).toISOString();
  return { ...n, expires };
}

export function liveNotices(now = Date.now()) {
  return (notices as Notice[]).map(withExpiry).filter((n): n is Notice => !!n && Date.parse(n.expires!) > now);
}
export function admitCards(now = Date.now()) { return liveNotices(now).filter((n) => n.category === 'प्रवेश पत्र'); }
export function otherNotices(now = Date.now()) { return liveNotices(now).filter((n) => n.category !== 'प्रवेश पत्र'); }
export function openRecruitments(now = Date.now()) {
  return (recruitments as Recruitment[]).filter((r) => Date.parse(endOfDayIST(r.end)) > now).sort((a, b) => a.end.localeCompare(b.end));
}
export const recruitExpiry = (r: Recruitment) => endOfDayIST(r.end);
