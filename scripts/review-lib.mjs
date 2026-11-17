// Shared parser for review commands (/remove P2, /remove P2.3, /edit P2.3 text, /edit P2 text, /add P2 कब: text, /ok)
// used by the GitHub-issue flow (review-apply.mjs) and the Telegram bot (telegram.mjs).
// map: {"P1": pointId, ...} for the batch being reviewed. Mutates dg. Returns { reply, changed, close }.
const DKEYS = ['कब', 'कहाँ', 'कौन', 'कितना', 'कारण', 'विवरण', 'श्रेणी', 'संस्था', 'पृष्ठभूमि'];

export function applyCommands(dg, map, text) {
  const byP = (p) => dg.points.find((x) => x.id === map[p.toUpperCase()]);
  const lines = (text || '').split('\n').map((l) => l.trim()).filter((l) => l.startsWith('/'));
  const done = [], bad = [];
  let close = false;
  // pointer removals are applied highest index first so "/remove P2.1" + "/remove P2.3" both hit what the owner saw
  const removals = [], adds = [];
  for (const l of lines) {
    let m;
    if (/^\/(ok|ठीक)\b/i.test(l)) { close = true; done.push('✅ समीक्षा पूरी — Issue बंद'); continue; }
    if ((m = l.match(/^\/(remove|हटाओ|हटाएँ)\s+(P\d+)(?:\.(\d+))?\s*$/i))) {
      const pt = byP(m[2]);
      if (!pt) { bad.push(`${l} — ${m[2]} नहीं मिला`); continue; }
      removals.push({ pt, p: m[2].toUpperCase(), j: m[3] ? Number(m[3]) : 0, l });
      continue;
    }
    if ((m = l.match(/^\/(edit|बदलो|बदलें)\s+(P\d+)(?:\.(\d+))?\s+(.+)$/i))) {
      const pt = byP(m[2]); const text = m[4].trim().replace(/[।.]$/, '');
      if (!pt) { bad.push(`${l} — ${m[2]} नहीं मिला`); continue; }
      if (text.length < 5 || text.length > 300) { bad.push(`${l} — पाठ 5–300 अक्षर का हो`); continue; }
      if (m[3]) {
        const d = (pt.details || [])[Number(m[3]) - 1];
        if (!d) { bad.push(`${l} — ${m[2]}.${m[3]} नहीं मिला`); continue; }
        d.v = text; done.push(`✏️ ${m[2]}.${m[3]} बदला: ${d.k}: ${text}`);
      } else { pt.fact = text + (/[।]$/.test(text) ? '' : '।'); done.push(`✏️ ${m[2]} का शीर्षक बदला`); }
      continue;
    }
    // /add P2 कब: 17 नवंबर   or   /add P2 any text  (key defaults to विवरण) — appended after removals
    if ((m = l.match(/^\/(add|जोड़ो|जोड़ें)\s+(P\d+)\s+(.+)$/i))) {
      const pt = byP(m[2]);
      if (!pt) { bad.push(`${l} — ${m[2]} नहीं मिला`); continue; }
      const kv = m[3].match(new RegExp(`^(${DKEYS.join('|')})\\s*[:：-]\\s*(.+)$`));
      const k = kv ? kv[1] : 'विवरण';
      const v = (kv ? kv[2] : m[3]).trim().replace(/[।.]$/, '');
      if (v.length < 3 || v.length > 300) { bad.push(`${l} — पाठ 3–300 अक्षर का हो`); continue; }
      adds.push({ pt, p: m[2].toUpperCase(), k, v });
      continue;
    }
    bad.push(`${l} — आदेश समझ नहीं आया`);
  }
  removals.sort((a, b) => b.j - a.j);
  for (const r of removals) {
    if (!r.j) {
      if (!dg.points.includes(r.pt)) continue;
      dg.points = dg.points.filter((x) => x !== r.pt); done.push(`🗑 ${r.p} पूरा हटाया: ${r.pt.fact.slice(0, 60)}…`);
    } else {
      const d = (r.pt.details || [])[r.j - 1];
      if (!d) { bad.push(`${r.l} — ${r.p}.${r.j} नहीं मिला`); continue; }
      r.pt.details.splice(r.j - 1, 1); done.push(`🗑 ${r.p}.${r.j} हटाया: ${d.k}: ${d.v.slice(0, 60)}`);
    }
  }

  for (const a of adds) {
    if (!dg.points.includes(a.pt)) { bad.push(`/add ${a.p} — यह बिंदु हटाया जा चुका है`); continue; }
    a.pt.details = a.pt.details || [];
    if (a.pt.details.length >= 8) { bad.push(`/add ${a.p} — इसमें पहले से 8 उप-बिंदु हैं`); continue; }
    a.pt.details.push({ k: a.k, v: a.v });
    done.push(`➕ ${a.p}.${a.pt.details.length} जोड़ा: ${a.k}: ${a.v.slice(0, 80)}`);
  }

  const changed = done.some((d) => !d.startsWith('✅'));
  if (changed) dg.updated = new Date().toISOString();
  let reply = done.length ? done.join('\n') : '';
  if (bad.length) reply += `\n\n⚠ नहीं हो सका:\n${bad.join('\n')}`;
  if (changed) reply += '\n\nसाइट कुछ मिनट में अपडेट हो जाएगी। (नोट: हटाने/बदलने के बाद उप-बिंदु क्रमांक बदल सकते हैं — अगला आदेश साइट/ऊपर की सूची देखकर दें।)';
  return { reply: reply.trim(), changed, close };
}
