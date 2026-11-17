// After the nightly edition: open a GitHub Issue listing the new points and their pointers, so the
// owner can check them (GitHub emails the assignee). Fixes are made by replying with commands —
// see scripts/review-apply.mjs. Needs GH_TOKEN, GITHUB_REPOSITORY, OWNER.
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const SITE = 'https://pahadpariksha.in';
const run = JSON.parse(await readFile('new-digest.json', 'utf8').catch(() => '{}'));
const dg = JSON.parse(await readFile('src/data/digest.json', 'utf8'));
const ids = run.ids || [];
const errors = run.errors || [];
if (!ids.length && !errors.length) { console.log('review: nothing new, no issue'); process.exit(0); }

const ist = new Date().toLocaleDateString('hi-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' });
const pts = ids.map((id) => dg.points.find((p) => p.id === id)).filter(Boolean);
const map = Object.fromEntries(pts.map((p, i) => [`P${i + 1}`, p.id]));
const risky = pts.reduce((n, p) => n + (p.details || []).filter((d) => d.k === 'पृष्ठभूमि').length, 0);

let body = `**${pts.length} नए बिंदु** आज के संस्करण में जुड़े और साइट पर लाइव हैं — [करेंट अफेयर्स पेज](${SITE}/current-affairs/)।\n`;
if (risky) body += `\n⚠ = **पृष्ठभूमि** वाले उप-बिंदु AI के सामान्य ज्ञान से हैं, ख़बर से नहीं — इन्हें ज़रूर जाँचें (${risky})।\n`;
if (errors.length) body += `\n> 🔴 **रन में त्रुटि:** ${errors.map((e) => e.slice(0, 200)).join(' | ')}\n`;
pts.forEach((p, i) => {
  body += `\n---\n### P${i + 1} ${p.imp >= 3 ? '★ ' : ''}${p.fact}\n<sub>${p.date} · ${p.cat} · #${p.tag} · ${p.model || ''}</sub>\n\n`;
  (p.details || []).forEach((d, j) => { body += `${d.k === 'पृष्ठभूमि' ? '⚠ ' : ''}**P${i + 1}.${j + 1}** ${d.k}: ${d.v}\n`; });
  if (!(p.details || []).length) body += `_(कोई उप-बिंदु नहीं)_\n`;
  const srcs = p.refs.filter((r, k, a) => a.findIndex((x) => x.source === r.source) === k).slice(0, 4);
  body += `\nस्रोत: ${srcs.map((r) => `[${r.source || 'समाचार'}](${r.link})`).join(' · ')}\n`;
});
body += `\n---\n#### सुधारने के लिए इस Issue पर टिप्पणी (comment) करें — एक पंक्ति में एक आदेश:\n` +
  '```\n/remove P2        → पूरा बिंदु P2 हटाएँ\n/remove P2.3      → P2 का तीसरा उप-बिंदु हटाएँ\n/edit P2 नया शीर्षक…     → P2 का शीर्षक बदलें\n/edit P2.3 नया पाठ…      → उप-बिंदु का पाठ बदलें (कुंजी वही रहेगी)\n/ok               → सब ठीक है, Issue बंद करें\n```\n' +
  `कुछ ही मिनट में साइट अपडेट हो जाएगी और बॉट यहाँ पुष्टि लिखेगा। कोई टिप्पणी न करें तो सब वैसा ही लाइव रहेगा।\n\n<!-- ca-map ${JSON.stringify(map)} -->\n`;

const title = errors.length && !pts.length ? `⚠ करेंट अफेयर्स रन विफल — ${ist}` : `करेंट अफेयर्स समीक्षा — ${ist} (${pts.length} बिंदु${risky ? `, ⚠${risky}` : ''})`;
await writeFile('review-body.md', body);
// REST API (works in Actions and where GraphQL is unavailable)
const repo = process.env.GITHUB_REPOSITORY || process.env.GH_REPO;
const api = (path, payload) => execFileSync('gh', ['api', '-X', 'POST', path, '--input', '-'], { input: JSON.stringify(payload), stdio: ['pipe', 'pipe', 'pipe'] }).toString();
try { api(`repos/${repo}/labels`, { name: 'ca-review', color: '1f7a4d', description: 'Nightly current-affairs review' }); } catch {} // already exists
const res = JSON.parse(api(`repos/${repo}/issues`, { title, body, labels: ['ca-review'], assignees: [process.env.OWNER] }));
console.log('review issue:', res.html_url);
