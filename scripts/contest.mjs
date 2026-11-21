// Weekly Uttarakhand GK quiz contest in the channel's discussion group.
//   node scripts/contest.mjs start    — Sunday morning: next unplayed set from src/data/contests/*.json → intro + 20 quiz polls
//                                        (non-anonymous, so the bot learns who answered what) in the group; announce in channel.
//   node scripts/contest.mjs finish   — Sunday night: close the polls, read answers from the Cloudflare Worker,
//                                        rank by correct answers (tie: who finished earlier), post winners in group + channel.
//   node scripts/contest.mjs selftest — TEST=1 only: 3 polls to the owner, waits 4 min, posts the result there
//   node scripts/contest.mjs check    — verify the Worker (and switch its webhook to also receive poll answers).
// TEST=1 sends everything to the owner's private chat (TELEGRAM_CHAT_ID) instead of group/channel and keeps no state.
// DRY=1 prints instead of sending. Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (test only).
// Questions are our own practice questions written from the syllabus — never previous-year papers.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const CFG = JSON.parse(await readFile('src/data/contests/config.json', 'utf8'));
const STATE = 'src/data/contest-state.json';
const RESULTS = 'src/data/contest-results.json';
const SITE = 'https://pahadpariksha.in';
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DRY = !!process.env.DRY;
const TEST = !!process.env.TEST;
const GROUP = TEST ? process.env.TELEGRAM_CHAT_ID : CFG.group;
const CHANNEL = TEST ? process.env.TELEGRAM_CHAT_ID : CFG.channel;
const KEY = createHash('sha256').update(`${TOKEN}:contest`).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let changed = false;

if (!TOKEN && !DRY) { console.log('contest: TELEGRAM_BOT_TOKEN not set'); process.exit(0); }

async function tg(method, payload) {
  if (DRY) { console.log(`--- ${method} ${JSON.stringify(payload).slice(0, 300)}`); return { message_id: 1, poll: { id: `dry${Math.random()}` } }; }
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(30000),
    });
    const j = await r.json().catch(() => ({}));
    if (j.ok) return j.result;
    if (j.parameters?.retry_after) { await sleep((j.parameters.retry_after + 1) * 1000); continue; }
    throw new Error(`${method}: ${j.description || r.status}`);
  }
  throw new Error(`${method}: rate limited`);
}
async function worker(params) {
  if (DRY) return { ok: true, answers: {} };
  if (!CFG.worker) throw new Error('src/data/contests/config.json → "worker" URL not set');
  const r = await fetch(`${CFG.worker.replace(/\/$/, '')}/contest?key=${KEY}&${params}`, { signal: AbortSignal.timeout(30000) });
  const j = await r.json().catch(() => ({ ok: false, error: `HTTP ${r.status}` }));
  if (!j.ok) throw new Error(`worker: ${j.error}`);
  return j;
}
const loadState = async () => JSON.parse(await readFile(STATE, 'utf8').catch(() => '{"played":[]}'));
const save = async (file, obj) => { if (!DRY && !TEST) { await writeFile(file, JSON.stringify(obj, null, 1) + '\n'); changed = true; } };

// seeded shuffle so the right option is not always in the same place
function shuffled(options, answer, seed) {
  let s = seed >>> 0 || 1; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const idx = options.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return { options: idx.map((i) => options[i]), correct: idx.indexOf(answer) };
}
const hash = (t) => [...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

async function start() {
  const st = await loadState();
  if (st.current && !TEST) return console.log('contest: one is already running', st.current.id);
  const sets = (await readdir('src/data/contests')).filter((f) => /^[a-z]+-\d+\.json$/.test(f)).sort();
  const file = TEST ? sets[0] : sets.find((f) => !(st.played || []).includes(f.replace('.json', '')));
  if (!file) return console.log('contest: no unplayed question set — add src/data/contests/<subject>-<n>.json');
  const set = JSON.parse(await readFile(`src/data/contests/${file}`, 'utf8'));
  if (TEST) set.questions = set.questions.slice(0, 3);
  await worker('ensure=1'); // also proves the Worker + KV are ready before anything is posted
  const n = set.questions.length;
  const intro = `🏆 <b>साप्ताहिक क्विज़ प्रतियोगिता: ${esc(set.subject)}</b>\n\n` +
    `• ${n} प्रश्न, हर प्रश्न का एक ही प्रयास (उत्तर बदला नहीं जा सकता)\n` +
    `• समय: आज ${esc(CFG.closeText)} तक\n` +
    `• विजेता: सबसे अधिक सही उत्तर; बराबरी पर जिसने पहले सभी उत्तर दिए\n` +
    `• परिणाम: आज ${esc(CFG.resultText)}, चैनल और इस समूह में\n\n` +
    `ये प्रश्न पाठ्यक्रम और परीक्षा-रुझान के हमारे विश्लेषण पर आधारित <b>अभ्यास प्रश्न</b> हैं, पिछले वर्षों के प्रश्न नहीं।\n` +
    `ध्यान दें: इन प्रश्नों में आपका नाम और उत्तर दूसरों को दिख सकते हैं।\n\nशुभकामनाएँ! 👇`;
  const head = await tg('sendMessage', { chat_id: GROUP, text: intro, parse_mode: 'HTML' });
  if (!TEST) await tg('pinChatMessage', { chat_id: GROUP, message_id: head.message_id, disable_notification: false }).catch((e) => console.log('pin failed:', e.message));
  const polls = [];
  for (const [i, q] of set.questions.entries()) {
    const sh = shuffled(q.options, q.answer, hash(set.id + i));
    const m = await tg('sendPoll', {
      chat_id: GROUP, question: `प्रश्न ${i + 1}/${n}: ${q.q}`.slice(0, 300), options: sh.options.map((t) => ({ text: t })),
      type: 'quiz', correct_option_id: sh.correct, is_anonymous: false, explanation: q.explain.slice(0, 200), protect_content: true,
    });
    polls.push({ poll_id: m.poll.id, message_id: m.message_id, correct: sh.correct });
    await sleep(3500); // groups allow ~20 messages a minute
  }
  if (!TEST) {
    const link = CFG.groupLink ? `\n\n👉 भाग लें: ${CFG.groupLink}` : '';
    await tg('sendMessage', { chat_id: CHANNEL, text: `🏆 <b>आज की क्विज़ प्रतियोगिता शुरू: ${esc(set.subject)}</b>\n${n} प्रश्न, ${esc(CFG.closeText)} तक। परिणाम ${esc(CFG.resultText)}।${link}`, parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
  }
  st.current = { id: set.id, file: file.replace('.json', ''), subject: set.subject, revise: set.revise || '', started: new Date().toISOString(), head: head.message_id, polls };
  await save(STATE, st);
  if (TEST) await writeFile('contest-test.json', JSON.stringify(st.current));
  console.log('contest: started', set.id, polls.length);
}

async function finish() {
  const st = await loadState();
  const cur = TEST ? JSON.parse(await readFile('contest-test.json', 'utf8')) : st.current;
  if (!cur) return console.log('contest: nothing running');
  for (const p of cur.polls) { await tg('stopPoll', { chat_id: GROUP, message_id: p.message_id }).catch(() => {}); await sleep(300); }
  const { answers } = await worker(`polls=${cur.polls.map((p) => p.poll_id).join(',')}`);
  const users = {};
  for (const p of cur.polls) {
    for (const a of answers[p.poll_id] || []) {
      const u = (users[a.uid] ||= { n: a.n || 'प्रतिभागी', u: a.u || '', score: 0, answered: 0, last: 0 });
      u.answered++; u.last = Math.max(u.last, a.t || 0);
      if ((a.o || [])[0] === p.correct) u.score++;
    }
  }
  const ranked = Object.values(users).sort((a, b) => b.score - a.score || a.last - b.last);
  const total = cur.polls.length;
  const medal = ['🥇', '🥈', '🥉'];
  const name = (u) => esc(u.n) + (u.u ? ` (@${esc(u.u)})` : '');
  let t = `🏆 <b>परिणाम: ${esc(cur.subject)} क्विज़ प्रतियोगिता</b>\nकुल प्रतिभागी: ${ranked.length}\n\n`;
  if (!ranked.length) t += 'इस बार किसी ने भाग नहीं लिया। अगले रविवार फिर मिलेंगे!\n';
  ranked.slice(0, 10).forEach((u, i) => { t += `${medal[i] || `${i + 1}.`} ${name(u)}: ${u.score}/${total}\n`; });
  if (ranked.length) {
    const avg = (ranked.reduce((s, u) => s + u.score, 0) / ranked.length).toFixed(1);
    t += `\nऔसत अंक: ${avg}/${total}। बराबर अंक होने पर जिसने पहले सभी उत्तर दिए, वह ऊपर है।\n`;
  }
  t += `\nसही उत्तर और व्याख्या ऊपर हर प्रश्न में देख सकते हैं।${cur.revise ? ` विषय दोहराएँ: ${SITE}${cur.revise}` : ''}\nअगली प्रतियोगिता: अगले रविवार। 🙏`;
  await tg('sendMessage', { chat_id: GROUP, text: t, parse_mode: 'HTML', reply_to_message_id: cur.head, allow_sending_without_reply: true, link_preview_options: { is_disabled: true } });
  if (!TEST) {
    await tg('sendMessage', { chat_id: CHANNEL, text: t, parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
    await tg('unpinChatMessage', { chat_id: GROUP, message_id: cur.head }).catch(() => {});
    const results = JSON.parse(await readFile(RESULTS, 'utf8').catch(() => '[]'));
    results.unshift({ id: cur.id, subject: cur.subject, date: cur.started.slice(0, 10), participants: ranked.length, total,
      top: ranked.slice(0, 10).map((u) => ({ name: u.n, score: u.score })) });
    await save(RESULTS, results);
    st.played = [...new Set([...(st.played || []), cur.file])]; delete st.current;
    await save(STATE, st);
  }
  console.log('contest: finished', cur.id, ranked.length, 'participants');
}

const mode = process.argv[2];
try {
  if (mode === 'start') await start();
  else if (mode === 'finish') await finish();
  else if (mode === 'selftest') { // TEST=1: 3 polls to the owner, 4 minutes to answer, then results
    if (!TEST) throw new Error('selftest needs TEST=1');
    await start(); console.log('answer the 3 polls in your Telegram chat within 4 minutes…'); if (!DRY) await sleep(240000); await finish();
  } else if (mode === 'check') console.log('worker ok', JSON.stringify(await worker('ensure=1')));
  else { console.log('usage: contest.mjs start|finish|check'); process.exit(1); }
} finally { await writeFile('contest-changed', changed ? '1' : '0'); }
