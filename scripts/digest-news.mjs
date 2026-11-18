// AI editor for the current-affairs feed.
// Reads candidate headlines (src/data/news.json), sends the ones not yet reviewed to an LLM
// (Google Gemini API, free tier, via its OpenAI-compatible endpoint), and keeps only exam-worthy
// facts, rewritten as one-line Hindi exam points, in src/data/digest.json.
// Needs env GEMINI_API_KEY (GitHub secret). Run: node scripts/digest-news.mjs
import { fixPoint } from './hindi-fix.mjs';
import { articleText, readable } from './article-text.mjs';
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
DROP: old news re-mentioned — an achievement, award or decision from earlier weeks/months that a headline only recalls (at a function, in a speech, in a felicitation) unless there is a NEW development that day; speeches, visions, roadmaps, "CM said/directed/reviewed", inspections, felicitation functions, small local events or awards by private bodies, routine fund sanctions, exam results/admit cards, party politics, elections, protests, crime, accidents, weather, opinion, promotions, and anything already in ALREADY PUBLISHED.

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

// Stage 2: what a reader sees after clicking a point — written so the aspirant needs no other source.
// Own format (not copied from any coaching material): क्या हुआ → तथ्य (each with its own label) → स्थायी ज्ञान → अभ्यास प्रश्न.
// Depth follows the evidence: with the full article and imp 3 → 5–8 facts; otherwise 3–4.
const DKEYS = ['कब', 'कहाँ', 'कौन', 'कितना', 'कारण', 'विवरण', 'श्रेणी', 'संस्था', 'पृष्ठभूमि']; // legacy keys (old points, /add)
const ENRICH = `You prepare Uttarakhand current-affairs notes for UKPSC/UKSSSC aspirants (Hindi medium, many from rural areas).
On the website each POINT is a one-line heading; a click opens your note. The note must be complete, ABSOLUTELY ACCURATE and easy to understand.

For each numbered POINT you get: DATE, DEPTH, the ARTICLE (full news report — may be missing) and RELATED HEADLINES.
Write:
1. "sum" — क्या हुआ: 1–2 short sentences in simple Hindi (max 40 words) telling what happened, who did it and why it matters. Do not repeat the heading word-for-word.
2. "facts" — exam facts, each {"l": label, "v": text}.
   - "l": a 1–4 word Hindi label naming the aspect, chosen to fit THIS news (e.g. "योजना का उद्देश्य", "लाभार्थी", "कुल लागत", "स्थान", "क्रियान्वयन एजेंसी", "समय-सीमा", "पुरस्कार देने वाली संस्था"). Do not reuse one label twice.
   - "v": max 25 words, one clear fact. Prefer what an examiner turns into an MCQ: names, posts, numbers, dates, places, firsts, ranks, bodies.
   - DEPTH "full": 5–8 facts. DEPTH "short": 3–4 facts. Fewer if the sources truly hold less — never pad.
   - ONLY from the ARTICLE, the POINT or the RELATED HEADLINES. Never guess, round or "complete" a number, name or date. If sources conflict, leave it out.
   - Each fact must add something the heading and "sum" do not already say.
3. "static" — 0–2 static-GK facts about the SAME place/institution/scheme/award/person the point names (where it is, which district or river, when it was set up, what the body does). Only widely documented facts you are certain of; otherwise give none. Same {"l","v"} shape.
4. "q" — one practice question an exam could ask, answerable from your "facts", with a short answer: {"q":"...","a":"..."}. Skip if no good question.
5. "stale": true if the ARTICLE shows the main event happened well before DATE and is only being recalled (no new development that day); else false.

Simple Hindi; keep common Hindi spellings of names; write उत्तराखंड; no English words inside Hindi words; no trailing full stop in "v".
Reply with JSON only: {"items":[{"n":1,"sum":"...","facts":[{"l":"...","v":"..."}],"static":[{"l":"...","v":"..."}],"q":{"q":"...","a":"..."},"stale":false}]}`;

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

const clip = (t, n) => (t.length > n ? t.slice(0, n) + '…' : t);
async function enrich(list) { // list: [{fact, day, q, qen, imp, titles:[], urls:[]}] → sets .sum .details .quiz .stale .art
  if (!list.length) return 0;
  for (const p of list) {
    const extra = [...await related(p.q, p.day, 'hi'), ...await related(p.qen, p.day, 'en')];
    const seen = new Set(p.titles.map((t) => t.toLowerCase()));
    p.ctx = [...p.titles, ...extra.filter((t) => !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()))].slice(0, 14);
    // full report: the longest readable article among the point's sources
    const texts = [];
    for (const u of (p.urls || []).filter(readable).slice(0, 3)) texts.push(await articleText(u, 3500));
    p.art = texts.sort((a, b) => b.length - a.length)[0] || '';
  }
  let n = 0;
  for (let i = 0; i < list.length; i += 3) { // 3 points per call keeps the reply well inside the token limit
    const part = list.slice(i, i + 3);
    const user = part.map((p, k) => `POINT ${k + 1}: ${p.fact}\nDATE: ${p.day}\nDEPTH: ${p.art.length > 600 && (p.imp || 2) >= 3 ? 'full' : 'short'}\n` +
      `ARTICLE:\n${p.art || '(not available)'}\nRELATED HEADLINES:\n${p.ctx.map((t) => '- ' + t).join('\n') || '(none)'}`).join('\n\n=====\n\n');
    const { out } = await ask(user, ENRICH);
    for (const it of out.items || []) {
      const p = part[(it.n || 0) - 1]; if (!p) continue;
      const tidy = (x) => String(x || '').trim().replace(/[।.]$/, '');
      const lab = (x) => tidy(x).slice(0, 30);
      const used = new Set();
      const facts = (it.facts || []).filter((d) => d && d.l && d.v && String(d.v).length < 220 && !restates(String(d.v), p.fact))
        .filter((d) => !used.has(lab(d.l)) && used.add(lab(d.l))).slice(0, 8).map((d) => ({ k: lab(d.l), v: tidy(d.v) }));
      const stat = (it.static || []).filter((d) => d && d.l && d.v && String(d.v).length < 220).slice(0, 2).map((d) => ({ k: lab(d.l), v: tidy(d.v), t: 'g' }));
      p.sum = tidy(it.sum) ? tidy(it.sum) + '।' : '';
      p.details = [...facts, ...stat];
      p.quiz = it.q && it.q.q && it.q.a ? { q: String(it.q.q).trim(), a: tidy(it.q.a) } : null;
      p.stale = it.stale === true;
      n++;
    }
  }
  return n;
}

// Stage 3: an independent model (Groq — a different model family from the Gemini writer) checks every line
// of every note against the article and headlines, one point per call. Facts, the summary and the practice
// answer must be supported by the sources ("ok"); static-GK lines may also pass as certain GK ("gk").
// If Groq is unavailable a different Gemini model checks instead — never the model that wrote the note.
const VERIFY = `You are a strict fact-checker for an exam-preparation website (Uttarakhand, India). Accuracy matters more than completeness.
You get one POINT with its EVIDENCE (the full article if available, and related headlines) and the LINES written about it, each with an id:
S = summary, F1..Fn = facts, G1..Gn = static general-knowledge facts, Q = practice question with its answer.
Judge every line:
- "ok": everything specific in it (names, posts, numbers, dates, places, bodies) is stated in, or directly follows from, the EVIDENCE or the POINT. Check the evidence FIRST.
- "gk": not in the evidence, but a correct, widely documented general-knowledge fact about the SAME thing the point names, and you are certain.
- "off": true or not, it is about something the point does not name, or is padding / vague / a restatement.
- "bad": contradicts the evidence, adds a detail the evidence does not give (a number, date, name or place), or you are not sure.
When unsure, answer "bad". Be strict with numbers, names and posts.
Reply with JSON only: {"v":[{"id":"F2","r":"ok|gk|off|bad","why":"max 12 words"}]}`;

const NEED_OK = (id) => id === 'S' || id === 'Q' || id.startsWith('F');
async function verify(list, writer = '') { // filters .sum/.details/.quiz in place; returns removed[]
  const removed = [];
  for (const p of list) {
    const facts = (p.details || []).filter((d) => d.t !== 'g'), stat = (p.details || []).filter((d) => d.t === 'g');
    const lines = [];
    if (p.sum) lines.push(['S', p.sum]);
    facts.forEach((d, j) => lines.push([`F${j + 1}`, `${d.k}: ${d.v}`]));
    stat.forEach((d, j) => lines.push([`G${j + 1}`, `${d.k}: ${d.v}`]));
    if (p.quiz) lines.push(['Q', `प्रश्न: ${p.quiz.q} — उत्तर: ${p.quiz.a}`]);
    if (!lines.length) continue;
    const user = `POINT: ${p.fact}\nEVIDENCE — ARTICLE:\n${p.art || '(not available)'}\nEVIDENCE — HEADLINES:\n${(p.ctx || p.titles || []).map((t) => '- ' + t).join('\n') || '(none)'}\n\nLINES:\n` +
      lines.map(([id, t]) => `${id} ${t}`).join('\n');
    let out = null;
    if (GROQ && !writer.startsWith('groq/')) { try { out = (await askGroq(user, VERIFY)).out; } catch (e) { console.log(`  verify (groq) failed: ${e.message.slice(0, 120)}`); } }
    if (!out) { // fallback: another model than the writer
      const other = MODELS.filter((m) => m !== writer);
      if (other.length) { const keep = MODELS; MODELS = other; try { out = (await ask(user, VERIFY)).out; } catch (e) { console.log(`  verify (gemini) failed: ${e.message.slice(0, 120)}`); } MODELS = keep; }
    }
    if (!out) { p.unverified = true; continue; } // shown as ⚠ in the owner's review
    const verdict = new Map((out.v || []).map((x) => [String(x.id).trim().toUpperCase(), x]));
    const pass = (id, label, text) => {
      const v = verdict.get(id); const r = v?.r || 'bad';
      const ok = r === 'ok' || (r === 'gk' && !NEED_OK(id));
      if (!ok) removed.push({ fact: p.fact, k: label, v: text, r, why: v?.why || 'no verdict' });
      return ok;
    };
    if (p.sum && !pass('S', 'सार', p.sum)) p.sum = '';
    const fKeep = facts.filter((d, j) => pass(`F${j + 1}`, d.k, d.v));
    const gKeep = stat.filter((d, j) => pass(`G${j + 1}`, d.k, d.v));
    p.details = [...fKeep, ...gKeep];
    if (p.quiz && !pass('Q', 'प्रश्न', `${p.quiz.q} — ${p.quiz.a}`)) p.quiz = null;
  }
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
  const pts = dg.points.slice(0, Number(process.env.CHECK_N || 6));
  for (let i = 0; i < pts.length; i += 8) {
    const list = pts.slice(i, i + 8).map((p) => ({ fact: p.fact, day: p.date, imp: p.imp, q: p.q || p.tag, qen: p.qen || '', urls: p.refs.map((r) => r.read || r.link), titles: p.refs.map((r) => r.title) }));
    const { model } = await ask('Reply with JSON only: {"ok":true}', 'Reply with JSON only.'); // writer = first available model
    await enrich(list);
    const before = list.map((p) => ({ sum: p.sum, d: p.details.map((d) => `${d.t === 'g' ? '📚' : '•'} ${d.k}: ${d.v}`), q: p.quiz }));
    const rm = await verify(list, model); checked.push(...rm);
    list.forEach((p, k) => console.log(`\n■ ${p.fact.slice(0, 90)}  [article ${p.art.length} chars${p.stale ? ', STALE' : ''}${p.unverified ? ', UNVERIFIED' : ''}]\n` +
      `   क्या हुआ: ${before[k].sum || '-'} ${p.sum ? '✓' : '✗'}\n` +
      before[k].d.map((r) => `   ${p.details.some((d) => `${d.t === 'g' ? '📚' : '•'} ${d.k}: ${d.v}` === r) ? '✓' : '✗'} ${r}`).join('\n') +
      (before[k].q ? `\n   ${p.quiz ? '✓' : '✗'} प्रश्न: ${before[k].q.q} → ${before[k].q.a}` : '')));
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
        refs: refs.map((r) => ({ title: r.title, link: r.link, source: r.source, ...(r.read ? { read: r.read } : {}) })),
        added: new Date().toISOString(),
        _e: { day, q: p.q, qen: p.qen, imp: p.imp, urls: refs.map((r) => r.read || r.link), titles: refs.map((r) => r.title + (r.summary ? ` — ${r.summary}` : '')) },
      });
      kept++;
    }
    if (fresh.length) {
      const list = fresh.map((f) => ({ fact: f.fact, ...f._e }));
      try { await enrich(list); calls++; } catch (e) { errors.push(`${day} enrich (kept points without details): ${e.message}`); }
      const rm = await verify(list, fresh[0]?.model || ''); calls++; checked.push(...rm);
      for (let i = fresh.length - 1; i >= 0; i--) if (list[i].stale) { // an old event only recalled — not current affairs
        checked.push({ fact: fresh[i].fact, k: 'पूरा बिंदु', v: 'पुरानी घटना का दोबारा ज़िक्र', r: 'off', why: 'stale' });
        errors.push(`पुरानी खबर हटाई: ${fresh[i].fact.slice(0, 70)}`);
        fresh.splice(i, 1); list.splice(i, 1);
      }
      fresh.forEach((f, i) => {
        delete f._e; const L = list[i];
        if (L.details?.length) f.details = L.details;
        if (L.sum) f.sum = L.sum;
        if (L.quiz) f.quiz = L.quiz;
        f.depth = L.art?.length > 600 ? 'article' : 'headlines';
        if (L.unverified) { f.unverified = true; errors.push(`जाँच नहीं हो सकी (AI checker unavailable): ${f.fact.slice(0, 60)}`); }
        // repair half-Hindi/half-English words ("उत्तarakhand") and unify spellings; flag leftovers for review
        const left = fixPoint(f);
        if (left.length) errors.push(`जाँचें — मिश्रित-लिपि शब्द: ${[...new Set(left)].join(', ')} ("${f.fact.slice(0, 50)}…")`);
      });
    }
    for (const f of fresh) {
      if (PREVIEW) {
        previewOut.push(`${f.imp >= 3 ? '★' : '·'} [${f.cat}] ${f.fact}  #${f.tag}  (${f.depth}${f.unverified ? ', UNVERIFIED' : ''})` +
          (f.sum ? `\n     क्या हुआ: ${f.sum}` : '') +
          (f.details || []).map((d) => `\n     ${d.t === 'g' ? '📚' : '•'} ${d.k}: ${d.v}`).join('') +
          (f.quiz ? `\n     ❓ ${f.quiz.q} → ${f.quiz.a}` : '') +
          `\n     ← ${f.refs.map((r) => `${r.source}${r.read || !/news\.google/.test(r.link) ? ' (article)' : ''}: ${r.title.slice(0, 70)}`).join(' || ')}`);
        continue;
      }
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
