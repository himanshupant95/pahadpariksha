// Cleans AI-written Hindi text before it is saved.
// The writer model sometimes switches script inside a word ("उत्तarakhand") or drops an English
// place name into a Hindi sentence. fixHindi() repairs the common Uttarakhand names and uses the
// site's spelling (उत्तराखंड); mixedWords() reports anything still half-Hindi/half-English so the
// owner sees it in the Telegram review.

const NAMES = {
  uttarakhand: 'उत्तराखंड', dehradun: 'देहरादून', haridwar: 'हरिद्वार', nainital: 'नैनीताल', almora: 'अल्मोड़ा',
  rishikesh: 'ऋषिकेश', kumaon: 'कुमाऊँ', garhwal: 'गढ़वाल', pithoragarh: 'पिथौरागढ़', chamoli: 'चमोली',
  uttarkashi: 'उत्तरकाशी', rudraprayag: 'रुद्रप्रयाग', bageshwar: 'बागेश्वर', champawat: 'चंपावत', tehri: 'टिहरी',
  pauri: 'पौड़ी', haldwani: 'हल्द्वानी', rudrapur: 'रुद्रपुर', kedarnath: 'केदारनाथ', badrinath: 'बद्रीनाथ', gairsain: 'गैरसैंण',
};
const DEV = '\\u0900-\\u097F';
const isDev = (s) => new RegExp(`[${DEV}]`).test(s);

export function fixHindi(text) {
  if (!text || !isDev(text)) return text; // leave English-only strings alone
  let s = String(text);
  // half-and-half words: Devanagari start + Latin rest, e.g. "उत्तarakhand" → the Hindi name whose
  // English spelling ends with that Latin part
  s = s.replace(new RegExp(`[${DEV}]+([A-Za-z]{3,})`, 'g'), (whole, latin) => {
    const hit = Object.entries(NAMES).find(([en]) => en.endsWith(latin.toLowerCase()) && latin.length >= en.length / 2);
    return hit ? hit[1] : whole;
  });
  // whole English names inside a Hindi sentence
  s = s.replace(/\b[A-Za-z]+\b/g, (w) => NAMES[w.toLowerCase()] || w);
  // one spelling across the site
  s = s.replace(/उत्तराखण्ड/g, 'उत्तराखंड');
  return s;
}

/** Words that still mix Devanagari and Latin letters after fixing. */
export function mixedWords(text) {
  return String(text || '').match(new RegExp(`\\S*([${DEV}][A-Za-z]|[A-Za-z][${DEV}])\\S*`, 'g')) || [];
}

/** Fix a digest point in place; returns the mixed words left over. */
export function fixPoint(p) {
  p.fact = fixHindi(p.fact);
  if (p.tag) p.tag = fixHindi(p.tag);
  if (p.sum) p.sum = fixHindi(p.sum);
  for (const d of p.details || []) { d.v = fixHindi(d.v); d.k = fixHindi(d.k); }
  if (p.quiz) { p.quiz.q = fixHindi(p.quiz.q); p.quiz.a = fixHindi(p.quiz.a); }
  return [p.fact, p.tag, p.sum, ...(p.details || []).flatMap((d) => [d.k, d.v]), p.quiz?.q, p.quiz?.a].flatMap(mixedWords);
}
