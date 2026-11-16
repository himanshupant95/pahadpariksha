// AI editor for the current-affairs feed.
// Reads candidate headlines (src/data/news.json), sends the ones not yet reviewed to an LLM
// (GitHub Models, free with the Actions GITHUB_TOKEN), and keeps only exam-worthy facts,
// rewritten as one-line Hindi exam points, in src/data/digest.json.
// Needs env GITHUB_TOKEN (or GH_TOKEN). Run: node scripts/digest-news.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const NEWS = 'src/data/news.json';
const DIGEST = 'src/data/digest.json';
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const MODELS = ['openai/gpt-4.1', 'openai/gpt-4.1-mini'];
const BATCH = 22;            // headlines per request (free tier: ~8k input tokens)
const CATS = ['योजना/नीति', 'नियुक्ति', 'पुरस्कार/सम्मान', 'खेल', 'रिपोर्ट/रैंकिंग', 'पर्यावरण', 'परियोजना/अवसंरचना', 'अर्थव्यवस्था', 'संस्कृति/धर्म', 'विज्ञान/शिक्षा', 'परीक्षा/भर्ती', 'प्रशासन', 'अन्य'];

const SYSTEM = `You are the editor of a Hindi current-affairs bulletin for Uttarakhand state government exams (UKSSSC, UKPSC: Patwari, VDO, Lower PCS, etc.).
You receive news HEADLINES about Uttarakhand (Hindi or English), each with an id. Your job is to keep ONLY headlines that contain a concrete, durable fact a state exam could ask, and rewrite each as a crisp Hindi exam point.

KEEP (examples): a named government scheme/policy/act/cabinet decision; an appointment to a notable post; an award or honour to a person/institution of Uttarakhand (name the award); a national/state ranking, "first"/record achievement; a new institution, project, MoU, budget figure with place/amount; GI tag, Ramsar site, tiger reserve, protected area; sports medals by state athletes; official start/close of a major yatra/fair with date; census/survey/index results; recruitment exam results/notifications of state commissions.
DROP: political speeches, "vision/roadmap" talk without a concrete decision, party or election news, protests, generic "CM inaugurated/attended" items with no named outcome, small local functions, felicitation of many unnamed people, college/coaching promotions, opinion/analysis, crime, accidents, weather, anything you are unsure about.

STRICT RULES:
- Use ONLY information present in the headline(s). Never add names, numbers, dates or places that are not in the input. If the headline is vague, DROP it.
- If several headlines (Hindi/English) describe the same event, output ONE point and list all their ids.
- Do not repeat any point already listed under ALREADY PUBLISHED.
- Write the point in simple Hindi, one sentence, max 30 words, starting with the key subject (person/scheme/place). Keep proper nouns as commonly written in Hindi.
- "imp": 3 = very likely in exam (named scheme/award/appointment/first/ranking/designation), 2 = useful, 1 = minor. Prefer dropping over imp 1.
- "cat": exactly one of: ${CATS.join(', ')}.
- "tag": 1–3 word Hindi keyword for revision (e.g. "तेनजिंग नोर्गे पुरस्कार").

Reply with JSON only: {"points":[{"ids":["..."],"fact":"...","cat":"...","imp":3,"tag":"..."}]}  — an empty list is fine.`;

const istDay = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 10);

async function ask(user) {
  let lastErr;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch('https://models.github.ai/inference/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ model, temperature: 0.1, max_tokens: 3000, response_format: { type: 'json_object' },
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

if (!TOKEN) { console.error('No GITHUB_TOKEN'); process.exit(1); }
const news = JSON.parse(await readFile(NEWS, 'utf8')).items;
const dg = JSON.parse(await readFile(DIGEST, 'utf8').catch(() => '{"reviewed":[],"points":[]}'));
const reviewed = new Set(dg.reviewed);
const byId = new Map(news.map((n) => [n.id, n]));

const todo = news.filter((n) => !reviewed.has(n.id)).sort((a, b) => a.published.localeCompare(b.published));
const LIMIT = Number(process.env.DIGEST_LIMIT || 200);
let added = 0, calls = 0;
const errors = [];

for (let i = 0; i < Math.min(todo.length, LIMIT); i += BATCH) {
  const batch = todo.slice(i, i + BATCH);
  const days = new Set(batch.map((n) => istDay(n.published)));
  const recent = dg.points.filter((p) => days.has(p.date) || Date.parse(p.date) > Date.now() - 5 * 864e5).map((p) => `- ${p.fact}`);
  const user = `ALREADY PUBLISHED:\n${recent.join('\n') || '(none)'}\n\nHEADLINES:\n` +
    batch.map((n) => `[${n.id}] (${istDay(n.published)}) ${n.title} — ${n.source}`).join('\n');
  try {
    const { model, out } = await ask(user);
    calls++;
    for (const p of out.points || []) {
      const ids = (p.ids || []).filter((id) => byId.has(id));
      if (!ids.length || !p.fact || !CATS.includes(p.cat) || !(p.imp >= 2)) continue;
      const refs = ids.map((id) => byId.get(id));
      const date = istDay(refs.map((r) => r.published).sort()[0]);
      dg.points.push({
        id: hash(p.fact), date, fact: p.fact.trim(), cat: p.cat, imp: Math.min(3, p.imp), tag: (p.tag || '').trim(), model,
        refs: refs.map((r) => ({ title: r.title, link: r.link, source: r.source })),
        added: new Date().toISOString(),
      });
      added++;
    }
    batch.forEach((n) => reviewed.add(n.id));
  } catch (e) {
    errors.push(e.message);
    break; // keep the rest for next run (likely rate limit)
  }
}

// forget reviewed ids that have left the candidate pool
const live = new Set(news.map((n) => n.id));
dg.reviewed = [...reviewed].filter((id) => live.has(id));
dg.points.sort((a, b) => b.date.localeCompare(a.date) || b.imp - a.imp);
dg.updated = new Date().toISOString();
await writeFile(DIGEST, JSON.stringify(dg, null, 1) + '\n');
await writeFile('new-digest.json', JSON.stringify({ added, calls, errors }));
console.log(`digest: ${todo.length} to review, ${calls} AI calls, +${added} points, ${errors.length} errors`);
if (errors.length) console.error(errors.join('\n'));
