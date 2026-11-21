// Curated "आगे पढ़ें" links shown at the end of a page (rendered by RelatedLinks in Base.astro).
// Keys are page paths. Only add a link when the two pages genuinely share exam facts.
const L: Record<string, string> = {
  '/gk/districts/dehradun/': 'देहरादून जिला', '/gk/districts/haridwar/': 'हरिद्वार जिला', '/gk/districts/nainital/': 'नैनीताल जिला',
  '/gk/districts/almora/': 'अल्मोड़ा जिला', '/gk/districts/pauri-garhwal/': 'पौड़ी गढ़वाल जिला', '/gk/districts/tehri-garhwal/': 'टिहरी गढ़वाल जिला',
  '/gk/districts/udham-singh-nagar/': 'ऊधम सिंह नगर जिला', '/gk/districts/chamoli/': 'चमोली जिला', '/gk/districts/pithoragarh/': 'पिथौरागढ़ जिला',
  '/gk/districts/uttarkashi/': 'उत्तरकाशी जिला', '/gk/districts/rudraprayag/': 'रुद्रप्रयाग जिला', '/gk/districts/bageshwar/': 'बागेश्वर जिला',
  '/gk/districts/champawat/': 'चंपावत जिला', '/gk/districts/': 'सभी 13 जिले (देवभूमि दर्पण)',
  '/history/prehistoric-uttarakhand/': 'प्रागैतिहासिक उत्तराखंड', '/history/ancient-uttarakhand/': 'प्राचीन उत्तराखंड',
  '/history/kartikeyapur-katyuri/': 'कत्यूरी राजवंश', '/history/chand-dynasty/': 'चंद राजवंश', '/history/parmar-dynasty/': 'परमार राजवंश',
  '/history/gorkha-rule/': 'गोरखा शासन', '/history/british-rule/': 'ब्रिटिश शासन', '/history/freedom-struggle/': 'स्वतंत्रता संग्राम',
  '/history/statehood-movement/': 'राज्य आंदोलन',
  '/geography/location-extent-boundaries/': 'स्थिति, विस्तार और सीमाएँ', '/geography/himalaya-formation-geology/': 'हिमालय का निर्माण',
  '/geography/physiographic-divisions/': 'भौतिक विभाग', '/geography/rivers-drainage/': 'नदियाँ और अपवाह तंत्र', '/geography/glaciers/': 'हिमनद (ग्लेशियर)',
  '/geography/climate/': 'जलवायु', '/geography/soils-vegetation/': 'मिट्टी और वनस्पति', '/geography/biodiversity-protected-areas/': 'जैव विविधता और संरक्षित क्षेत्र',
  '/polity/': 'उत्तराखंड राजव्यवस्था', '/polity/state-formation-constitutional-process/': 'राज्य गठन की संवैधानिक प्रक्रिया',
  '/polity/political-evolution/': 'राजनीतिक विकास',
  '/gk/uttarakhand-tulnatmak-talikayen/': 'तुलनात्मक तालिकाएँ (जिलों की रैंक)', '/gk/uttarakhand-sanskriti-janjatiyan/': 'संस्कृति और जनजातियाँ',
  '/gk/uttarakhand-varsh-2025-26/': 'वर्ष 2025–26 की समीक्षा', '/gk/uttarakhand-pariksha-tathya/': 'परीक्षा के लिए जरूरी तथ्य',
  '/gk/uttarakhand-yojanayen/': 'उत्तराखंड की योजनाएँ', '/gk/uttarakhand-maps/': 'उत्तराखंड के नक्शे',
  '/pyq/': 'पिछले प्रश्नपत्र (आधिकारिक कुंजी)', '/quiz/': 'सभी क्विज़', '/current-affairs/': 'रोज़ का करेंट अफेयर्स',
  '/exams/': 'UKSSSC / UKPSC परीक्षाएँ', '/notices/': 'ताज़ा सूचनाएँ और एडमिट कार्ड', '/methodology/': 'हम सामग्री कैसे जाँचते हैं',
  '/tools/nali-calculator/': 'नाली-बीघा भूमि कैलकुलेटर',
};
const M: Record<string, string[]> = {
  // जिले → इतिहास/भूगोल/विशेष
  '/gk/districts/dehradun/': ['/history/ancient-uttarakhand/', '/history/gorkha-rule/', '/geography/physiographic-divisions/', '/gk/uttarakhand-sanskriti-janjatiyan/', '/polity/state-formation-constitutional-process/'],
  '/gk/districts/haridwar/': ['/geography/rivers-drainage/', '/history/british-rule/', '/gk/uttarakhand-varsh-2025-26/', '/history/ancient-uttarakhand/'],
  '/gk/districts/nainital/': ['/geography/physiographic-divisions/', '/geography/biodiversity-protected-areas/', '/history/british-rule/', '/geography/climate/'],
  '/gk/districts/almora/': ['/history/chand-dynasty/', '/history/kartikeyapur-katyuri/', '/history/prehistoric-uttarakhand/', '/history/freedom-struggle/'],
  '/gk/districts/pauri-garhwal/': ['/history/parmar-dynasty/', '/history/ancient-uttarakhand/', '/history/british-rule/', '/history/gorkha-rule/'],
  '/gk/districts/tehri-garhwal/': ['/history/parmar-dynasty/', '/history/freedom-struggle/', '/geography/rivers-drainage/', '/history/statehood-movement/'],
  '/gk/districts/udham-singh-nagar/': ['/geography/physiographic-divisions/', '/history/ancient-uttarakhand/', '/gk/uttarakhand-sanskriti-janjatiyan/', '/history/statehood-movement/'],
  '/gk/districts/chamoli/': ['/history/parmar-dynasty/', '/history/kartikeyapur-katyuri/', '/geography/biodiversity-protected-areas/', '/geography/glaciers/', '/gk/uttarakhand-sanskriti-janjatiyan/'],
  '/gk/districts/pithoragarh/': ['/geography/location-extent-boundaries/', '/history/chand-dynasty/', '/gk/uttarakhand-sanskriti-janjatiyan/', '/geography/glaciers/'],
  '/gk/districts/uttarkashi/': ['/geography/glaciers/', '/geography/rivers-drainage/', '/geography/biodiversity-protected-areas/', '/geography/location-extent-boundaries/'],
  '/gk/districts/rudraprayag/': ['/geography/rivers-drainage/', '/geography/glaciers/', '/gk/uttarakhand-varsh-2025-26/', '/gk/uttarakhand-sanskriti-janjatiyan/'],
  '/gk/districts/bageshwar/': ['/history/british-rule/', '/history/freedom-struggle/', '/history/kartikeyapur-katyuri/', '/geography/glaciers/'],
  '/gk/districts/champawat/': ['/history/chand-dynasty/', '/gk/uttarakhand-sanskriti-janjatiyan/', '/geography/location-extent-boundaries/', '/history/gorkha-rule/'],
  // इतिहास → जिले
  '/history/prehistoric-uttarakhand/': ['/gk/districts/almora/', '/gk/districts/chamoli/', '/geography/physiographic-divisions/', '/gk/uttarakhand-sanskriti-janjatiyan/'],
  '/history/ancient-uttarakhand/': ['/gk/districts/dehradun/', '/gk/districts/udham-singh-nagar/', '/gk/districts/haridwar/', '/gk/districts/pauri-garhwal/'],
  '/history/kartikeyapur-katyuri/': ['/gk/districts/bageshwar/', '/gk/districts/almora/', '/gk/districts/chamoli/'],
  '/history/chand-dynasty/': ['/gk/districts/champawat/', '/gk/districts/almora/', '/gk/districts/pithoragarh/', '/gk/districts/nainital/'],
  '/history/parmar-dynasty/': ['/gk/districts/chamoli/', '/gk/districts/pauri-garhwal/', '/gk/districts/tehri-garhwal/'],
  '/history/gorkha-rule/': ['/gk/districts/almora/', '/gk/districts/dehradun/', '/gk/districts/champawat/'],
  '/history/british-rule/': ['/gk/districts/nainital/', '/gk/districts/bageshwar/', '/gk/districts/haridwar/', '/gk/districts/pauri-garhwal/'],
  '/history/freedom-struggle/': ['/gk/districts/tehri-garhwal/', '/gk/districts/bageshwar/', '/gk/districts/almora/'],
  '/history/statehood-movement/': ['/polity/state-formation-constitutional-process/', '/polity/political-evolution/', '/gk/districts/udham-singh-nagar/', '/gk/districts/dehradun/'],
  // भूगोल → जिले
  '/geography/location-extent-boundaries/': ['/gk/districts/pithoragarh/', '/gk/districts/champawat/', '/gk/districts/uttarkashi/', '/gk/uttarakhand-tulnatmak-talikayen/', '/gk/uttarakhand-maps/'],
  '/geography/himalaya-formation-geology/': ['/gk/districts/chamoli/', '/gk/districts/pithoragarh/', '/gk/districts/uttarkashi/'],
  '/geography/physiographic-divisions/': ['/gk/districts/nainital/', '/gk/districts/udham-singh-nagar/', '/gk/districts/dehradun/', '/gk/uttarakhand-maps/'],
  '/geography/rivers-drainage/': ['/gk/districts/uttarkashi/', '/gk/districts/rudraprayag/', '/gk/districts/tehri-garhwal/', '/gk/districts/haridwar/'],
  '/geography/glaciers/': ['/gk/districts/uttarkashi/', '/gk/districts/chamoli/', '/gk/districts/pithoragarh/', '/gk/districts/bageshwar/'],
  '/geography/climate/': ['/gk/districts/nainital/', '/gk/districts/dehradun/', '/gk/uttarakhand-tulnatmak-talikayen/'],
  '/geography/soils-vegetation/': ['/gk/uttarakhand-tulnatmak-talikayen/', '/gk/districts/chamoli/', '/gk/districts/udham-singh-nagar/'],
  '/geography/biodiversity-protected-areas/': ['/gk/districts/nainital/', '/gk/districts/chamoli/', '/gk/districts/uttarkashi/', '/gk/uttarakhand-tulnatmak-talikayen/'],
  // राजव्यवस्था
  '/polity/': ['/history/statehood-movement/', '/gk/uttarakhand-varsh-2025-26/', '/gk/uttarakhand-pariksha-tathya/'],
  '/polity/state-formation-constitutional-process/': ['/polity/political-evolution/', '/polity/', '/history/statehood-movement/', '/gk/uttarakhand-pariksha-tathya/'],
  '/polity/political-evolution/': ['/polity/state-formation-constitutional-process/', '/polity/', '/gk/uttarakhand-varsh-2025-26/', '/gk/uttarakhand-pariksha-tathya/'],
  // विशेष पेज
  '/gk/uttarakhand-sanskriti-janjatiyan/': ['/gk/districts/dehradun/', '/gk/districts/udham-singh-nagar/', '/gk/districts/pithoragarh/', '/gk/districts/chamoli/', '/gk/districts/champawat/'],
  '/gk/uttarakhand-tulnatmak-talikayen/': ['/gk/districts/', '/geography/soils-vegetation/', '/geography/location-extent-boundaries/', '/gk/uttarakhand-maps/'],
  '/gk/uttarakhand-varsh-2025-26/': ['/gk/uttarakhand-pariksha-tathya/', '/gk/uttarakhand-yojanayen/', '/current-affairs/', '/polity/political-evolution/'],
  '/gk/uttarakhand-pariksha-tathya/': ['/gk/uttarakhand-varsh-2025-26/', '/gk/uttarakhand-tulnatmak-talikayen/', '/polity/', '/tools/nali-calculator/'],
  '/gk/uttarakhand-yojanayen/': ['/gk/uttarakhand-varsh-2025-26/', '/gk/uttarakhand-pariksha-tathya/', '/current-affairs/'],
  '/pyq/': ['/gk/uttarakhand-pariksha-tathya/', '/exams/', '/notices/', '/methodology/'],
  '/current-affairs/': ['/gk/uttarakhand-pariksha-tathya/', '/exams/', '/notices/'],
  '/exams/': ['/notices/', '/pyq/', '/tools/nali-calculator/'],
  '/notices/': ['/exams/', '/pyq/'],
  '/about/': ['/methodology/', '/pyq/'],
};
// Every district page also gets these, every history/geography chapter gets the PYQ bank.
const DISTRICT_COMMON = ['/gk/uttarakhand-tulnatmak-talikayen/', '/gk/districts/', '/pyq/'];
export function relatedFor(path: string): { href: string; label: string }[] {
  const p = path.endsWith('/') ? path : path + '/';
  let list = [...(M[p] || [])];
  if (p.startsWith('/gk/districts/') && p !== '/gk/districts/') list.push(...DISTRICT_COMMON);
  if ((p.startsWith('/history/') || p.startsWith('/geography/') || p.startsWith('/polity/')) && list.length) list.push('/pyq/', '/quiz/');
  return [...new Set(list)].filter((h) => h !== p && L[h]).map((h) => ({ href: h, label: L[h] }));
}
