// Telegram review bot for the current-affairs feed.
//   node scripts/telegram.mjs send  — after the nightly edition: send the new points + numbered pointers
//                                      to the owner's chat; saves the P-number map to .review/latest.json.
//                                      Exits 3 if Telegram is not configured (caller falls back to a GitHub issue).
//   node scripts/telegram.mjs poll  — read the owner's replies (/remove, /edit, /ok, /help), apply them to
//                                      src/data/digest.json, reply in the chat. Writes review-changed (1/0).
// Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (only this chat is obeyed).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { applyCommands } from './review-lib.mjs';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT = String(process.env.TELEGRAM_CHAT_ID || '').trim();
const DIGEST = 'src/data/digest.json';
const MAP = '.review/latest.json';
const SITE = 'https://pahadpariksha.in';
const mode = process.argv[2];

const tg = async (method, payload) => {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(30000),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(`${method}: ${j.description || r.status}`);
  return j.result;
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Telegram limit is 4096 chars per message: split on block boundaries
async function sendLong(blocks) {
  let buf = '';
  for (const b of blocks) {
    if ((buf + b).length > 3800 && buf) { await tg('sendMessage', { chat_id: CHAT, text: buf, parse_mode: 'HTML', disable_web_page_preview: true }); buf = ''; }
    buf += b;
  }
  if (buf) await tg('sendMessage', { chat_id: CHAT, text: buf, parse_mode: 'HTML', disable_web_page_preview: true });
}
const HELP = 'सुधार के आदेश (एक पंक्ति में एक; एक संदेश में कई भी चलेंगे):\n' +
  '<code>/remove P2</code> — पूरा बिंदु हटाएँ\n<code>/remove P2.3</code> — उप-बिंदु हटाएँ\n' +
  '<code>/edit P2 नया शीर्षक</code>\n<code>/edit P2.3 नया पाठ</code>\n<code>/ok</code> — सब ठीक है\n' +
  'आदेश हर ~10 मिनट में पढ़े जाते हैं; साइट उसके 2–3 मिनट बाद अपडेट होती है।';

if (!TOKEN || !CHAT) { console.log('telegram: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set'); if (mode === 'poll' && TOKEN) await reportChatIds(); process.exit(mode === 'send' ? 3 : 0); }

if (mode === 'send') {
  const run = JSON.parse(await readFile('new-digest.json', 'utf8').catch(() => '{}'));
  const dg = JSON.parse(await readFile(DIGEST, 'utf8'));
  const pts = (run.ids || []).map((id) => dg.points.find((p) => p.id === id)).filter(Boolean);
  const errors = run.errors || [];
  if (!pts.length && !errors.length) { console.log('telegram: nothing new'); process.exit(0); }
  const map = Object.fromEntries(pts.map((p, i) => [`P${i + 1}`, p.id]));
  await mkdir('.review', { recursive: true });
  if (pts.length) await writeFile(MAP, JSON.stringify({ sent: new Date().toISOString(), map }, null, 1) + '\n');
  const ist = new Date().toLocaleDateString('hi-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long' });
  const risky = pts.reduce((n, p) => n + (p.details || []).filter((d) => d.k === 'पृष्ठभूमि').length, 0);
  const blocks = [`📰 <b>करेंट अफेयर्स समीक्षा — ${esc(ist)}</b>\n${pts.length} नए बिंदु साइट पर लाइव हैं: ${SITE}/current-affairs/\n` +
    (risky ? `⚠ = पृष्ठभूमि (AI का सामान्य ज्ञान, ख़बर से नहीं) — ${risky} जाँचें\n` : '') +
    (errors.length ? `🔴 रन में त्रुटि: ${esc(errors.map((e) => e.slice(0, 160)).join(' | '))}\n` : '')];
  pts.forEach((p, i) => {
    let b = `\n<b>P${i + 1}</b> ${p.imp >= 3 ? '★ ' : ''}<b>${esc(p.fact)}</b>\n<i>${esc(p.cat)} · #${esc(p.tag)}</i>\n`;
    (p.details || []).forEach((d, j) => { b += `${d.k === 'पृष्ठभूमि' ? '⚠ ' : '• '}P${i + 1}.${j + 1} <b>${esc(d.k)}:</b> ${esc(d.v)}\n`; });
    const srcs = p.refs.filter((r, k, a) => a.findIndex((x) => x.source === r.source) === k).slice(0, 2);
    b += `स्रोत: ${srcs.map((r) => `<a href="${esc(r.link)}">${esc(r.source || 'समाचार')}</a>`).join(' · ')}\n`;
    blocks.push(b);
  });
  if (pts.length) blocks.push('\n' + HELP);
  await sendLong(blocks);
  console.log(`telegram: sent ${pts.length} points`);
}

if (mode === 'poll') {
  const updates = await tg('getUpdates', { timeout: 0, allowed_updates: ['message'] });
  await writeFile('review-changed', '0');
  if (!updates.length) { console.log('telegram: no messages'); process.exit(0); }
  const dg = JSON.parse(await readFile(DIGEST, 'utf8'));
  const { map = {} } = JSON.parse(await readFile(MAP, 'utf8').catch(() => '{}'));
  let anyChange = false;
  for (const u of updates) {
    const m = u.message; if (!m?.text) continue;
    if (String(m.chat.id) !== CHAT) { await tg('sendMessage', { chat_id: m.chat.id, text: 'यह निजी बॉट है।' }).catch(() => {}); continue; }
    const text = m.text.replace(/^\/(\w+)@\w+/gm, '/$1');
    if (/^\/(start|help)\b/i.test(text)) { await tg('sendMessage', { chat_id: CHAT, text: HELP, parse_mode: 'HTML' }); continue; }
    if (!Object.keys(map).length) { await tg('sendMessage', { chat_id: CHAT, text: 'अभी समीक्षा के लिए कोई बैच नहीं है।' }); continue; }
    const { reply, changed } = applyCommands(dg, map, text);
    anyChange ||= changed;
    await tg('sendMessage', { chat_id: CHAT, text: reply || 'कोई आदेश नहीं मिला — /help देखें।', reply_to_message_id: m.message_id }).catch((e) => console.log(e.message));
  }
  if (anyChange) await writeFile(DIGEST, JSON.stringify(dg, null, 1) + '\n');
  await writeFile('review-changed', anyChange ? '1' : '0');
  // confirm: Telegram drops everything up to this update id, so nothing is applied twice
  await tg('getUpdates', { offset: updates.at(-1).update_id + 1, timeout: 0 });
  console.log(`telegram: ${updates.length} message(s), changed=${anyChange}`);
}

// Before TELEGRAM_CHAT_ID is set: tell whoever messaged the bot their chat id (and print it in the log).
async function reportChatIds() {
  const updates = await tg('getUpdates', { timeout: 0 });
  for (const u of updates) {
    const c = u.message?.chat; if (!c) continue;
    console.log(`chat id: ${c.id} (${c.first_name || ''} @${c.username || ''})`);
    await tg('sendMessage', { chat_id: c.id, text: `आपकी Chat ID: ${c.id}\nइसे GitHub में TELEGRAM_CHAT_ID secret के रूप में जोड़ें।` }).catch(() => {});
  }
  if (updates.length) await tg('getUpdates', { offset: updates.at(-1).update_id + 1, timeout: 0 });
}
