// Shared parser for review commands (/remove P2, /remove P2.3, /remove P2.Q, /edit P2.3 text, /edit P2 text,
// /edit P2.S text (क्या हुआ), /edit P2.Q question, /edit P2.A answer, /add P2 label: text, /add P2 स्थायी label: text, /ok)
// used by the GitHub-issue flow (review-apply.mjs) and the Telegram bot (telegram.mjs).
// map: {"P1": pointId, ...} for the batch being reviewed. Mutates dg. Returns { reply, changed, close }.

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
    if ((m = l.match(/^\/(remove|हटाओ|हटाएँ)\s+(P\d+)\.Q\s*$/i))) {
      const pt = byP(m[2]);
      if (!pt || !pt.quiz) { bad.push(`${l} — ${m[2]}.Q नहीं मिला`); continue; }
      delete pt.quiz; done.push(`🗑 ${m[2].toUpperCase()} का अभ्यास प्रश्न हटाया`); continue;
    }
    if ((m = l.match(/^\/(remove|हटाओ|हटाएँ)\s+(P\d+)(?:\.(\d+))?\s*$/i))) {
      const pt = byP(m[2]);
      if (!pt) { bad.push(`${l} — ${m[2]} नहीं मिला`); continue; }
      removals.push({ pt, p: m[2].toUpperCase(), j: m[3] ? Number(m[3]) : 0, l });
      continue;
    }
    if ((m = l.match(/^\/(edit|बदलो|बदलें)\s+(P\d+)\.([SQA])\s+(.+)$/i))) {
      const pt = byP(m[2]); const t = m[4].trim(); const w = m[3].toUpperCase(); const P = m[2].toUpperCase();
      if (!pt) { bad.push(`${l} — ${m[2]} नहीं मिला`); continue; }
      if (t.length < 2 || t.length > 400) { bad.push(`${l} — पाठ 2–400 अक्षर का हो`); continue; }
      if (w === 'S') { pt.sum = t; done.push(`✏️ ${P} का "क्या हुआ" बदला`); }
      else if (!pt.quiz) { bad.push(`${l} — ${P} में अभ्यास प्रश्न नहीं है`); continue; }
      else if (w === 'Q') { pt.quiz.q = t; done.push(`✏️ ${P} का प्रश्न बदला`); }
      else { pt.quiz.a = t; done.push(`✏️ ${P} का उत्तर बदला: ${t}`); }
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
      // "स्थायी"/📚/GK prefix → linked static GK line; any label (≤30 chars) before the first colon
      let rest = m[3].trim(); let g = false;
      const gm = rest.match(/^(?:📚|स्थायी|GK)\s*[:：-]?\s*/i);
      if (gm) { g = true; rest = rest.slice(gm[0].length); }
      const kv = rest.match(/^([^:：]{2,30})\s*[:：]\s*(.+)$/);
      const k = kv ? kv[1].trim() : (g ? 'स्थायी ज्ञान' : 'विवरण');
      const v = (kv ? kv[2] : rest).trim().replace(/[।.]$/, '');
      if (v.length < 3 || v.length > 300) { bad.push(`${l} — पाठ 3–300 अक्षर का हो`); continue; }
      adds.push({ pt, p: m[2].toUpperCase(), k, v, g });
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
    if (a.pt.details.length >= 10) { bad.push(`/add ${a.p} — इसमें पहले से 10 उप-बिंदु हैं`); continue; }
    // facts stay ahead of the 📚 static lines, so numbering matches what the page shows
    const d = a.g ? { k: a.k, v: a.v, t: 'g' } : { k: a.k, v: a.v };
    let at = a.g ? a.pt.details.length : a.pt.details.findIndex((x) => x.t === 'g');
    if (at < 0) at = a.pt.details.length;
    a.pt.details.splice(at, 0, d);
    done.push(`➕ ${a.p}.${at + 1} जोड़ा: ${a.g ? '📚 ' : ''}${a.k}: ${a.v.slice(0, 80)}`);
  }

  const changed = done.some((d) => !d.startsWith('✅'));
  if (changed) dg.updated = new Date().toISOString();
  let reply = done.length ? done.join('\n') : '';
  if (bad.length) reply += `\n\n⚠ नहीं हो सका:\n${bad.join('\n')}`;
  if (changed) reply += '\n\nसाइट कुछ मिनट में अपडेट हो जाएगी। (नोट: हटाने/बदलने के बाद उप-बिंदु क्रमांक बदल सकते हैं — अगला आदेश साइट/ऊपर की सूची देखकर दें।)';
  return { reply: reply.trim(), changed, close };
}
