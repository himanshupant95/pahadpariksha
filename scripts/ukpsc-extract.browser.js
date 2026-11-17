// Runs INSIDE a browser tab on https://psc.uk.gov.in (needs an Indian connection — the site blocks foreign IPs).
// Reads the "candidate corner" sections and returns [{section, adv, title, date, end, href, apply}]
// for scripts/import-ukpsc.mjs. Each section is a table with headers like
//   S.No | Advertisement Name | Title | Publish Date | End Date | View | Link To Apply
// where Title / dates / View hold small inner tables whose rows line up one-to-one.
(async () => {
  const SECTIONS = ['results', 'answerkey', 'admitcards', 'recruitment'];
  const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const rowsOf = (cell) => { if (!cell) return []; const t = cell.querySelectorAll('table tr'); return t.length ? [...t] : [cell]; };
  const dmy = (el) => (txt(el).match(/\d{2}-\d{2}-\d{4}/) || [''])[0];
  const out = [];
  for (const section of SECTIONS) {
    const res = await fetch(`/candidate-corner/${section}`);
    if (!res.ok) { out.push({ section, error: `HTTP ${res.status}` }); continue; }
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    for (const table of doc.querySelectorAll('table')) {
      if (table.closest('td')) continue; // inner table
      const heads = [...table.querySelectorAll(':scope > thead th, :scope > tbody > tr:first-child > th, :scope > tr:first-child > th')].map(txt);
      const col = (re) => heads.findIndex((h) => re.test(h));
      const iAdv = col(/advertisement/i), iTitle = col(/^title|subject|description/i), iPub = col(/publish/i),
        iEnd = col(/end date|last date/i), iView = col(/view|download/i), iApply = col(/apply/i);
      if (iView < 0) continue;
      for (const tr of table.querySelectorAll(':scope > tbody > tr, :scope > tr')) {
        const c = [...tr.children].filter((x) => x.tagName === 'TD');
        if (c.length <= iView) continue;
        const titles = rowsOf(c[iTitle]), pubs = rowsOf(c[iPub]), ends = rowsOf(c[iEnd]), views = rowsOf(c[iView]);
        const apply = c[iApply]?.querySelector('a[href]')?.href || '';
        views.forEach((row, i) => {
          const a = row.querySelector('a[href]');
          if (!a) return;
          out.push({ section, adv: iAdv >= 0 ? txt(c[iAdv]) : '', title: txt(titles[i] || titles[0]),
            date: dmy(pubs[i] || pubs[0]), end: dmy(ends[i] || ends[0]), href: new URL(a.getAttribute('href'), location.href).href, apply });
        });
      }
    }
  }
  return out;
})();
