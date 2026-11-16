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
You receive ALL news headlines about Uttarakhand from ONE day (Hindi or English), each with an id. Produce that day's exam bulletin.

THE ONLY TEST: "Could a UKPSC/UKSSSC general-knowledge question plausibly be asked on this?" If not clearly yes, DROP it. Most days only 2–8 items pass; an empty list is fine. Never pad.

KEEP only concrete, durable facts such as:
- a named state/central scheme, policy, act, rule, ordinance or cabinet decision concerning Uttarakhand (with its name);
- appointment of a person to a notable state or national post (Governor, Chief Secretary, DGP, Chief Justice, Vice-Chancellor, chairman of a commission/board, brand ambassador);
- a national/state award or honour to a person/institution of Uttarakhand (name the award);
- a national ranking/index/survey result, an all-India or state "first", or a record;
- a new institution, major project, MoU or investment with name, place and amount; GI tag; Ramsar site, tiger reserve, protected area, eco-sensitive zone;
- medals of Uttarakhand athletes at national/international events;
- official opening/closing dates of Char Dham or other major yatras and fairs (named fair + place);
- census/data releases; state foundation-level events with a concrete fact.
DROP: speeches, visions, roadmaps, "CM said/directed/reviewed", inspections, felicitation functions, small local events or awards by private bodies, routine fund sanctions, exam results/admit cards, party politics, elections, protests, crime, accidents, weather, opinion, promotions, and anything already in ALREADY PUBLISHED.

STRICT RULES:
- Use ONLY information present in the headlines. Never add names, numbers, dates or places not in the input. If a headline is vague, DROP it.
- Several headlines about the same event → ONE point listing all their ids.
- Simple Hindi, one sentence, max 30 words, starting with the key subject (person/scheme/place); keep common Hindi spellings of proper nouns.
- "imp": 3 = very likely to be asked (named scheme/award/appointment/first/ranking/designation); 2 = useful fact. Never output imp 1 — drop it instead.
- "cat": exactly one of: ${CATS.join(', ')}.
- "tag": 1–3 word Hindi revision keyword (e.g. "तेनजिंग नोर्गे पुरस्कार").
- At most ${MAX_PER_DAY} points, most important first.

Reply with JSON only: {"points":[{"ids":["..."],"fact":"...","cat":"...","imp":3,"tag":"..."}]}`;

const istDay = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 10);

async function ask(user) {
  let lastErr;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(`${API}/openai/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ model, temperature: 0.1, max_tokens: 6000, response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }] }),
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
      if (res.status === 429 || res.status >= 500) await new Promise((r) => setTimeout(r, 15000));
      else break; // 4xx other than 429 → try next model
    }
  }
  throw new Error(lastErr);
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
const pending = news.filter((n) => !reviewed.has(n.id) && istDay(n.published) < today);
const days = [...new Set(pending.map((n) => istDay(n.published)))].sort();
let added = 0, calls = 0;
const errors = [];

for (const day of days) {
  const items = pending.filter((n) => istDay(n.published) === day).sort((a, b) => a.published.localeCompare(b.published));
  const recent = dg.points.filter((p) => Math.abs(Date.parse(p.date) - Date.parse(day)) <= 7 * 864e5).map((p) => `- ${p.fact}`);
  const user = `DATE: ${day}\n\nALREADY PUBLISHED:\n${recent.join('\n') || '(none)'}\n\nHEADLINES (${items.length}):\n` +
    items.map((n) => `[${n.id}] ${n.title} — ${n.source}`).join('\n');
  try {
    const { model, out } = await ask(user);
    calls++;
    let kept = 0;
    for (const p of (out.points || []).sort((a, b) => (b.imp || 0) - (a.imp || 0))) {
      const ids = (p.ids || []).filter((id) => byId.has(id));
      if (!ids.length || !p.fact || !CATS.includes(p.cat) || !(p.imp >= 2) || kept >= MAX_PER_DAY) continue;
      const refs = ids.map((id) => byId.get(id));
      dg.points.push({
        id: hash(p.fact), date: day, fact: p.fact.trim(), cat: p.cat, imp: Math.min(3, p.imp), tag: (p.tag || '').trim(), model,
        refs: refs.map((r) => ({ title: r.title, link: r.link, source: r.source })),
        added: new Date().toISOString(),
      });
      added++; kept++;
    }
    items.forEach((n) => reviewed.add(n.id));
    console.log(`  ${day}: ${items.length} headlines → ${kept} points`);
  } catch (e) {
    errors.push(`${day}: ${e.message}`);
    break; // try again next run
  }
}

// forget reviewed ids that have left the candidate pool
const live = new Set(news.map((n) => n.id));
dg.reviewed = [...reviewed].filter((id) => live.has(id));
dg.points.sort((a, b) => b.date.localeCompare(a.date) || b.imp - a.imp);
dg.updated = new Date().toISOString();
await writeFile(DIGEST, JSON.stringify(dg, null, 1) + '\n');
await writeFile('new-digest.json', JSON.stringify({ added, calls, errors }));
console.log(`digest: ${days.length} day(s) to review, ${calls} AI calls, +${added} points, ${errors.length} errors`);
if (errors.length) console.error(errors.join('\n'));
