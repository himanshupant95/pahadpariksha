// Shared notice rules — used by fetch-notices.mjs (automatic, GitHub) and import-ukpsc.mjs (manual, UKPSC).
import { createHash } from 'node:crypto';

export const SOURCES = [
  {
    name: 'UKSSSC',
    url: 'https://sssc.uk.gov.in/',
    // news ticker + the homepage notice lists
    selector: '.newsticker li a, .gen-list li a',
    // drop footer "useful links" (English titles to other govt portals)
    keep: (title, href) => /[\u0900-\u097F]/.test(title) || /\.pdf($|\?)/i.test(href),
  },
  {
    name: 'UKPSC',
    url: 'https://psc.uk.gov.in/',
    selector: '.custom-marque-section .marque-size a',
    // psc.uk.gov.in refuses connections from outside India, so GitHub's runners can't read it.
    // It is imported by hand each morning instead: Claude reads it in Himanshu's browser and runs
    // scripts/import-ukpsc.mjs. The rules below are shared with that script.
    disabled: true,
    // each link points at its section page — use that for the category
    categoryFromUrl: (u) => /answerkey/.test(u) ? 'उत्तर कुंजी' : /admitcard/.test(u) ? 'प्रवेश पत्र' : /result/.test(u) ? 'परिणाम'
      : /recruitment/.test(u) ? 'भर्ती/विज्ञापन' : /calendar|exam-?schedule/.test(u) ? 'परीक्षा तिथि' : null,
    keep: (title, href) => !/tenders/.test(href),
  },
];

export const SKIP = /tender|quotation|निविदा|कोटेशन|photo gallery|फोटो/i;

export function categorize(t) {
  const s = t.toLowerCase();
  if (/admit|प्रवेश पत्र|प्रवेश-पत्र/.test(s)) return 'प्रवेश पत्र';
  if (/answer ?key|उत्तर ?कुंजी|objection|आपत्ति/.test(s)) return 'उत्तर कुंजी';
  if (/स्थगन|postpone|परीक्षा तिथि|exam date|calendar|कैलेंडर|परीक्षा कार्यक्रम/.test(s)) return 'परीक्षा तिथि';
  if (/टंकण|आशुलेखन|typing|steno(graphy)? test|कौशल/.test(s)) return 'कौशल परीक्षा';
  if (/अभिलेख|सन्निरीक्षा|document verification|डॉक्यूमेंट/.test(s)) return 'अभिलेख सत्यापन';
  if (/result|परिणाम|merit|मेरिट|श्रेष्ठता|संस्तुति|recommendation|selected|चयनित|निरस्तीकरण/.test(s)) return 'परिणाम';
  if (/interview|साक्षात्कार/.test(s)) return 'साक्षात्कार';
  if (/syllabus|पाठ्यक्रम/.test(s)) return 'पाठ्यक्रम';
  if (/ऑनलाइन आवेदन|online application|विज्ञापन|advertisement|सीधी भर्ती|fill application/.test(s)) return 'भर्ती/विज्ञापन';
  return 'सूचना';
}

export const clean = (t) => t.replace(/\s+/g, ' ').replace(/\bNew\b\s*$/i, '').replace(/हेतु क्लिक करें\s*$/, '').trim();
export const idOf = (src, title, url) => createHash('sha1').update(`${src}|${title}|${url}`).digest('hex').slice(0, 12);

export const toISO = (d) => { const m = d.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null; };
