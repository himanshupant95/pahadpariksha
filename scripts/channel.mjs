// Public Telegram channel (t.me/pahadpariksha) autoposter.
//   node scripts/channel.mjs daily    — morning: latest edition's current-affairs points + one question (answer in spoiler)
//   node scripts/channel.mjs quiz     — evening: one practice question from the chapter quiz bank as a Telegram quiz poll
//   node scripts/channel.mjs weekly   — Sunday: link to this week's compilation
//   node scripts/channel.mjs monthly  — 1st of month: link to last month's compilation
//   node scripts/channel.mjs notices  — new official notices from new-notices.json (called by notices.yml)
//   node scripts/channel.mjs auto     — pick daily/quiz/weekly/monthly from IST clock (for scheduled runs)
// Env: TELEGRAM_BOT_TOKEN (the existing review bot, must be an admin of the channel), TELEGRAM_CHANNEL (default @pahadpariksha).
// State (what was already posted) lives in src/data/channel-state.json so safety-net runs never double-post.
// DRY=1 prints instead of sending.
import { readFile, writeFile, readdir } from 'node:fs/promises';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL = (process.env.TELEGRAM_CHANNEL || '@pahadpariksha').trim();
const DRY = !!process.env.DRY;
const SITE = 'https://pahadpariksha.in';
const STATE = 'src/data/channel-state.json';
const TAGS = '#उत्तराखंड #UKPSC #UKSSSC #LowerPCS2026';

if (!TOKEN && !DRY) { console.log('channel: TELEGRAM_BOT_TOKEN not set, skipping'); process.exit(0); }

const tg = async (method, payload) => {
  if (DRY) { console.log(`--- ${method}\n${JSON.stringify(payload, null, 1)}`); return {}; }
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHANNEL, ...payload }), signal: AbortSignal.timeout(30000),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(`${method}: ${j.description || r.status}`);
  return j.result;
};
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const istNow = () => new Date(Date.now() + 5.5 * 3600e3); // use getUTC* on this = IST fields
const isoDay = (d) => d.toISOString().slice(0, 10);
const hiDate = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const dayNo = (iso) => Math.floor(Date.parse(iso + 'T00:00:00Z') / 864e5);
function isoWeek(d) { // d: Date in UTC fields
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const wd = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - wd);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-w${String(Math.ceil(((t - y0) / 864e5 + 1) / 7)).padStart(2, '0')}`;
}
const pageLive = async (url) => { if (DRY) return true; try { return (await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(20000) })).ok; } catch { return false; } };
const loadState = async () => JSON.parse(await readFile(STATE, 'utf8').catch(() => '{}'));
let changed = false;
const saveState = async (s) => { if (!DRY) { await writeFile(STATE, JSON.stringify(s, null, 1) + '\n'); changed = true; } };

async function daily(state) {
  const dg = JSON.parse(await readFile('src/data/digest.json', 'utf8'));
  const target = dg.points.map((p) => p.date).sort().at(-1);
  const today = isoDay(istNow());
  if (!target || (state.daily && target <= state.daily)) return console.log('daily: nothing new', target);
  if (dayNo(today) - dayNo(target) > 2) return console.log('daily: latest edition is stale', target);
  const pts = dg.points.filter((p) => p.date === target).sort((a, b) => (b.imp || 0) - (a.imp || 0)).slice(0, 8);
  if (pts.length < 2) return console.log('daily: too few points', pts.length);
  let t = `📰 <b>उत्तराखंड करेंट अफेयर्स | ${esc(hiDate(target))}</b>\n\n`;
  pts.forEach((p, i) => { t += `${i + 1}. ${esc(p.fact)}\n\n`; });
  const qp = pts.find((p) => p.quiz?.q && p.quiz?.a);
  if (qp) t += `❓ <b>प्रश्न:</b> ${esc(qp.quiz.q)}\n✅ उत्तर: <tg-spoiler>${esc(qp.quiz.a)}</tg-spoiler>\n\n`;
  t += `📖 विस्तार, स्रोत और क्विज़: ${SITE}/current-affairs/\n\n${TAGS}`;
  if (t.length > 4000) t = t.slice(0, 3990) + '…';
  await tg('sendMessage', { text: t, parse_mode: 'HTML', link_preview_options: { url: `${SITE}/current-affairs/`, prefer_large_media: true } });
  state.daily = target; await saveState(state);
  console.log('daily: posted', target, pts.length);
}

async function quizBank() {
  const idx = await readFile('src/data/quiz-index.ts', 'utf8');
  const urls = Object.fromEntries([...idx.split('QUIZ_GROUPS')[0].matchAll(/'?([\w-]+)'?:\s*'([^']+#quiz)'/g)].map((m) => [m[1], m[2]]));
  const titles = Object.fromEntries([...idx.matchAll(/\['([\w-]+)',\s*'([^']+)'\]/g)].map((m) => [m[1], m[2]]));
  const bank = [];
  for (const f of (await readdir('src/data/quizzes')).filter((f) => f.endsWith('.json')).sort()) {
    const slug = f.replace(/\.json$/, '');
    if (!urls[slug]) continue;
    const qs = JSON.parse(await readFile(`src/data/quizzes/${f}`, 'utf8'));
    qs.forEach((q, i) => {
      if (!q.q || !Array.isArray(q.options) || typeof q.answer !== 'number') return;
      if (q.q.length > 300 || q.options.length < 2 || q.options.length > 10 || q.options.some((o) => String(o).length > 100)) return;
      bank.push({ ...q, slug, key: `${slug}#${i}`, url: SITE + urls[slug], title: titles[slug] || '' });
    });
  }
  // fixed pseudo-random order so consecutive days jump between subjects
  let s = 20261121; const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = bank.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [bank[i], bank[j]] = [bank[j], bank[i]]; }
  return bank;
}

async function quiz(state) {
  const today = isoDay(istNow());
  if (state.quiz === today) return console.log('quiz: already posted today');
  const bank = await quizBank();
  if (!bank.length) return console.log('quiz: empty bank');
  const posted = new Set(state.quizPosted || []);
  if (posted.size >= bank.length) posted.clear(); // whole bank used once: start a new round
  const q = bank.find((x) => !posted.has(x.key));
  let explain = String(q.explain || '').replace(/^\([^)]*\)\s*/, '');
  if (explain.length > 200) explain = explain.slice(0, 197) + '…';
  await tg('sendPoll', {
    question: `🧠 आज का अभ्यास प्रश्न\n${q.q}`.slice(0, 300), options: q.options.map((o) => ({ text: String(o) })),
    type: 'quiz', correct_option_id: q.answer, is_anonymous: true, ...(explain ? { explanation: explain } : {}),
  });
  await tg('sendMessage', { text: `📚 यह प्रश्न "${esc(q.title)}" अध्याय से है। पूरा अध्याय और उसका क्विज़: ${q.url}\n\nये अभ्यास प्रश्न हैं, पिछले वर्षों के प्रश्न नहीं।`, parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
  posted.add(q.key);
  state.quiz = today; state.quizPosted = [...posted]; await saveState(state);
  console.log('quiz: posted', q.key);
}

async function weekly(state) {
  const lastWeekDay = new Date(istNow().getTime() - 864e5); // Sunday morning → the week that ends today
  const wk = isoWeek(lastWeekDay);
  if (state.weekly === wk) return console.log('weekly: already posted', wk);
  const url = `${SITE}/current-affairs/week/${wk}/`;
  if (!(await pageLive(url))) return console.log('weekly: page not live', url);
  await tg('sendMessage', { text: `🗓️ <b>साप्ताहिक संकलन</b>\nइस सप्ताह के उत्तराखंड करेंट अफेयर्स एक जगह, स्रोत और क्विज़ के साथ। रविवार को एक बार दोहरा लें।\n\n${url}\n\n${TAGS}`, parse_mode: 'HTML', link_preview_options: { url, prefer_large_media: true } });
  state.weekly = wk; await saveState(state); console.log('weekly: posted', wk);
}

async function monthly(state) {
  const n = istNow(); const prev = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() - 1, 15));
  const m = prev.toISOString().slice(0, 7);
  if (state.monthly === m) return console.log('monthly: already posted', m);
  const name = prev.toLocaleDateString('hi-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const url = `${SITE}/current-affairs/month/${m}/`;
  if (!(await pageLive(url))) return console.log('monthly: page not live', url);
  await tg('sendMessage', { text: `📘 <b>मासिक संकलन: ${esc(name)}</b>\nपूरे महीने के उत्तराखंड करेंट अफेयर्स, विषय के अनुसार। PDF की तरह प्रिंट भी कर सकते हैं।\n\n${url}\n\n${TAGS}`, parse_mode: 'HTML', link_preview_options: { url, prefer_large_media: true } });
  state.monthly = m; await saveState(state); console.log('monthly: posted', m);
}

async function notices() {
  const run = JSON.parse(await readFile('new-notices.json', 'utf8').catch(() => '{}'));
  if (run.firstRun || !run.items?.length) return console.log('notices: nothing to post');
  const items = run.items.slice(0, 12);
  let t = `🔔 <b>${items.length === 1 ? 'नई आधिकारिक सूचना' : `${items.length} नई आधिकारिक सूचनाएँ`}</b>\n\n`;
  for (const i of items) t += `• <b>${esc(i.source)}</b> · ${esc(i.category)}\n<a href="${esc(i.url)}">${esc(i.title.slice(0, 220))}</a>\n\n`;
  if (run.items.length > items.length) t += `और ${run.items.length - items.length} सूचनाएँ साइट पर।\n`;
  t += `सभी सूचनाएँ: ${SITE}/notices/\nहमेशा आयोग की आधिकारिक वेबसाइट से मिलान करें।`;
  await tg('sendMessage', { text: t, parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
  console.log('notices: posted', items.length);
}

const mode = process.argv[2];
const state = await loadState();
if (mode === 'notices') await notices();
else if (mode === 'daily') await daily(state);
else if (mode === 'quiz') await quiz(state);
else if (mode === 'weekly') await weekly(state);
else if (mode === 'monthly') await monthly(state);
else if (mode === 'auto') {
  const n = istNow(); const h = n.getUTCHours();
  if (h >= 6 && h < 12) {
    await daily(state);
    if (n.getUTCDay() === 0) await weekly(state);
    if (n.getUTCDate() <= 2) await monthly(state);
  } else if (h >= 17 && h < 23) await quiz(state);
  else console.log('auto: outside posting hours', h);
} else { console.log('usage: channel.mjs daily|quiz|weekly|monthly|notices|auto'); process.exit(1); }
await writeFile('channel-changed', changed ? '1' : '0');
