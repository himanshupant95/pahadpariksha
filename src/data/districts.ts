// "देवभूमि दर्पण" — the 13-district series. Order = part number. Set `live: true` when a page ships.
const wm = (path: string, file: string, w = 500) => `https://thumb.wikimedia.org/wikipedia/commons/thumb/${path}/${file}/${w}px-${file}`;

export const SERIES = {
  name: 'देवभूमि दर्पण',
  nameEn: 'Devbhoomi Darpan',
  tagline: '13 ज़िले, 13 कहानियाँ',
  blurb: 'उत्तराखंड के हर ज़िले का संपूर्ण परीक्षा-दर्पण — नाम की कहानी, इतिहास, भूगोल, जनजातियाँ, मेले, संस्थान, ट्रिक प्रश्न और क्विज़, एक ही पन्ने पर।',
  href: '/gk/districts/',
};

export interface SeriesDistrict { part: number; slug: string; name: string; nameEn: string; division: 'गढ़वाल' | 'कुमाऊँ'; hq: string; hook: string; live?: boolean; img?: string }

export const DISTRICTS: SeriesDistrict[] = [
  { part: 1, slug: 'dehradun', name: 'देहरादून', nameEn: 'Dehradun', division: 'गढ़वाल', hq: 'देहरादून', hook: 'गुरु राम राय का डेरा, कालसी शिलालेख, जौनसार-बावर', live: true, img: wm('6/60', 'Forest_Research_Institute%2C_Dehradun.jpg') },
  { part: 2, slug: 'haridwar', name: 'हरिद्वार', nameEn: 'Haridwar', division: 'गढ़वाल', hq: 'हरिद्वार', hook: 'गंगाद्वार, कुंभ, गंग नहर और रुड़की', live: true, img: wm('f/fa', 'Har_ki_Pauri%2C_Haridwar.jpg') },
  { part: 3, slug: 'nainital', name: 'नैनीताल', nameEn: 'Nainital', division: 'कुमाऊँ', hq: 'नैनीताल', hook: 'सती का नैन, झीलें, कॉर्बेट और ARIES', live: true, img: wm('c/cf', 'Nainital_lake.jpg') },
  { part: 4, slug: 'almora', name: 'अल्मोड़ा', nameEn: 'Almora', division: 'कुमाऊँ', hq: 'अल्मोड़ा', hook: 'चंद राजधानी, जागेश्वर, सांस्कृतिक नगरी' },
  { part: 5, slug: 'pauri-garhwal', name: 'पौड़ी गढ़वाल', nameEn: 'Pauri Garhwal', division: 'गढ़वाल', hq: 'पौड़ी', hook: 'मंडल मुख्यालय, कण्वाश्रम, लैंसडाउन' },
  { part: 6, slug: 'tehri-garhwal', name: 'टिहरी गढ़वाल', nameEn: 'Tehri Garhwal', division: 'गढ़वाल', hq: 'नई टिहरी', hook: 'टिहरी बाँध, श्रीदेव सुमन, प्रजामंडल' },
  { part: 7, slug: 'udham-singh-nagar', name: 'ऊधम सिंह नगर', nameEn: 'Udham Singh Nagar', division: 'कुमाऊँ', hq: 'रुद्रपुर', hook: 'तराई, पंतनगर, काशीपुर (गोविषाण)' },
  { part: 8, slug: 'chamoli', name: 'चमोली', nameEn: 'Chamoli', division: 'गढ़वाल', hq: 'गोपेश्वर', hook: 'बद्रीनाथ, फूलों की घाटी, चिपको' },
  { part: 9, slug: 'pithoragarh', name: 'पिथौरागढ़', nameEn: 'Pithoragarh', division: 'कुमाऊँ', hq: 'पिथौरागढ़', hook: 'सोर घाटी, धारचूला, कैलाश मार्ग' },
  { part: 10, slug: 'uttarkashi', name: 'उत्तरकाशी', nameEn: 'Uttarkashi', division: 'गढ़वाल', hq: 'उत्तरकाशी', hook: 'गंगोत्री-यमुनोत्री, सबसे बड़ा ज़िला' },
  { part: 11, slug: 'rudraprayag', name: 'रुद्रप्रयाग', nameEn: 'Rudraprayag', division: 'गढ़वाल', hq: 'रुद्रप्रयाग', hook: 'केदारनाथ, अलकनंदा-मंदाकिनी संगम' },
  { part: 12, slug: 'bageshwar', name: 'बागेश्वर', nameEn: 'Bageshwar', division: 'कुमाऊँ', hq: 'बागेश्वर', hook: 'बागनाथ, उत्तरायणी, कुली बेगार आंदोलन' },
  { part: 13, slug: 'champawat', name: 'चंपावत', nameEn: 'Champawat', division: 'कुमाऊँ', hq: 'चंपावत', hook: 'चंद वंश की पहली राजधानी, देवीधुरा बग्वाल' },
];

export const liveCount = () => DISTRICTS.filter((d) => d.live).length;
export const districtHref = (d: SeriesDistrict) => `/gk/districts/${d.slug}/`;
