// slug (src/data/quizzes/<slug>.json) → page where that quiz is played
export const QUIZ_URL: Record<string, string> = { 'districts-rivers': '/gk/districts/#quiz', dehradun: '/gk/districts/dehradun/#quiz', haridwar: '/gk/districts/haridwar/#quiz', nainital: '/gk/districts/nainital/#quiz', almora: '/gk/districts/almora/#quiz', 'pauri-garhwal': '/gk/districts/pauri-garhwal/#quiz', 'tehri-garhwal': '/gk/districts/tehri-garhwal/#quiz', 'history-prehistoric': '/history/prehistoric-uttarakhand/#quiz', 'history-ancient': '/history/ancient-uttarakhand/#quiz', 'history-katyuri': '/history/kartikeyapur-katyuri/#quiz', 'history-chand': '/history/chand-dynasty/#quiz', 'history-parmar': '/history/parmar-dynasty/#quiz', 'history-gorkha': '/history/gorkha-rule/#quiz', 'history-british': '/history/british-rule/#quiz', 'history-freedom': '/history/freedom-struggle/#quiz', 'history-statehood': '/history/statehood-movement/#quiz', 'uttarakhand-yojanayen': '/gk/uttarakhand-yojanayen/#quiz', 'polity-hub': '/polity/#quiz', 'polity-state-formation': '/polity/state-formation-constitutional-process/#quiz', 'polity-political-evolution': '/polity/political-evolution/#quiz', 'geo-location': '/geography/location-extent-boundaries/#quiz', 'geo-himalaya': '/geography/himalaya-formation-geology/#quiz', 'geo-physiography': '/geography/physiographic-divisions/#quiz', 'geo-rivers': '/geography/rivers-drainage/#quiz', 'geo-glaciers': '/geography/glaciers/#quiz', 'geo-climate': '/geography/climate/#quiz', 'geo-soils-vegetation': '/geography/soils-vegetation/#quiz', 'geo-biodiversity': '/geography/biodiversity-protected-areas/#quiz', 'udham-singh-nagar': '/gk/districts/udham-singh-nagar/#quiz', chamoli: '/gk/districts/chamoli/#quiz', pithoragarh: '/gk/districts/pithoragarh/#quiz', uttarkashi: '/gk/districts/uttarkashi/#quiz', rudraprayag: '/gk/districts/rudraprayag/#quiz', bageshwar: '/gk/districts/bageshwar/#quiz', champawat: '/gk/districts/champawat/#quiz', 'sanskriti-janjatiyan': '/gk/uttarakhand-sanskriti-janjatiyan/#quiz', 'tulnatmak-talikayen': '/gk/uttarakhand-tulnatmak-talikayen/#quiz', 'varsh-2025-26': '/gk/uttarakhand-varsh-2025-26/#quiz', 'polity-land-revenue': '/polity/land-revenue-system/#quiz', 'polity-legislative-assembly': '/polity/legislative-assembly/#quiz', 'polity-judiciary': '/polity/judiciary/#quiz', 'polity-special-laws': '/polity/special-laws/#quiz', arthvyavastha: '/gk/uttarakhand-arthvyavastha/#quiz' };

// Groups and Hindi labels for the /quiz/ hub (order = display order)
export const QUIZ_GROUPS: { title: string; id: string; items: [string, string][] }[] = [
  { title: 'इतिहास', id: 'itihas', items: [
    ['history-prehistoric', 'प्रागैतिहासिक उत्तराखंड'], ['history-ancient', 'प्राचीन उत्तराखंड'], ['history-katyuri', 'कार्तिकेयपुर / कत्यूरी राजवंश'],
    ['history-chand', 'चंद राजवंश'], ['history-parmar', 'परमार (पंवार) राजवंश'], ['history-gorkha', 'गोरखा शासन'],
    ['history-british', 'ब्रिटिश शासन'], ['history-freedom', 'स्वतंत्रता संग्राम'], ['history-statehood', 'राज्य आंदोलन'] ] },
  { title: 'भूगोल', id: 'bhugol', items: [
    ['geo-location', 'स्थिति, विस्तार और सीमाएँ'], ['geo-himalaya', 'हिमालय का निर्माण और भूविज्ञान'], ['geo-physiography', 'भौतिक विभाग'],
    ['geo-rivers', 'नदियाँ और अपवाह तंत्र'], ['geo-glaciers', 'हिमनद (ग्लेशियर)'], ['geo-climate', 'जलवायु'],
    ['geo-soils-vegetation', 'मिट्टी और वनस्पति'], ['geo-biodiversity', 'जैव विविधता और संरक्षित क्षेत्र'] ] },
  { title: 'राजव्यवस्था', id: 'rajvyavastha', items: [
    ['polity-hub', 'उत्तराखंड राजव्यवस्था — मूल बातें'], ['polity-state-formation', 'राज्य गठन की संवैधानिक प्रक्रिया'], ['polity-political-evolution', 'राजनीतिक विकास'],
    ['polity-legislative-assembly', 'उत्तराखंड विधानसभा'], ['polity-judiciary', 'उच्च न्यायालय और निचली अदालतें'],
    ['polity-land-revenue', 'भूमि व्यवस्था और राजस्व प्रशासन'], ['polity-special-laws', 'उत्तराखंड के ख़ास कानून'] ] },
  { title: 'जिले', id: 'jile', items: [
    ['dehradun', 'देहरादून'], ['haridwar', 'हरिद्वार'], ['tehri-garhwal', 'टिहरी गढ़वाल'], ['pauri-garhwal', 'पौड़ी गढ़वाल'],
    ['uttarkashi', 'उत्तरकाशी'], ['chamoli', 'चमोली'], ['rudraprayag', 'रुद्रप्रयाग'], ['nainital', 'नैनीताल'],
    ['almora', 'अल्मोड़ा'], ['pithoragarh', 'पिथौरागढ़'], ['bageshwar', 'बागेश्वर'], ['champawat', 'चंपावत'],
    ['udham-singh-nagar', 'ऊधम सिंह नगर'], ['districts-rivers', 'सभी जिले और नदियाँ (मिश्रित)'] ] },
  { title: 'विशेष विषय और करेंट', id: 'vishesh', items: [
    ['sanskriti-janjatiyan', 'संस्कृति और जनजातियाँ'], ['tulnatmak-talikayen', 'तुलनात्मक तालिकाएँ (रैंक)'],
    ['arthvyavastha', 'अर्थव्यवस्था और GI टैग'], ['uttarakhand-yojanayen', 'उत्तराखंड की योजनाएँ'], ['varsh-2025-26', 'वर्ष 2025–26 की समीक्षा'] ] },
];
