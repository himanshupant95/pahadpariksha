// Facts added after matching recent UKPSC papers (2025–26) against the site (21 Nov 2026).
// Each group is shown by <ExamFacts group="..." /> on the page named in `page`.
// Only facts checked against a cited source are kept here. Add a new fact to the right group with its source.

export interface ExamFact { t: string; src: { t: string; u: string }[]; trap?: string }
export interface FactGroup { id: string; page: string; title: string; facts: ExamFact[] }

export const CHECKED_ON = '21 नवंबर 2026';

export const GROUPS: FactGroup[] = [
  {
    id: 'history-chand', page: '/history/chand-dynasty/', title: 'चंद राजवंश',
    facts: [
      {
        t: 'नंदा देवी की <b>स्वर्ण प्रतिमा</b> राजा <b>बाज बहादुर चंद</b> (1638–78) लगभग 1670 में गढ़वाल के <b>बधाणकोट (बधाणगढ़)</b> किले से अल्मोड़ा लाए और <b>मल्ला महल</b> (आज का पुराना कलेक्ट्रेट) में स्थापित की। अल्मोड़ा के नंदा देवी मेले की शुरुआत भी इन्हीं के समय से मानी जाती है।',
        trap: 'परीक्षा में कभी-कभी विकल्पों में बाज बहादुर चंद का नाम नहीं होता। तब प्रश्न ध्यान से पढ़ें और उत्तर कुंजी देखें। प्रचलित स्रोत यह काम बाज बहादुर चंद का ही बताते हैं।',
        src: [{ t: 'काफल ट्री — नंदा देवी मेला', u: 'https://kafaltree.com/nanda-devis-beliefs-history-and-nanda-devi-fair/' }],
      },
      {
        t: '<b>खगमरा</b> का संबंध <b>अल्मोड़ा</b> से है। 1568 में कल्याण चंद ने खगमरा में स्थायी राजधानी बनाई, जो आगे अल्मोड़ा कहलाई। इसलिए "खगमरा किला/कोट" अल्मोड़ा नगर से जुड़ा नाम है।',
        src: [{ t: 'Wikipedia — Bageshwar (इतिहास खंड)', u: 'https://en.wikipedia.org/wiki/Bageshwar' }],
      },
    ],
  },
  {
    id: 'history-freedom', page: '/history/freedom-struggle/', title: 'स्वतंत्रता संग्राम और सामाजिक संगठन',
    facts: [
      {
        t: '<b>सरला बहन</b> (असली नाम कैथरीन मेरी हिलमैन, जन्म लंदन) ने 1946 में <b>कौसानी</b> में <b>कस्तूरबा महिला उत्थान मंडल</b> और लड़कियों के लिए आवासीय विद्यालय <b>लक्ष्मी आश्रम</b> बनाया। 1966 में मंडल की ज़िम्मेदारी उनकी शिष्या <b>राधा भट्ट</b> को मिली।',
        src: [
          { t: 'जमनालाल बजाज पुरस्कार — सरला देवी (1979)', u: 'https://jamnalalbajajfoundation.org/awards/archives/1979/constructive-work/sarla-devi' },
          { t: 'The Tribune — Radha Bhatt', u: 'https://m.tribuneindia.com/news/archive/features/radha-bhatt-chose-social-service-over-married-life-123525' },
        ],
      },
      {
        t: '1918 में कुमाऊँ परिषद के नेता <b>बद्री दत्त पांडे</b> गांधी जी को कुमाऊँ बुलाने <b>कलकत्ता</b> गए, पर पहले से तय कार्यक्रमों के कारण गांधी जी नहीं आ सके। "अल्मोड़ा अखबार" बंद होने के बाद पांडे जी ने 15 अक्टूबर 1918 (विजयादशमी) को <b>"शक्ति"</b> शुरू किया।',
        src: [{ t: 'Wikipedia — Badri Datt Pandey', u: 'https://en.wikipedia.org/wiki/Badri_Datt_Pandey' }],
      },
      {
        t: '<b>"गढ़वाल समाचार"</b> गढ़वाल का पहला हिंदी समाचार पत्र था, जो मई 1902 में <b>लैंसडाउन</b> से निकला। इसके संस्थापक-संपादक <b>गिरिजा दत्त नैथाणी</b> थे। इसके बाद "गढ़वाली" (1905, देहरादून) आया।',
        src: [{ t: 'Testbook — UKPSC प्रश्न व्याख्या', u: 'https://testbook.com/question-answer/hn/who-among-the-following-was-the-founder-editor-of--69f45ae717b00a75d2fe827b' }],
      },
      {
        t: 'सामाजिक संगठन: <b>गढ़वाल यूनियन</b> 1901 में बनी। <b>गढ़वाल भ्रातृ मंडल</b> 1907 में <b>लखनऊ</b> में मथुरा प्रसाद नैथानी और कुछ अन्य गढ़वालियों ने बनाया। इसका पहला अधिवेशन 1908 में कोटद्वार में हुआ।',
        src: [
          { t: 'Scroll — कुली बेगार आंदोलन के सौ साल', u: 'https://scroll.in/article/983754/a-hundred-years-ago-a-fiery-speech-in-uttarakhand-escalated-the-protests-against-forced-labour' },
          { t: 'Adda247 — गढ़वाल भ्रातृ मंडल', u: 'https://www.adda247.com/question-answer/mathura-prasad-naithani-and-few-other-garhwalis-founded-garhwal-bhratri-mandal-at-which-of-the-following-place-in-1907/q.v1.8272a15d-0fca-41f3-95b0-b6b0bbdba2cf-en' },
        ],
      },
    ],
  },
  {
    id: 'polity-firsts', page: '/polity/', title: 'राज्य की संस्थाएँ और "पहले" पदाधिकारी',
    facts: [
      {
        t: '<b>उत्तराखंड लोक सेवा आयोग</b> 15 मई 2001 से काम कर रहा है। इसके पहले अध्यक्ष <b>एन.पी. नवानी</b> (सेवानिवृत्त IAS) थे। स्वीकृत संख्या: एक अध्यक्ष और छह सदस्य। मुख्यालय गुरुकुल कांगड़ी, हरिद्वार में है।',
        src: [
          { t: 'UKPSC — संक्षिप्त परिचय', u: 'https://psc.uk.gov.in/brief-introduction' },
          { t: 'Wikipedia — UKPSC (अध्यक्षों की सूची)', u: 'https://en.wikipedia.org/wiki/Uttarakhand_Public_Service_Commission' },
        ],
      },
      {
        t: 'लोक सेवा आयोग अपना <b>वार्षिक प्रतिवेदन राज्यपाल</b> को देता है (अनुच्छेद 323(2))। उदाहरण: आयोग ने अपना 24वाँ प्रतिवेदन 29 जनवरी 2026 को राज्यपाल को सौंपा।',
        src: [{ t: 'लोक भवन उत्तराखंड — 29.01.2026', u: 'https://governoruk.gov.in/?p=56375' }],
      },
      {
        t: '<b>राधा रतूड़ी</b> (IAS, 1988 बैच) 31 जनवरी 2024 को राज्य की <b>पहली महिला मुख्य सचिव</b> बनीं। कुछ ही दिन बाद, 4 फ़रवरी 2024 को <b>न्यायमूर्ति ऋतु बाहरी</b> उत्तराखंड उच्च न्यायालय की <b>पहली महिला मुख्य न्यायाधीश</b> बनीं।',
        src: [
          { t: 'Deccan Herald — पहली महिला मुख्य सचिव', u: 'https://www.deccanherald.com/amp/story/india%2Futtarakhand%2Futtarakhand-gets-first-woman-chief-secretary-2872522' },
          { t: 'Deccan Herald — पहली महिला मुख्य न्यायाधीश', u: 'https://www.deccanherald.com/amp/story/india%2Futtarakhand%2Fjustice-ritu-bahri-becomes-first-woman-chief-justice-of-uttarakhand-2879148' },
        ],
      },
      {
        t: 'अंतरिम विधानसभा (9 नवंबर 2000 से 14 मार्च 2002) में उपाध्यक्ष का पद <b>खाली</b> रहा। इसलिए "पहला उपाध्यक्ष" वाले प्रश्न में अंतरिम विधानसभा का कोई नाम सही नहीं होगा।',
        src: [{ t: 'Wikipedia — उत्तराखंड विधानसभा अध्यक्ष/उपाध्यक्ष सूची', u: 'https://en.wikipedia.org/wiki/List_of_speakers_of_the_Uttarakhand_Legislative_Assembly' }],
      },
      {
        t: '15वें वित्त आयोग के अनुदान: 2025-26 में केंद्र ने उत्तराखंड के ग्रामीण स्थानीय निकायों के लिए दिसंबर 2025 में <b>₹94.236 करोड़</b> जारी किए। मार्च 2026 में दूसरी किस्त के ₹91.31 करोड़ आए, जिनसे 13 ज़िला पंचायतों, 95 क्षेत्र पंचायतों और 7,784 ग्राम पंचायतों को लाभ मिला।',
        src: [
          { t: 'Lokmat/IANS — ₹94.236 करोड़', u: 'https://www.lokmattimes.com/business/centre-releases-over-rs-94-crore-to-strengthen-rural-local-bodies-in-uttarakhand-1/amp/' },
          { t: 'Lokmat/ANI — ₹91.31 करोड़', u: 'https://www.lokmattimes.com/national/uttarakhand-govt-receives-rs-9131-crore-untied-grant-from-centre-to-strengthen-panchayati-raj-and-rural-development/amp' },
        ],
      },
    ],
  },
  {
    id: 'geo-biodiversity', page: '/geography/biodiversity-protected-areas/', title: 'संरक्षित क्षेत्र, उद्यान और पशु-धन',
    facts: [
      {
        t: '<b>विनोग (बेनोग) माउंटेन क्वेल अभयारण्य</b> देहरादून ज़िले में <b>मसूरी</b> के पास है। इसे 2 सितंबर 1993 को घोषित किया गया। इसका नाम "पहाड़ी बटेर" (Mountain Quail) पर है, जो आख़िरी बार 1876 में देखी गई थी।',
        src: [
          { t: 'Wikipedia — Mussoorie (Benog) Wildlife Sanctuary', u: 'https://en.wikipedia.org/wiki/Mussoorie_Wildlife_Sanctuary' },
          { t: 'BirdLife — Binog Sanctuary IBA', u: 'https://datazone.birdlife.org/site/factsheet/binog-sanctuary--bhadraj--jharipani-iba-india' },
        ],
      },
      {
        t: 'देश का पहला <b>लाइकेन पार्क</b> <b>मुनस्यारी</b> (पिथौरागढ़) में वन विभाग की अनुसंधान शाखा ने बनाया (काम 2019 में शुरू, 1.5 एकड़)। राज्य का पहला <b>ट्यूलिप गार्डन</b> भी मुनस्यारी में ही है, जिसका सफल परीक्षण 2020 में हुआ।',
        src: [
          { t: 'Deccan Herald — लाइकेन गार्डन', u: 'https://www.deccanherald.com/india/indias-first-lichen-garden-comes-up-in-uttarakhands-munsiyari-854706.html' },
          { t: 'Lokmat/ANI — ट्यूलिप गार्डन', u: 'https://www.lokmattimes.com/national/tulip-garden-comes-up-in-uttarakhand/amp' },
        ],
      },
      {
        t: '<b>महाभारत वाटिका</b> वन विभाग ने <b>हल्द्वानी</b> में बनाई (जनवरी 2025)। लगभग एक एकड़ में महाभारत में वर्णित 37 पौध-प्रजातियाँ लगी हैं। <b>रामायण वाटिका</b> भी हल्द्वानी में ही है।',
        src: [{ t: 'GKToday — महाभारत वाटिका', u: 'https://www.gktoday.in/new-ethnobotanical-gardens-in-haldwani/' }],
      },
      {
        t: '<b>चौगरखा</b> बकरी की नस्ल है, जिसे "कुमाऊँनी बकरी" भी कहते हैं। यह अल्मोड़ा, पिथौरागढ़, नैनीताल, चंपावत और बागेश्वर में पाली जाती है, मुख्य रूप से मांस के लिए। ICAR-NBAGR ने इसे जनवरी 2025 में नई नस्ल के रूप में पंजीकृत किया।',
        src: [{ t: 'ICAR-NBAGR — 10 नई नस्लें', u: 'https://nbagr.icar.gov.in/en/breed-registered_dec24' }],
      },
    ],
  },
  {
    id: 'gk-economy', page: '/gk/uttarakhand-pariksha-tathya/', title: 'अर्थव्यवस्था, बजट और संस्थान',
    facts: [
      {
        t: '<b>बजट 2026-27:</b> मुख्यमंत्री पुष्कर सिंह धामी ने 9 मार्च 2026 को <b>₹1,11,703.21 करोड़</b> का बजट रखा, जो 2025-26 (₹1,01,175 करोड़) से लगभग 10% बड़ा है। 27 अक्टूबर 2026 को गैरसैंण में ₹7,844.18 करोड़ का अनुपूरक बजट आया, जिससे कुल आकार <b>₹1,19,547.39 करोड़</b> हो गया।',
        src: [
          { t: 'PRS — Uttarakhand Budget Analysis 2026-27', u: 'https://prsindia.org/budgets/states/uttarakhand-budget-analysis-2026-27' },
          { t: 'Devdiscourse — अनुपूरक बजट', u: 'https://www.devdiscourse.com/article/headlines/3998049-uttarakhand-state-budget-expands-to-rs-119-lakh-crore-major-boost-for-farmers-infrastructurelocal-bodies' },
        ],
      },
      {
        t: 'राज्य का पहला <b>एरोमा पार्क</b> <b>काशीपुर</b> (ऊधम सिंह नगर) में SIIDCUL ने एरोमा पार्क नीति 2018 के तहत बनाया। प्रधानमंत्री ने 30 दिसंबर 2021 को इसकी आधारशिला रखी और जून 2023 में भूखंड बाँटे गए।',
        src: [
          { t: 'SIIDCUL — Aroma Park', u: 'https://siidcul.com/aroma-park' },
          { t: 'Business Standard — 28.06.2023', u: 'https://business-standard.com/india-news/uttarakhand-cm-lays-foundation-for-aroma-park-in-kashipur-allots-plot-123062800111_1.html' },
        ],
      },
      {
        t: '<b>जड़ी-बूटी शोध एवं विकास संस्थान (HRDI)</b> <b>मंडल-गोपेश्वर</b> (चमोली) में है और 1989 में बना था। यह ऊँचे पहाड़ों की औषधीय वनस्पतियों का संरक्षण और अध्ययन करता है।',
        src: [{ t: 'Wikipedia — Chamoli Gopeshwar (HRDI)', u: 'https://en.wikipedia.org/wiki/Chamoli_Gopeshwar' }],
      },
      {
        t: '<b>गोट वैली</b> (Goat Valley) योजना 2022 में शुरू हुई। इसमें बकरी-पालन को क्लस्टर में संगठित करके युवाओं को स्वरोज़गार दिया जाता है।',
        src: [{ t: 'पशुपालन विभाग, उत्तराखंड — Goat Valley', u: 'https://ahd.uk.gov.in/?p=7259' }],
      },
      {
        t: '<b>हिमालयन बास्केट</b> चंपावत ज़िले की पहल है। इसमें दूध, हल्दी और पुदीना जैसे स्थानीय उत्पाद ख़रीदकर उनसे अलग-अलग उत्पाद बनाए जाते हैं और विदेश तक भेजे जाते हैं।',
        src: [{ t: 'LatestLY/ANI — Himalayan Basket', u: 'https://www.latestly.com/agency-news/india-news-uttarakhand-cm-launches-himalayan-basket-5769518.html' }],
      },
      {
        t: '<b>आदर्श संस्कृत ग्राम</b> कार्यक्रम उत्तराखंड का है। इसके तहत हर ज़िले में एक, यानी कुल 13 गाँव संस्कृत ग्राम के रूप में विकसित किए जा रहे हैं (जैसे मुखेम, टिहरी)।',
        src: [{ t: 'Organiser — 13 संस्कृत ग्राम', u: 'https://organiser.org/2025/02/14/277994/bharat/uttarakhand-brings-sanskrit-to-life-13-villages-pave-the-way-for-a-linguistic-rebirth/' }],
      },
    ],
  },
  {
    id: 'gk-people', page: '/gk/uttarakhand-pariksha-tathya/', title: 'व्यक्तित्व और जन-आंदोलन',
    facts: [
      {
        t: '<b>पाणी राखो आंदोलन</b> <b>सच्चिदानंद भारती</b> ने <b>उफरैंखाल</b> (पौड़ी गढ़वाल) में चलाया। उन्होंने 1982 में "दूधातोली लोक विकास संस्थान" बनाया। ढलानों पर हज़ारों <b>चाल-खाल</b> (छोटे गड्ढे) खोदकर वर्षा-जल रोका गया, जिससे सूखी गदेरी फिर बहने लगी ("गाड गंगा")।',
        src: [
          { t: 'Wikipedia — Sachidanand Bharti', u: 'https://en.wikipedia.org/wiki/Sachidanand_Bharti' },
          { t: 'CGWB — Ufrenkhal Chal-Khal', u: 'https://cgwb.gov.in/en/node/1989' },
        ],
      },
      {
        t: 'प्रधानमंत्री ने "मन की बात" के <b>122वें</b> एपिसोड (25 मई 2025) में <b>हल्द्वानी</b> के दिव्यांग कलाकार <b>जीवन (चंद्र) जोशी</b> की सराहना की। बचपन में पोलियो के बावजूद वे चीड़ की सूखी छाल से "<b>बगेट</b>" कलाकृतियाँ बनाते हैं।',
        src: [{ t: 'Lokmat/ANI — 25.05.2025', u: 'https://www.lokmattimes.com/entertainment/my-work-has-been-acknowledged-today-im-happy-about-it-says-folk-artist-jeevan-joshi-as-pm-modi-lauds-his-journey-in-mann-ki-baat' }],
      },
    ],
  },
  {
    id: 'gk-traps', page: '/gk/uttarakhand-pariksha-tathya/', title: 'जाल वाले प्रश्न (विकल्पों में उत्तराखंड, उत्तर कहीं और)',
    facts: [
      {
        t: 'स्वच्छ सर्वेक्षण 2024-25 (पुरस्कार 17 जुलाई 2025) में <b>सर्वश्रेष्ठ गंगा नगर</b> का पुरस्कार <b>प्रयागराज</b> को मिला, हरिद्वार को नहीं।',
        src: [{ t: 'PIB — Swachh Survekshan 2024-25', u: 'https://www.pib.gov.in/PressReleseDetailm.aspx?PRID=2145461' }],
      },
      {
        t: '46 साल बाद भारत में दिखी दुर्लभ <b>लॉन्ग-बिल्ड बुश वार्बलर</b> (जुलाई 2025) <b>लद्दाख</b> की सुरु घाटी में मिली थी, उत्तराखंड में नहीं।',
        src: [{ t: 'The Cool Down / Hindustan Times', u: 'https://www.thecooldown.com/?p=562538' }],
      },
    ],
  },
];

export const byId = (id: string) => GROUPS.find((g) => g.id === id);
export const forPage = (page: string) => GROUPS.filter((g) => g.page === page);
