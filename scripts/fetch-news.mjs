// Uttarakhand current-affairs tracker.
// Pulls Google News RSS (Hindi + English) for Uttarakhand, keeps exam-relevant headlines,
// drops crime/accident noise and duplicate stories, merges into src/data/news.json.
// Only headline + source + link are stored (no article text). Run: node scripts/fetch-news.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as cheerio from 'cheerio';

const DATA = 'src/data/news.json';
const KEEP_DAYS = 45;
const MIN_SCORE = 2;
const UA = 'Mozilla/5.0 (compatible; PahadParikshaBot/1.0; +https://pahadpariksha.in)';

const gn = (q, lang) =>
  lang === 'hi'
    ? `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:3d')}&hl=hi&gl=IN&ceid=IN:hi`
    : `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:3d')}&hl=en-IN&gl=IN&ceid=IN:en`;

const FEEDS = [
  gn('उत्तराखंड', 'hi'),
  gn('उत्तराखंड सरकार योजना', 'hi'),
  gn('उत्तराखंड कैबिनेट फैसले', 'hi'),
  gn('उत्तराखंड पुरस्कार सम्मान', 'hi'),
  gn('उत्तराखंड पहला राज्य', 'hi'),
  gn('धामी घोषणा', 'hi'),
  gn('Uttarakhand', 'en'),
  gn('Uttarakhand government scheme', 'en'),
  gn('Uttarakhand cabinet decision', 'en'),
  gn('Uttarakhand first state', 'en'),
  gn('Uttarakhand award', 'en'),
];

// Must mention Uttarakhand or a place in it
const PLACE = /उत्तराखं[डड़]|उत्तरांचल|uttarakhand|uttaranchal|देहरादून|dehradun|हरिद्वार|haridwar|नैनीताल|nainital|अल्मोड़ा|almora|पिथौरागढ़|pithoragarh|चमोली|chamoli|उत्तरकाशी|uttarkashi|टिहरी|tehri|पौड़ी|pauri|रुद्रप्रयाग|rudraprayag|बागेश्वर|bageshwar|चंपावत|champawat|ऊधम सिंह नगर|udham singh nagar|रुद्रपुर|rudrapur|हल्द्वानी|haldwani|गैरसैंण|gairsain|भराड़ीसैंण|केदारनाथ|kedarnath|बद्रीनाथ|badrinath|गंगोत्री|यमुनोत्री|ऋषिकेश|rishikesh|मसूरी|mussoorie|कॉर्बेट|corbett|धामी|dhami|ukpsc|uksssc/i;

// Exam-relevant signals → [regex, weight, category]
const RULES = [
  [/योजना|scheme|yojana|मिशन|mission|अभियान|campaign/i, 2, 'योजना/नीति'],
  [/नीति|policy|कैबिनेट|cabinet|मंत्रिमंडल|अधिनियम|\bact\b|विधेयक|bill\b|अध्यादेश|ordinance|नियमावली|rules\b|विधानसभा|assembly|बजट|budget|UCC|समान नागरिक संहिता/i, 3, 'योजना/नीति'],
  [/नियुक्त|appointed|appointment|मनोनीत|शपथ|sworn|राज्यपाल|governor|मुख्य सचिव|chief secretary|DGP|डीजीपी|कुलपति|vice.?chancellor|ब्रांड एंबेसडर|brand ambassador|अध्यक्ष बने|new chief/i, 3, 'नियुक्ति'],
  [/पुरस्कार|award|सम्मान|honou?r|पद्म|padma|अवॉर्ड|medal|पदक|गोल्ड|स्वर्ण|रजत|कांस्य|winner|विजेता/i, 3, 'पुरस्कार/खेल'],
  [/पहला|पहली|प्रथम|\bfirst\b|सबसे बड़|largest|highest|सर्वाधिक|रिकॉर्ड|\brecord\b|रैंकिंग|ranking|रैंक|\brank|सूचकांक|\bindex\b/i, 2, 'रिपोर्ट/रैंकिंग'],
  [/सर्वेक्षण|survey|रिपोर्ट|report/i, 1, 'रिपोर्ट/रैंकिंग'],
  [/GI टैग|GI tag|जीआई|रामसर|ramsar|टाइगर रिज़र्व|tiger reserve|अभयारण्य|sanctuary|राष्ट्रीय उद्यान|national park|जैव विविधता|biodiversity|ग्लेशियर|glacier|हिम तेंदुआ|snow leopard|वन्यजीव|wildlife|पर्यावरण|environment|वन विभाग|वनाग्नि|forest/i, 2, 'पर्यावरण'],
  [/परियोजना|project|सुरंग|tunnel|रेल लाइन|rail line|ऋषिकेश.?कर्णप्रयाग|बांध|dam|जलविद्युत|hydro|रोपवे|ropeway|हवाई अड्डा|airport|हेलीपोर्ट|ऑल वेदर|all.?weather|एक्सप्रेसवे|expressway|शिलान्यास|foundation stone|लोकार्पण|inaugurat|उद्घाटन/i, 2, 'परियोजना'],
  [/MoU|समझौता|agreement|निवेश|investment|इन्वेस्टर|investor|GDP|जीडीपी|अर्थव्यवस्था|economy|स्टार्टअप|startup/i, 2, 'अर्थव्यवस्था'],
  [/मेला|mela|महोत्सव|festival|उत्सव|यात्रा शुरू|कपाट|portals|नंदा देवी|हरेला|harela|उत्तरायणी|फूलदेई|लोकगीत|लोकनृत्य|लोक कला|folk|संस्कृति|culture|विरासत|heritage|ASI|पुरातत्व|archaeolog/i, 2, 'संस्कृति'],
  [/राष्ट्रीय खेल|national games|खिलाड़ी|athlete|player|चैंपियनशिप|championship|ओलंपिक|olympic|खेल नीति|sports/i, 2, 'पुरस्कार/खेल'],
  [/ISRO|इसरो|DRDO|वैज्ञानिक|scientist|शोध|research|IIT|एम्स|AIIMS|ARIES|वेधशाला|observatory|विश्वविद्यालय|university/i, 1, 'विज्ञान/शिक्षा'],
  [/भर्ती|recruitment|UKSSSC|UKPSC|परीक्षा|exam|पेपर लीक|नकल विरोधी|anti.?cheating/i, 2, 'परीक्षा/भर्ती'],
  [/स्थापना दिवस|foundation day|जयंती|anniversary|पुण्यतिथि|दिवस मनाया/i, 1, 'संस्कृति'],
];

// Noise: crime, accidents, gossip, routine politics, weather nowcasts
const NOISE = /हत्या|murder|दुष्कर्म|rape|बलात्कार|छेड़छाड़|चोरी|theft|लूट|robbery|गिरफ्तार|arrest|ठगी|fraud|scam|साइबर ठग|नशा तस्कर|smuggl|शराब|liquor|हादसा|accident|दुर्घटना|crash|खाई में गिरी|मौत|died|death|dead|शव|body found|आत्महत्या|suicide|घायल|injured|फायरिंग|firing|मारपीट|झगड़ा|विवाद|तेंदुआ हमला|गुलदार|leopard attack|attack|हमला|राशिफल|horoscope|आज का मौसम|weather today|बारिश का अलर्ट|rain alert|रेड अलर्ट|ऑरेंज अलर्ट|पीला अलर्ट|yellow alert|orange alert|स्टॉक|stock|IPL|मैच रिपोर्ट|live score|फिल्म|bollywood|बॉलीवुड|शादी|wedding|वायरल|viral|कांग्रेस का आरोप|आरोप लगाया|alleges|slams|निशाना|पलटवार|बयान|चुनावी|प्रचार|टिकट|ticket to/i;

const SRC_BLOCK = /youtube|facebook|instagram|x\.com|twitter|dailyhunt|sharechat|newsbreak/i;

const clean = (t) => cheerio.load(`<p>${t}</p>`)('p').text().replace(/\s+/g, ' ').trim();
const norm = (t) => t.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
const tokens = (t) => new Set(norm(t).split(' ').filter((w) => w.length > 2));
const jaccard = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i || 1); };
const idOf = (t) => createHash('sha1').update(norm(t)).digest('hex').slice(0, 12);

function score(title) {
  if (!PLACE.test(title) || NOISE.test(title)) return null;
  let s = 0; const cats = {};
  for (const [re, w, cat] of RULES) if (re.test(title)) { s += w; cats[cat] = (cats[cat] || 0) + w; }
  if (s < MIN_SCORE) return null;
  const cat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0][0];
  return { score: s, cat };
}

async function readFeed(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url.slice(0, 90)}`);
  const $ = cheerio.load(await res.text(), { xmlMode: true });
  const out = [];
  $('item').each((_, el) => {
    const it = $(el);
    let title = clean(it.find('title').first().text());
    const source = clean(it.find('source').first().text()) || '';
    const srcUrl = it.find('source').first().attr('url') || '';
    // Google News titles end with " - Source"
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3)).trim();
    const link = it.find('link').first().text().trim();
    const pub = new Date(it.find('pubDate').first().text());
    if (!title || !link || isNaN(pub) || SRC_BLOCK.test(srcUrl)) return;
    out.push({ title, link, source, published: pub.toISOString(), lang: /[ऀ-ॿ]/.test(title) ? 'hi' : 'en' });
  });
  return out;
}

const old = JSON.parse(await readFile(DATA, 'utf8').catch(() => '{"items":[]}'));
const firstRun = old.items.length === 0;
const cutoff = Date.now() - KEEP_DAYS * 864e5;
const items = old.items.filter((i) => Date.parse(i.published) > cutoff);
const errors = [];
const fresh = [];

for (const url of FEEDS) {
  try {
    for (const n of await readFeed(url)) {
      if (Date.parse(n.published) < cutoff || Date.parse(n.published) > Date.now() + 36e5) continue;
      const sc = score(n.title);
      if (!sc) continue;
      const tk = tokens(n.title);
      const dup = [...items, ...fresh].find((x) => x.id === idOf(n.title) || jaccard(tk, tokens(x.title)) >= 0.55);
      if (dup) { if (!dup.sources?.includes(n.source) && n.source) (dup.sources ||= []).push(n.source); continue; }
      fresh.push({ id: idOf(n.title), ...n, ...sc, sources: [], firstSeen: new Date().toISOString() });
    }
  } catch (e) {
    errors.push(`${e.message}${e.cause ? ' (' + e.cause.code + ')' : ''}`);
  }
}

const all = [...fresh, ...items].sort((a, b) => b.published.localeCompare(a.published));
await writeFile(DATA, JSON.stringify({ updated: new Date().toISOString(), items: all }, null, 1) + '\n');
await writeFile('new-news.json', JSON.stringify({ firstRun, errors, count: fresh.length }));
console.log(`news: +${fresh.length} new, ${all.length} kept, ${errors.length} feed errors`);
if (errors.length === FEEDS.length) { console.error(errors.join('\n')); process.exit(1); }
