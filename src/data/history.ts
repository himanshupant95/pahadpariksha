// "उत्तराखंड का इतिहास" — chapter series. Order = part number. Set `live: true` when a chapter ships.
export const HSERIES = {
  name: 'उत्तराखंड का इतिहास',
  tagline: 'पाषाण युग से टिहरी के विलय (1949) तक, अध्याय-दर-अध्याय',
  blurb: 'शैलचित्रों से लेकर राज्य आंदोलन तक — विश्वविद्यालयी इतिहास-ग्रंथों, पुरातात्विक रिपोर्टों और अभिलेखों पर आधारित, परीक्षा बिंदुओं, समयरेखा, चित्रों और क्विज़ के साथ।',
  href: '/history/',
};

export interface Chapter { part: number; slug: string; title: string; period: string; hook: string; live?: boolean; img?: string }

const thumb = (file: string, w = 500) => `https://upload.wikimedia.org/wikipedia/commons/thumb/${file}/${w}px-${file.split('/').pop()}`;

export const CHAPTERS: Chapter[] = [
  { part: 1, slug: 'prehistoric-uttarakhand', title: 'प्रागैतिहासिक उत्तराखंड', period: 'पाषाण युग – लौह युग', hook: 'लखुडियार के शैलचित्र, ताम्र मानवाकृतियाँ, महाश्म और मलारी की समाधियाँ', live: true,
    img: thumb('d/de/Ancient_Cave_Paintings_at_Lakhudiyar%2C_Almora_District%2C_Uttarakhand_India_-_1.jpeg') },
  { part: 2, slug: 'ancient-uttarakhand', title: 'प्राचीन उत्तराखंड: कुणिंद से ब्रह्मपुर तक', period: 'लगभग 600 ई.पू. – 700 ई.', hook: 'ग्रंथों में उत्तराखंड, कुणिंद मुद्राएँ, कालसी अभिलेख, जगतग्राम, लाखामंडल, ह्वेनसांग', live: true,
    img: thumb('e/e3/0051823_Major_rock_edict_of_Asoka%2C_Kalsi_Uttarakhand_017.jpg') },
  { part: 3, slug: 'kartikeyapur-katyuri', title: 'कार्तिकेयपुर (कत्यूरी) राजवंश', period: 'लगभग 700 – 1050 ई.', hook: 'मध्य हिमालय का पहला बड़ा राज्य — ताम्रपत्र, प्रशासन, बैजनाथ-जागेश्वर-कटारमल', live: true,
    img: thumb('1/1b/Temples_of_Baijnath%2C_Uttarakhand%2C_India.jpg') },
  { part: 4, slug: 'chand-dynasty', title: 'कुमाऊँ का चंद राजवंश', period: 'लगभग 1000 – 1790 ई.', hook: 'चंपावत से अल्मोड़ा, रुद्रचंद, बाज बहादुर चंद', live: true,
    img: thumb('8/8c/Champawat_town.jpg') },
  { part: 5, slug: 'parmar-dynasty', title: 'गढ़वाल का परमार (पंवार) वंश', period: '688/888 – 1804 ई.', hook: '52 गढ़, अजयपाल, श्रीनगर राजधानी, रानी कर्णावती, खुड़बुड़ा', live: true,
    img: thumb('e/e1/Chandpur_Garhi_Ruins.jpg') },
  { part: 6, slug: 'gorkha-rule', title: 'उत्तराखंड में गोरखा शासन', period: '1790 – 1815 ई.', hook: 'गोरख्याणी, सुब्बा व दिव्य-न्याय, खुड़बुड़ा, खलंगा युद्ध, अल्मोड़ा का पतन और सुगौली संधि', live: true,
    img: thumb('a/a0/Kalinga_War_memorial%2C_Dehradun.jpg') },
  { part: 7, slug: 'british-rule', title: 'ब्रिटिश कुमाऊँ-गढ़वाल व टिहरी रियासत', period: '1815 – 1949 ई.', hook: 'गार्डनर-ट्रेल-रैमजे, अस्सी साला बंदोबस्त, पटवारी, वन नीति, गढ़वाल राइफल्स, टिहरी के राजा', live: true,
    img: thumb('e/e3/Royal_Palace_of_Narendra_Nagar%2C_Uttarakhand_WTK20150913-DSC00029.jpg') },
  { part: 8, slug: 'freedom-struggle', title: 'स्वतंत्रता संग्राम व जन आंदोलन', period: '1857 – 1949 ई.', hook: 'कालू महरा, कुली बेगार, पेशावर कांड, तिलाड़ी, सल्ट-सालम, श्रीदेव सुमन, टिहरी का विलय', live: true,
    img: thumb('e/eb/Kausani%2C_Uttarakhand_263639%2C_India_-_panoramio.jpg') },
];

export const chapterHref = (c: Chapter) => `/history/${c.slug}/`;
