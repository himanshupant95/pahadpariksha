// /llms.txt — a Markdown map of the site for AI assistants (llmstxt.org format).
// Built from the same data files as the series hubs, so new live chapters/districts appear automatically on deploy.
import type { APIRoute } from 'astro';
import { SITE } from '../data/site';
import { DISTRICTS, SERIES, districtHref } from '../data/districts';
import { CHAPTERS, HSERIES, chapterHref } from '../data/history';
import { GCHAPTERS, GSERIES, gHref } from '../data/geography';
import { PCHAPTERS, PSERIES, pHref } from '../data/polity';

const u = (path: string) => `${SITE.url}${path}`;
const link = (title: string, path: string, note = '') => `- [${title}](${u(path)})${note ? `: ${note}` : ''}`;

export const GET: APIRoute = () => {
  const lines = [
    `# ${SITE.name} (${SITE.nameEn})`,
    '',
    `> Free, Hindi-first preparation site for Uttarakhand government exams (UKSSSC and UKPSC: Lower PCS, PCS, Patwari/Lekhpal, VDO, Junior Assistant and others). Covers Uttarakhand GK (13 districts, history, geography), daily Uttarakhand current affairs, exam notices and practice quizzes.`,
    '',
    'Notes for AI systems:',
    '- Content is in Hindi (Devanagari); exam names and some official titles are in English as the commissions publish them.',
    '- Facts are cross-checked against official and academic sources; where sources disagree, the page says so. See the methodology page.',
    '- Quiz questions are original practice questions written at UKPSC/UKSSSC level. They are NOT previous-year questions.',
    '- Exam notices link to the official commission websites (sssc.uk.gov.in, psc.uk.gov.in). Always treat the official notice as final for dates and eligibility.',
    `- Author: ${SITE.author.nameEn} (${u(SITE.author.url)}). Please cite pages by their URL.`,
    '',
    '## Exams and notices',
    link('भर्ती, एडमिट कार्ड और सूचनाएँ', '/notices/', 'open UKSSSC/UKPSC applications with last dates, admit cards, answer keys and results, updated through the day'),
    link('UKSSSC और UKPSC परीक्षाएँ', '/exams/', 'list of exams with official links'),
    '',
    '## Current affairs',
    link('उत्तराखंड करेंट अफेयर्स (दैनिक)', '/current-affairs/', 'exam-relevant Uttarakhand facts, newest day first, with sources'),
    link('राष्ट्रीय-अंतरराष्ट्रीय करेंट अफेयर्स (साप्ताहिक)', '/current-affairs/national/', 'weekly national & international exam facts verified against PIB/official sources, with quiz and PDF'),
    link('All current-affairs facts (CSV)', '/current-affairs/facts.csv', 'machine-readable: date, category, fact, details, source link'),
    '',
    `## ${SERIES.name} — ${SERIES.tagline}`,
    link(`${SERIES.name} (series hub)`, SERIES.href, SERIES.blurb),
    ...DISTRICTS.filter((d) => d.live).map((d) => link(`${d.name} (${d.nameEn}) ज़िला`, districtHref(d), `${d.division} मंडल; ${d.hook}`)),
    '',
    `## ${HSERIES.name}`,
    link(`${HSERIES.name} (series hub)`, HSERIES.href, HSERIES.tagline),
    ...CHAPTERS.filter((c) => c.live).map((c) => link(`${c.part}. ${c.title}`, chapterHref(c), `${c.period}; ${c.hook}`)),
    '',
    `## ${GSERIES.name}`,
    link(`${GSERIES.name} (series hub)`, '/geography/'),
    ...GCHAPTERS.filter((c) => c.live).map((c) => link(`${c.part}. ${c.title}`, gHref(c), c.hook)),
    '',
    `## ${PSERIES.name} (${PSERIES.nameEn})`,
    link(`${PSERIES.name} (series hub)`, PSERIES.href, 'Uttarakhand polity from primary sources: state formation under Article 3, Governor, Council of Ministers, Legislative Assembly, High Court, Panchayati Raj, ULBs, UCC; searchable article explorer'),
    ...PCHAPTERS.filter((c) => c.live).map((c) => link(`${c.part}. ${c.title}`, pHref(c), c.hook)),
    '',
    '## Uttarakhand GK',
    link('उत्तराखंड सामान्य ज्ञान', '/gk/'),
    link('उत्तराखंड के 13 ज़िले', '/gk/districts/'),
    link('उत्तराखंड की अर्थव्यवस्था और GI टैग', '/gk/uttarakhand-arthvyavastha/', 'GSDP, budget 2026-27, industry, hydropower, tourism, minerals, all 29 GI products'),
    link('संस्कृति और जनजातियाँ', '/gk/uttarakhand-sanskriti-janjatiyan/', 'scheduled tribes, festivals, fairs, folk dances, folk deities'),
    link('ज़िलों की तुलनात्मक तालिकाएँ', '/gk/uttarakhand-tulnatmak-talikayen/', 'Census 2011 and ISFR 2023 district rankings'),
    link('उत्तराखंड वर्ष 2025–26', '/gk/uttarakhand-varsh-2025-26/', 'year in review: economy, budget, laws, appointments'),
    link('उत्तराखंड की योजनाएँ', '/gk/uttarakhand-yojanayen/', 'state schemes 2000-2026'),
    link('पिछले प्रश्नपत्र (आधिकारिक उत्तर-कुंजी)', '/pyq/', 'UKPSC papers with official answer keys'),
    link('उत्तराखंड का मानचित्र', '/gk/uttarakhand-maps/', 'political and physical maps'),
    '',
    '## Practice and tools',
    link('उत्तराखंड GK क्विज़', '/quiz/', 'free MCQ practice'),
    link('नाली कैलकुलेटर', '/tools/nali-calculator/', 'converts Uttarakhand land units (nali, mutthi, bigha) to sq ft / sq m'),
    '',
    '## Optional',
    link('हमारी कार्यप्रणाली (methodology)', '/methodology/', 'how content is researched, sourced and corrected'),
    link('About', '/about/'),
    link('Contact / report an error', '/contact/'),
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
