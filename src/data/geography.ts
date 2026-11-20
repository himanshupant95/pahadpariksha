// "उत्तराखंड का भूगोल" — chapter series (pillar: /geography/). Set `live: true` when a chapter ships.
export const GSERIES = {
  name: 'उत्तराखंड का भूगोल',
  nameEn: 'Uttarakhand Geography',
  tagline: 'शून्य से UPSC/UKPSC स्तर तक — मानचित्रों के साथ, अध्याय-दर-अध्याय',
  blurb: 'स्थिति और हिमालय के निर्माण से लेकर नदियों, हिमनदों, जलवायु, वन, जनसंख्या, आपदाओं और परीक्षा-अभ्यास तक — भारतीय सर्वेक्षण विभाग, GSI, वाडिया संस्थान, जनगणना जैसे आधिकारिक व वैज्ञानिक स्रोतों पर आधारित, अपने बनाए मानचित्रों के साथ।',
  href: '/geography/',
};

export interface GChapter { part: number; slug: string; title: string; unit: string; hook: string; live?: boolean; img?: string }

export const UNITS = [
  { id: 'I', name: 'भाग I — भौगोलिक आधार' },
  { id: 'II', name: 'भाग II — अपवाह तंत्र व जल' },
  { id: 'III', name: 'भाग III — जलवायु व पारिस्थितिकी' },
  { id: 'IV', name: 'भाग IV — मानव व आर्थिक भूगोल' },
  { id: 'V', name: 'भाग V — भौगोलिक चुनौतियाँ (आपदाएँ)' },
  { id: 'VII', name: 'भाग VI — परीक्षा-तैयारी' },
];

export const GCHAPTERS: GChapter[] = [
  { part: 1, slug: 'location-extent-boundaries', unit: 'I', title: 'स्थिति, विस्तार और सीमाएँ', hook: 'अक्षांश-देशांतर, क्षेत्रफल, पड़ोसी राज्य-देश, 13 ज़िले, सामरिक महत्त्व', live: true, img: '/maps/geo/g01-extent-800.webp' },
  { part: 2, slug: 'himalaya-formation-geology', unit: 'I', title: 'हिमालय का निर्माण और भूगर्भीय संरचना', hook: 'पृथ्वी की परतें, प्लेट विवर्तनिकी, टेथिस, MBT-MCT, उत्तराखंड की चट्टानें', live: true, img: '/maps/geo/g03-profile-garhwal-800.webp' },
  { part: 3, slug: 'physiographic-divisions', unit: 'I', title: 'भौतिक विभाजन: तराई से टेथिस तक', hook: 'तराई, भाबर, शिवालिक, दून, लघु व वृहत हिमालय, घाटियाँ, दर्रे, चोटियाँ', live: true, img: '/maps/geo/g03-profile-kumaon-800.webp' },
  { part: 4, slug: 'rivers-drainage', unit: 'II', title: 'नदियाँ और अपवाह तंत्र', hook: 'यमुना, भागीरथी, अलकनंदा, रामगंगा, काली-सरयू; पंच प्रयाग; बाँध; झीलें', live: true, img: '/maps/geo/g04-river-systems-800.webp' },
  { part: 5, slug: 'glaciers', unit: 'II', title: 'हिमनद और हिमनदीय भू-आकृतियाँ', hook: 'गंगोत्री, सतोपंथ, मिलम, पिंडारी; मोरेन, सर्क; पीछे हटते हिमनद; GLOF', live: true, img: '/maps/geo/g05-glaciers-800.webp' },
  { part: 6, slug: 'climate', unit: 'III', title: 'जलवायु', hook: 'मानसून, पश्चिमी विक्षोभ, पर्वतीय वर्षा, बादल फटना, ऊँचाई और तापमान', live: true, img: '/maps/geo/g06-district-rainfall-800.webp' },
  { part: 7, slug: 'soils-vegetation', unit: 'III', title: 'मिट्टियाँ और प्राकृतिक वनस्पति', hook: 'ऊँचाई के अनुसार वन, बुग्याल, मिट्टी के प्रकार व अपरदन', live: true, img: '/maps/geo/g07-vegetation-belts-800.webp' },
  { part: 8, slug: 'biodiversity-protected-areas', unit: 'III', title: 'जैव विविधता और संरक्षित क्षेत्र', hook: 'कॉर्बेट, राजाजी, नंदा देवी, फूलों की घाटी, गंगोत्री, अभयारण्य', live: true, img: '/maps/geo/g08-protected-areas-800.webp' },
  { part: 9, slug: 'population-settlement', unit: 'IV', title: 'जनसंख्या और बस्तियाँ', hook: 'जनसंख्या वितरण, पलायन, घोस्ट विलेज, नगरीकरण' },
  { part: 10, slug: 'agriculture-land-use', unit: 'IV', title: 'कृषि और भूमि उपयोग', hook: 'सीढ़ीदार खेती, मोटे अनाज, बागवानी, तराई-भाबर की खेती' },
  { part: 11, slug: 'resources-industries', unit: 'IV', title: 'संसाधन, उद्योग और परिवहन', hook: 'वन, जल, खनिज, जलविद्युत, पर्यटन, औद्योगिक पट्टी' },
  { part: 12, slug: 'landslides', unit: 'V', title: 'भूस्खलन और ढाल अस्थिरता', hook: 'भूगर्भीय कारण, सड़क निर्माण, वर्षा, जोशीमठ' },
  { part: 13, slug: 'earthquakes', unit: 'V', title: 'भूकंप और भूकंपीय संवेदनशीलता', hook: 'MHT, भूकंपीय क्षेत्र, 1803, 1991, 1999 के भूकंप' },
  { part: 14, slug: 'floods-cloudbursts-glof', unit: 'V', title: 'बाढ़, बादल फटना और GLOF', hook: 'केदारनाथ 2013, चमोली 2021, धराली 2025' },
  { part: 15, slug: 'environmental-challenges', unit: 'V', title: 'पर्यावरणीय और विकास संबंधी चुनौतियाँ', hook: 'वनाग्नि, जलस्रोत सूखना, पर्यटन दबाव, जलवायु परिवर्तन' },
  { part: 16, slug: 'exam-guide', unit: 'VII', title: 'परीक्षा-दृष्टि: UPSC व UKPSC', hook: 'प्रारंभिक व मुख्य परीक्षा के लिए विषयवार तैयारी' },
  { part: 17, slug: 'map-practice', unit: 'VII', title: 'मानचित्र आधारित अभ्यास', hook: 'रिक्त मानचित्र, पहचान अभ्यास, उत्तर सहित' },
  { part: 18, slug: 'practice-questions', unit: 'VII', title: 'अभ्यास प्रश्न-पत्र (UKPSC स्तर)', hook: 'अध्याय-वार मिश्रित MCQ और विश्लेषणात्मक प्रश्न' },
];

export const gHref = (c: Pick<GChapter, 'slug'>) => `/geography/${c.slug}/`;
