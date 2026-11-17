// AI editor for the current-affairs feed.
// Reads candidate headlines (src/data/news.json), sends the ones not yet reviewed to an LLM
// (Google Gemini API, free tier, via its OpenAI-compatible endpoint), and keeps only exam-worthy
// facts, rewritten as one-line Hindi exam points, in src/data/digest.json.
// Needs env GEMINI_API_KEY (GitHub secret). Run: node scripts/digest-news.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const NEWS = 'src/data/news.json';
const DIGEST = 'src/data/digest.json';
const KEY = process.env.GEMINI_API_KEY;
const API = 'https://generativelanguage.googleapis.com/v1beta';

// Pick the best available Flash model at run time (Google renames models often).
async function pickModels() {
  const res = await fetch(`${API}/models?pageSize=200&key=${KEY}`, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`model list: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const names = ((await res.json()).models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''))
    .filter((n) => /^gemini-[\d.]+-flash/.test(n) && !/image|tts|audio|live|thinking|exp|preview|embedding|computer/.test(n));
  const ver = (n) => parseFloat(n.match(/gemini-([\d.]+)/)[1]);
  const rank = (n) => ver(n) * 10 - (/lite/.test(n) ? 5 : 0);
  return names.sort((a, b) => rank(b) - rank(a)).slice(0, 3);
}
let MODELS = [];
const CATS = ['योजना/नीति', 'नियुक्ति', 'पुरस्कार/सम्मान', 'खेल', 'रिपोर्ट/रैंकिंग', 'पर्यावरण', 'परियोजना/अवसंरचना', 'अर्थव्यवस्था', 'संस्कृति/धर्म', 'विज्ञान/शिक्षा', 'परीक्षा/भर्ती', 'प्रशासन', 'अन्य'];

const MAX_PER_DAY = 10;

const SYSTEM = `You are the current-affairs editor for UKPSC and UKSSSC exams (Uttarakhand Public Service Commission and Subordinate Service Selection Commission: Lower PCS, PCS, Patwari/Lekhpal, VDO, JA etc.).
You receive ALL news headlines about Uttarakhand from ONE day (Hindi or English), each with an id; some also have a short summary (सार) from the publisher. Produce that day's exam bulletin.

THE ONLY TEST: "Could a UKPSC/UKSSSC general-knowledge question plausibly be asked on this?" If not clearly yes, DROP it. Most days only 2–8 items pass; an empty list is fine. Never pad.

KEEP only concrete, durable facts such as:
- a named state/central scheme, policy, act, rule, ordinance or cabinet decision concerning Uttarakhand (with its name);
- appointment of a person to a notable state or national post (Governor, Chief Secretary, DGP, Chief Justice, Vice-Chancellor, chairman of a commission/board, brand ambassador);
- a government (central/state) or nationally recognised award or honour to a person/institution of Uttarakhand (name the award) — NOT memorial (स्मृति) awards, awards given at conferences/sammelans, or awards by private trusts, societies or media houses;
- a national ranking/index/survey result, an all-India or state "first", or a record;
- a new institution, major project, MoU or investment with name, place and amount; GI tag; Ramsar site, tiger reserve, protected area, eco-sensitive zone;
- medals of Uttarakhand athletes at national/international events;
- official opening/closing dates of Char Dham or other major yatras and fairs (named fair + place);
- census/data releases; state foundation-level events with a concrete fact.
DROP: speeches, visions, roadmaps, "CM said/directed/reviewed", inspections, felicitation functions, small local events or awards by private bodies, routine fund sanctions, exam results/admit cards, party politics, elections, protests, crime, accidents, weather, opinion, promotions, and anything already in ALREADY PUBLISHED.

STRICT RULES:
- Use ONLY information present in the headlines and their summaries. Never add names, numbers, dates or places not in the input. If a headline is vague, DROP it.
- Several headlines about the same event → ONE point listing all their ids.
- Simple Hindi, one sentence, max 30 words, starting with the key subject (person/scheme/place); keep common Hindi spellings of proper nouns.
- "imp": 3 = very likely to be asked (named scheme/award/appointment/first/ranking/designation); 2 = useful fact. Never output imp 1 — drop it instead.
- "cat": exactly one of: ${CATS.join(', ')}.
- "tag": 1–3 word Hindi revision keyword (e.g. "तेनजिंग नोर्गे पुरस्कार").
- At most ${MAX_PER_DAY} points, most important first.
- "q": a short news-search query (3–6 words, Hindi) naming the key person/scheme/place of the point; "qen": the same in English.

Reply with JSON only: {"points":[{"ids":["..."],"fact":"...","cat":"...","imp":3,"tag":"...","q":"...","qen":"..."}]}`;

// Stage 2: the key pointers shown when a reader opens a point — so they need not visit the news site.
const DKEYS = ['कब', 'कहाँ', 'कौन', 'कितना', 'कारण', 'विवरण', 'श्रेणी', 'संस्था', 'पृष्ठभूमि'];
const ENRICH = `You write the exam pointers for Uttarakhand current-affairs points for UKPSC/UKSSSC aspirants.
On the website each POINT is a one-line heading; when a reader clicks it, your pointers appear below it. The reader should get every exam-relevant fact here and only visit the news site out of curiosity.
For each numbered POINT you get RELATED HEADLINES (several outlets' coverage of the same story; some lines include the publisher's summary after —). Give 3–5 short pointers (fewer only if the headlines truly have nothing more).

Allowed keys and where the information may come from:
- "कब" (date/occasion), "कहाँ" (place/district/venue), "कौन" (person, team, partner, ministry or body involved), "कितना" (number, amount, rank, score, area, capacity), "कारण" (why it was given / what was achieved / purpose), "विवरण" (any other concrete detail) — ONLY from the POINT text or its RELATED HEADLINES. Never infer or guess these.
- "श्रेणी" (award/medal category or type), "संस्था" (who gives/runs it) — from headlines, or from well-established general knowledge.
- "पृष्ठभूमि" (at most ONE static-GK fact about the SAME award/scheme/institution/person/place NAMED in the point — when instituted, highest honour of what, where located) — only a widely documented fact you are certain of. Never a different index, report or scheme that the point does not name.

RULES:
- Each pointer must add a NEW name, number, date, place or body that the POINT heading does not already contain. Never reword the heading; never state an obvious purpose.
- Prefer facts an examiner could turn into an MCQ: names, numbers, places, firsts, ranks, the giving body.
- If headlines conflict on a number, leave that number out.
- Simple Hindi, each "v" max 22 words, no trailing full stop.

Reply with JSON only: {"items":[{"n":1,"details":[{"k":"कहाँ","v":"..."}]}]}`;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const addDays = (d, n) => new Date(Date.parse(d) + n * 864e5).toISOString().slice(0, 10);
const unent = (t) => t.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
// Related coverage from the same public Google News RSS feed the collector uses.
async function related(q, day, lang) {
  if (!q) return [];
  const range = ` after:${addDays(day, -2)} before:${addDays(day, 3)}`;
  const url = lang === 'hi'
    ? `https://news.google.com/rss/search?q=${encodeURIComponent(q + range)}&hl=hi&gl=IN&ceid=IN:hi`
    : `https://news.google.com/rss/search?q=${encodeURIComponent(q + range)}&hl=en-IN&gl=IN&ceid=IN:en`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) return [];
    const xml = await res.text();
    return [...xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<\/item>/g)].map((m) => unent(m[1])).slice(0, 8);
  } catch { return []; }
}

// Drop sub-points that only restate the point: share of the detail's key words already in the fact.
const STOP = new Set('के में की को ने से और पर है हैं का लिए एक यह वह भी तो कर किया किए गया गई गए था थी थे इस इसे द्वारा तथा एवं सहित वाला वाली वाले उत्तराखंड उत्तराखण्ड प्रदेश राज्य देश सरकार बना बनी बनीं'.split(' '));
const norm = (t) => t.toLowerCase().replace(/[^\p{L}\p{M}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
const tokens = (t) => new Set(norm(t).split(' ').filter((w) => (w.length > 2 || /^\d+$/.test(w)) && !STOP.has(w)));
const restates = (v, fact) => { const t = tokens(v); if (!t.size) return true; const f = tokens(fact); let i = 0; for (const w of t) if (f.has(w)) i++; return i / t.size >= 0.5; };

async function enrich(list) { // list: [{fact, day, q, qen, titles:[]}] → mutates .details
  if (!list.length) return 0;
  for (const p of list) {
    const extra = [...await related(p.q, p.day, 'hi'), ...await related(p.qen, p.day, 'en')];
    const seen = new Set(p.titles.map((t) => t.toLowerCase()));
    p.ctx = [...p.titles, ...extra.filter((t) => !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()))].slice(0, 14);
  }
  const user = list.map((p, i) => `POINT ${i + 1}: ${p.fact}\nRELATED HEADLINES:\n${p.ctx.map((t) => '- ' + t).join('\n') || '(none)'}`).join('\n\n');
  const { out } = await ask(user, ENRICH);
  let n = 0;
  for (const it of out.items || []) {
    const p = list[(it.n || 0) - 1]; if (!p) continue;
    p.details = (it.details || []).filter((d) => DKEYS.includes(d.k) && d.v && String(d.v).length < 200 && !restates(String(d.v), p.fact))
      .slice(0, 5).map((d) => ({ k: d.k, v: String(d.v).trim().replace(/[।.]$/, '') }));
    n++;
  }
  return n;
}

// Stage 3: an independent model (Groq — a different model family from the Gemini writer) checks every
// pointer against the same headlines. Dates/numbers (कब, कितना) are dropped unless the headlines support them;
// any other pointer may also stand as certain, well-documented GK. 'off' (padding) and 'bad' are always dropped.
const NEWS_KEYS = new Set(['कब', 'कितना']); // dates and numbers must come from the headlines; other keys may carry certain GK
const VERIFY = `You are a strict fact-checker for an exam-preparation website (Uttarakhand, India).
For each numbered POINT you get the RELATED HEADLINES (the only news evidence) and its POINTERS (each with an id like 2.3 and a key).
Judge every pointer:
- "ok": the specific facts in it (names, numbers, dates, places, bodies) are stated in, or directly follow from, the headlines or the POINT text. Check the headlines FIRST — if a headline says it, the answer is "ok", never "gk".
- "gk": not in the headlines, but a correct, widely documented general-knowledge fact about the SAME thing the point names (e.g. when an award was instituted, which ministry gives it), and you are certain it is true.
- "off": true or not, it is about something the point does not name, or adds nothing exam-relevant (padding, vague purpose, restating the point).
- "bad": contradicts the headlines, looks invented/guessed, or you are not sure it is true (wrong person, year, number, body, title).
When unsure between "gk" and "bad", answer "bad". Be strict about names, posts and numbers.
Reply with JSON only: {"v":[{"id":"2.3","r":"ok|gk|off|bad","why":"max 12 words"}]}`;

async function verify(list, writer = '') { // list: [{fact, ctx|titles, details}] → filters .details; returns removed[]
  const items = list.filter((p) => p.details?.length);
  if (!items.length) return [];
  const user = items.map((p, i) => `POINT ${i + 1}: ${p.fact}\nRELATED HEADLINES:\n${(p.ctx || p.titles || []).map((t) => '- ' + t).join('\n') || '(none)'}\nPOINTERS:\n` +
    p.details.map((d, j) => `${i + 1}.${j + 1} [${d.k}] ${d.v}`).join('\n')).join('\n\n');
  let out;
  try {
    out = (GROQ && !writer.startsWith('groq/') ? await askGroq(user, VERIFY) : await ask(user, VERIFY)).out; // never let a model grade itself
  } catch (e) { console.log(`  verify skipped: ${e.message.slice(0, 160)}`); return []; }
  const verdict = new Map((out.v || []).map((x) => [String(x.id).trim(), x]));
  const removed = [];
  items.forEach((p, i) => {
    p.details = p.details.filter((d, j) => {
      const v = verdict.get(`${i + 1}.${j + 1}`); const r = v?.r || 'bad'; // no verdict = not verified
      const keep = r === 'ok' ? true : r === 'gk' ? !NEWS_KEYS.has(d.k) : false;
      if (!keep) removed.push({ fact: p.fact, k: d.k, v: d.v, r, why: v?.why || 'no verdict' });
      return keep;
    });
  });
  return removed;
}

async function askGroq(user, system) {
  let lastErr = 'no Groq model';
  for (const model of await groqModels()) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${GROQ}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, temperature: 0, max_tokens: 6000, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
        signal: AbortSignal.timeout(120000),
      }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));
      if (res.ok) {
        const txt = (await res.json()).choices?.[0]?.message?.content ?? '';
        const m = txt.match(/\{[\s\S]*\}/);
        try { return { model: 'groq/' + model, out: JSON.parse(m ? m[0] : txt) }; } catch { lastErr = `groq ${model}: bad content`; continue; }
      }
      lastErr = `groq ${model}: HTTP ${res.status} ${(await res.text()).slice(0, 160)}`;
      if (res.status === 429 || res.status >= 500) await new Promise((r) => setTimeout(r, 20000)); else break;
    }
  }
  throw new Error(lastErr);
}

const istDay = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 10);

async function ask(user, system = SYSTEM) {
  let lastErr;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(`${API}/openai/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ model, temperature: 0.1, max_tokens: 8000, response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
        signal: AbortSignal.timeout(120000),
      }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));
      if (res.ok) {
        const raw = await res.text();
        let j; try { j = JSON.parse(raw); } catch { lastErr = `${model}: non-JSON reply (${res.status}, ${res.headers.get?.('content-type')}): ${raw.slice(0, 200)}`; continue; }
        const txt = j.choices?.[0]?.message?.content ?? '';
        const m = txt.match(/\{[\s\S]*\}/);
        try { return { model, out: JSON.parse(m ? m[0] : txt) }; } catch { lastErr = `${model}: bad content: ${txt.slice(0, 200)}`; continue; }
      }
      lastErr = `${model}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`;
      if (res.status === 429 || res.status >= 500) await new Promise((r) => setTimeout(r, 20000 * (attempt + 1)));
      else break; // 4xx other than 429 → try next model
    }
  }
  // Backup AI: Groq free tier (OpenAI-compatible), used only when every Gemini model failed.
  if (GROQ) {
    for (const model of await groqModels()) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${GROQ}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, temperature: 0.1, max_tokens: 8000, response_format: { type: 'json_object' },
            messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
          signal: AbortSignal.timeout(120000),
        }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));
        if (res.ok) {
          const txt = (await res.json()).choices?.[0]?.message?.content ?? '';
          const m = txt.match(/\{[\s\S]*\}/);
          try { console.log(`  (Gemini failed: ${lastErr.slice(0, 120)} → used Groq ${model})`); return { model: 'groq/' + model, out: JSON.parse(m ? m[0] : txt) }; }
          catch { lastErr = `groq ${model}: bad content`; continue; }
        }
        lastErr = `groq ${model}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`;
        if (res.status === 429 || res.status >= 500) await new Promise((r) => setTimeout(r, 20000)); else break;
      }
    }
  }
  throw new Error(lastErr);
}

const GROQ = process.env.GROQ_API_KEY;
let _groq;
async function groqModels() { // prefer the big open models; picked at run time because Groq's list changes
  if (_groq) return _groq;
  const pref = [/gpt-oss-120b/, /llama-4-maverick/, /qwen.*(32|27|30)b/i, /llama-3\.3-70b/, /gpt-oss-20b/];
  try {
    const ids = ((await (await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${GROQ}` }, signal: AbortSignal.timeout(20000) })).json()).data || []).map((m) => m.id);
    _groq = pref.map((re) => ids.find((id) => re.test(id) && !/guard|whisper|tts/i.test(id))).filter(Boolean).slice(0, 2);
  } catch { _groq = []; }
  if (!_groq.length) _groq = ['openai/gpt-oss-120b'];
  return _groq;
}

if (!KEY) { console.log('digest: GEMINI_API_KEY not set — skipping AI step'); await writeFile('new-digest.json', JSON.stringify({ added: 0, calls: 0, errors: [] })); process.exit(0); }
MODELS = await pickModels();
console.log('models:', MODELS.join(', '));
if (!MODELS.length) throw new Error('No Gemini Flash model available');
const news = JSON.parse(await readFile(NEWS, 'utf8')).items;
const dg = JSON.parse(await readFile(DIGEST, 'utf8').catch(() => '{"reviewed":[],"points":[]}'));
const reviewed = new Set(dg.reviewed);
const byId = new Map(news.map((n) => [n.id, n]));

// Daily edition: review complete IST days only (normally yesterday), one AI call per day.
const today = istDay(new Date().toISOString());
const PREVIEW = !!process.env.PREVIEW; // dry run on today's headlines: print points, save nothing
const pending = PREVIEW
  ? news.filter((n) => istDay(n.published) === today)
  : news.filter((n) => !reviewed.has(n.id) && istDay(n.published) < today);
const previewOut = [];
let added = 0, calls = 0;
const addedIds = [];
const checked = []; // pointers removed by the Stage-3 checker
const errors = [];
if (process.env.CHECK) { // dry run of the real pipeline on the current points: writer (enrich) → checker (verify); saves nothing
  const pts = dg.points.slice(0, 16);
  for (let i = 0; i < pts.length; i += 8) {
    const list = pts.slice(i, i + 8).map((p) => ({ fact: p.fact, day: p.date, q: p.q || p.tag, qen: p.qen || '', titles: p.refs.map((r) => r.title) }));
    await enrich(list);
    const raw = list.map((p) => p.details.map((d) => `${d.k}: ${d.v}`));
    const rm = await verify(list); checked.push(...rm);
    list.forEach((p, k) => console.log(`• ${p.fact.slice(0, 80)}\n   headlines: ${p.ctx.length}\n` + raw[k].map((r) => `   ${p.details.some((d) => `${d.k}: ${d.v}` === r) ? '✓' : '✗'} ${r}`).join('\n')));
  }
  logChecked();
  process.exit(0);
}
if (process.env.BACKFILL) {
  const todo = dg.points.filter((p) => !p.details).slice(0, 24);
  let done = 0;
  for (let i = 0; i < todo.length; i += 8) {
    const chunk = todo.slice(i, i + 8);
    const list = chunk.map((p) => ({ fact: p.fact, day: p.date, q: p.q || p.tag, qen: p.qen || '', titles: p.refs.map((r) => r.title) }));
    try { await enrich(list); calls++; } catch (e) { errors.push(`backfill: ${e.message}`); break; }
    const rm = await verify(list); if (rm.length) { calls++; checked.push(...rm); }
    chunk.forEach((p, k) => { p.details = list[k].details || []; if (p.details.length) done++; console.log(`• ${p.fact}` + p.details.map((d) => `\n   - ${d.k}: ${d.v}`).join('')); });
  }
  dg.updated = new Date().toISOString();
  await writeFile(DIGEST, JSON.stringify(dg, null, 1) + '\n');
  await writeFile('new-digest.json', JSON.stringify({ added: 0, enriched: done, calls, errors, checked }));
  logChecked();
  console.log(`backfill: ${done}/${todo.length} points got details, ${calls} AI calls`);
  if (errors.length) console.error(errors.join('\n'));
  process.exit(0);
}
const days = [...new Set(pending.map((n) => istDay(n.published)))].sort();

for (const day of days) {
  const items = pending.filter((n) => istDay(n.published) === day).sort((a, b) => a.published.localeCompare(b.published));
  const recent = dg.points.filter((p) => Math.abs(Date.parse(p.date) - Date.parse(day)) <= 7 * 864e5).map((p) => `- ${p.fact}`);
  const user = `DATE: ${day}\n\nALREADY PUBLISHED:\n${recent.join('\n') || '(none)'}\n\nHEADLINES (${items.length}):\n` +
    items.map((n) => `[${n.id}] ${n.title} — ${n.source}` + (n.summary ? `\n    सार: ${n.summary}` : '')).join('\n');
  try {
    const { model, out } = await ask(user);
    calls++;
    let kept = 0;
    const fresh = [];
    for (const p of (out.points || []).sort((a, b) => (b.imp || 0) - (a.imp || 0))) {
      const ids = (p.ids || []).filter((id) => byId.has(id));
      if (!ids.length || !p.fact || !CATS.includes(p.cat) || !(p.imp >= 2) || kept >= MAX_PER_DAY) continue;
      const refs = ids.map((id) => byId.get(id));
      fresh.push({
        id: hash(p.fact), date: day, fact: p.fact.trim(), cat: p.cat, imp: Math.min(3, p.imp), tag: (p.tag || '').trim(), model,
        refs: refs.map((r) => ({ title: r.title, link: r.link, source: r.source })),
        added: new Date().toISOString(),
        _e: { day, q: p.q, qen: p.qen, titles: refs.map((r) => r.title + (r.summary ? ` — ${r.summary}` : '')) },
      });
      kept++;
    }
    if (fresh.length) {
      const list = fresh.map((f) => ({ fact: f.fact, ...f._e }));
      try { await enrich(list); calls++; } catch (e) { errors.push(`${day} enrich (kept points without details): ${e.message}`); }
      const rm = await verify(list, fresh[0]?.model || ''); calls++; checked.push(...rm);
      fresh.forEach((f, i) => { delete f._e; if (list[i].details?.length) f.details = list[i].details; });
    }
    for (const f of fresh) {
      if (PREVIEW) { previewOut.push(`${f.imp >= 3 ? '★' : '·'} [${f.cat}] ${f.fact}  #${f.tag}` + (f.details || []).map((d) => `\n     • ${d.k}: ${d.v}`).join('') + `\n     ← ${f.refs.map((r) => r.title.slice(0, 90)).join(' || ')}`); continue; }
      dg.points.push(f); added++; addedIds.push(f.id);
    }
    items.forEach((n) => reviewed.add(n.id));
    console.log(`  ${day}: ${items.length} headlines → ${kept} points`);
  } catch (e) {
    errors.push(`${day}: ${e.message}`);
    break; // try again next run
  }
}

if (PREVIEW) {
  console.log(`\n===== PREVIEW ${today}: ${pending.length} headlines → ${previewOut.length} points =====\n` + previewOut.join('\n') + '\n===== (nothing saved) =====');
  await writeFile('new-digest.json', JSON.stringify({ added: 0, calls, errors, checked }));
  logChecked();
  if (errors.length) console.error(errors.join('\n'));
  process.exit(0);
}

// forget reviewed ids that have left the candidate pool
const live = new Set(news.map((n) => n.id));
dg.reviewed = [...reviewed].filter((id) => live.has(id));
dg.points.sort((a, b) => b.date.localeCompare(a.date) || b.imp - a.imp);
dg.updated = new Date().toISOString();
await writeFile(DIGEST, JSON.stringify(dg, null, 1) + '\n');
await writeFile('new-digest.json', JSON.stringify({ added, ids: addedIds, days: days.length, calls, errors, checked }));
logChecked();
console.log(`digest: ${days.length} day(s) to review, ${calls} AI calls, +${added} points, ${errors.length} errors`);
if (errors.length) console.error(errors.join('\n'));

function logChecked() {
  if (!checked.length) return console.log('verify: all pointers passed');
  console.log(`verify: removed ${checked.length} pointer(s):\n` + checked.map((c) => `  ✗ [${c.r}] ${c.k}: ${c.v}  — ${c.why}  (${c.fact.slice(0, 50)}…)`).join('\n'));
}
