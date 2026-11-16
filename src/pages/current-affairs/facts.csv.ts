// All current-affairs points as CSV, for the Google Sheet (=IMPORTDATA) and anyone compiling notes.
import type { APIRoute } from 'astro';
import { points } from '../../lib/digest';

const esc = (v: string | number) => {
  const s = String(v ?? '').replace(/\r?\n/g, ' ');
  return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const GET: APIRoute = () => {
  const rows = points().slice().sort((a, b) => a.date.localeCompare(b.date) || b.imp - a.imp);
  const head = ['Date', 'Month', 'Category', 'Importance', 'Fact', 'Keyword', 'Source', 'Link'];
  const body = rows.map((p) => {
    const src = p.refs.filter((r, i, a) => a.findIndex((x) => x.source === r.source) === i);
    return [p.date, p.date.slice(0, 7), p.cat, p.imp >= 3 ? '★ महत्वपूर्ण' : 'उपयोगी', p.fact, p.tag, src.map((r) => r.source).join(' / '), src[0]?.link ?? ''].map(esc).join(',');
  });
  return new Response([head.join(','), ...body].join('\n') + '\n', { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
};
