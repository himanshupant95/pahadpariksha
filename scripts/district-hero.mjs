// One-off generator for district hero/card images we draw ourselves (no licence question).
// Usage: node scripts/district-hero.mjs rudraprayag bageshwar champawat
// Writes public/images/districts/<slug>.webp (1200×630, with title), <slug>-800.webp,
// and card art without text: 250px-/330px-/500px-<slug>.webp (16:10) for the series grid.
import { mkdir, writeFile, readFile } from 'node:fs/promises';

const ROOT = new URL('..', import.meta.url).pathname;
process.env.FONTCONFIG_FILE = ROOT + 'scripts/fonts/fonts.conf';
const { default: sharp } = await import('sharp');
const OUT = ROOT + 'public/images/districts/';
const F = 'font-family="Noto Sans Devanagari, Noto Sans"';

// nagara-style temple silhouette at (x, baseY), scale s
const temple = (x, y, s, fill) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${fill}">
  <rect x="-60" y="-26" width="120" height="26"/>
  <rect x="-48" y="-40" width="96" height="16"/>
  <path d="M-40 -40 C -38 -120, -14 -170, 0 -182 C 14 -170, 38 -120, 40 -40 Z"/>
  <rect x="-10" y="-196" width="20" height="16" rx="3"/>
  <path d="M0 -222 L 6 -198 L -6 -198 Z"/>
  <rect x="-80" y="-60" width="34" height="34"/><path d="M-84 -60 L -63 -86 L -42 -60 Z"/>
  <rect x="46" y="-60" width="34" height="34"/><path d="M42 -60 L 63 -86 L 84 -60 Z"/>
</g>`;

const SCENES = {
  rudraprayag: {
    part: 11, name: 'रुद्रप्रयाग', en: 'Rudraprayag', div: 'गढ़वाल',
    hook: 'केदारनाथ · पंच केदार · अलकनंदा-मंदाकिनी संगम',
    sky: ['#f6c38b', '#e98a6a', '#7b4b7a'], sun: '#ffe2a8',
    art: (W, H) => `
      <path d="M${W*0.30} ${H*0.62} L${W*0.48} ${H*0.20} L${W*0.56} ${H*0.32} L${W*0.66} ${H*0.12} L${W*0.80} ${H*0.36} L${W*0.90} ${H*0.24} L${W} ${H*0.42} L${W} ${H} L${W*0.30} ${H} Z" fill="#e9eef5"/>
      <path d="M${W*0.48} ${H*0.20} L${W*0.52} ${H*0.30} L${W*0.47} ${H*0.36} L${W*0.44} ${H*0.30} Z M${W*0.66} ${H*0.12} L${W*0.70} ${H*0.24} L${W*0.64} ${H*0.30} L${W*0.61} ${H*0.22} Z" fill="#b9c6d8"/>
      <path d="M0 ${H*0.66} C ${W*0.2} ${H*0.52}, ${W*0.4} ${H*0.62}, ${W*0.55} ${H*0.54} S ${W*0.85} ${H*0.50}, ${W} ${H*0.58} L${W} ${H} L0 ${H} Z" fill="#4e6b55"/>
      ${temple(W*0.66, H*0.70, H/630*0.95, '#3b2d2a')}
      <path d="M0 ${H*0.80} C ${W*0.25} ${H*0.72}, ${W*0.45} ${H*0.80}, ${W} ${H*0.72} L${W} ${H} L0 ${H} Z" fill="#2f4a3a"/>
      <path d="M${W*0.50} ${H} C ${W*0.56} ${H*0.90}, ${W*0.62} ${H*0.86}, ${W*0.70} ${H*0.84} M${W} ${H*0.78} C ${W*0.86} ${H*0.82}, ${W*0.76} ${H*0.84}, ${W*0.70} ${H*0.84} M${W*0.70} ${H*0.84} C ${W*0.66} ${H*0.90}, ${W*0.64} ${H*0.95}, ${W*0.62} ${H}" stroke="#9fd3e6" stroke-width="${H*0.022}" fill="none" stroke-linecap="round"/>`,
  },
  bageshwar: {
    part: 12, name: 'बागेश्वर', en: 'Bageshwar', div: 'कुमाऊँ',
    hook: 'बागनाथ · उत्तरायणी · कुली बेगार (1921) · कौसानी',
    sky: ['#cfe8f7', '#9cc9e8', '#5d8fb8'], sun: '#fff6d6',
    art: (W, H) => `
      <path d="M${W*0.28} ${H*0.55} L${W*0.40} ${H*0.30} L${W*0.47} ${H*0.38} L${W*0.58} ${H*0.18} L${W*0.70} ${H*0.36} L${W*0.80} ${H*0.26} L${W} ${H*0.44} L${W} ${H} L${W*0.28} ${H} Z" fill="#f4f7fb"/>
      <path d="M0 ${H*0.62} C ${W*0.25} ${H*0.48}, ${W*0.45} ${H*0.58}, ${W*0.62} ${H*0.50} S ${W*0.9} ${H*0.52}, ${W} ${H*0.56} L${W} ${H} L0 ${H} Z" fill="#5f8f5c"/>
      <path d="M0 ${H*0.74} C ${W*0.3} ${H*0.66}, ${W*0.5} ${H*0.74}, ${W} ${H*0.66} L${W} ${H} L0 ${H} Z" fill="#3f6f43"/>
      <path d="M${W*0.36} ${H*0.70} C ${W*0.48} ${H*0.80}, ${W*0.58} ${H*0.84}, ${W*0.66} ${H*0.86} M${W*0.98} ${H*0.70} C ${W*0.86} ${H*0.80}, ${W*0.74} ${H*0.84}, ${W*0.66} ${H*0.86} M${W*0.66} ${H*0.86} L${W*0.64} ${H}" stroke="#bfe6f5" stroke-width="${H*0.024}" fill="none" stroke-linecap="round"/>
      ${temple(W*0.66, H*0.84, H/630*0.62, '#4a3a2c')}
      <path d="M0 ${H*0.92} C ${W*0.3} ${H*0.88}, ${W*0.6} ${H*0.94}, ${W} ${H*0.90} L${W} ${H} L0 ${H} Z" fill="#2c5233"/>`,
  },
  champawat: {
    part: 13, name: 'चंपावत', en: 'Champawat', div: 'कुमाऊँ',
    hook: 'चंद राजधानी · देवीधुरा बग्वाल · पूर्णागिरि · मायावती',
    sky: ['#ffd9a0', '#f2a65e', '#b0553d'], sun: '#fff0c4',
    art: (W, H) => `
      <path d="M0 ${H*0.50} C ${W*0.2} ${H*0.40}, ${W*0.35} ${H*0.46}, ${W*0.52} ${H*0.38} S ${W*0.82} ${H*0.40}, ${W} ${H*0.34} L${W} ${H} L0 ${H} Z" fill="#8a6a6a" opacity=".55"/>
      <path d="M0 ${H*0.62} C ${W*0.22} ${H*0.52}, ${W*0.42} ${H*0.60}, ${W*0.60} ${H*0.50} S ${W*0.88} ${H*0.52}, ${W} ${H*0.48} L${W} ${H} L0 ${H} Z" fill="#5b6e45"/>
      ${temple(W*0.56, H*0.66, H/630*1.0, '#3d2f26')}
      <path d="M0 ${H*0.76} C ${W*0.3} ${H*0.68}, ${W*0.55} ${H*0.78}, ${W} ${H*0.70} L${W} ${H} L0 ${H} Z" fill="#3c5230"/>
      <path d="M${W*0.80} ${H*0.70} C ${W*0.84} ${H*0.80}, ${W*0.78} ${H*0.90}, ${W*0.86} ${H}" stroke="#a9d8e4" stroke-width="${H*0.03}" fill="none" stroke-linecap="round"/>
      <g fill="#2a3b22">${[0.70, 0.74, 0.92, 0.96].map((x, i) => `<path d="M${W*x} ${H*(0.80 + (i % 2) * 0.03)} l${H*0.03} ${H*0.09} h-${H*0.06} Z"/>`).join('')}</g>`,
  },
};

const scene = (s, W, H, withText) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.sky[2]}"/><stop offset=".55" stop-color="${s.sky[1]}"/><stop offset="1" stop-color="${s.sky[0]}"/></linearGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0b2416" stop-opacity=".88"/><stop offset=".48" stop-color="#0b2416" stop-opacity=".55"/><stop offset=".62" stop-color="#0b2416" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <circle cx="${W*0.80}" cy="${H*0.22}" r="${H*0.10}" fill="${s.sun}" opacity=".85"/>
  ${s.art(W, H)}
  ${withText ? `<rect width="${W}" height="${H}" fill="url(#fade)"/>
  <rect x="56" y="64" rx="18" width="300" height="40" fill="#c2410c"/>
  <text x="206" y="92" text-anchor="middle" ${F} font-weight="700" font-size="21" fill="#fff">देवभूमि दर्पण · भाग ${s.part}</text>
  <text x="56" y="215" ${F} font-weight="700" font-size="92" fill="#fff">${s.name}</text>
  <text x="60" y="262" ${F} font-weight="600" font-size="30" fill="#fde68a">${s.en} · ${s.div} मंडल</text>
  <text x="60" y="318" ${F} font-weight="400" font-size="25" fill="#e7f5ec">${s.hook}</text>
  <text x="60" y="${H - 44}" ${F} font-weight="600" font-size="22" fill="#d1fae5">pahadpariksha.in</text>` : ''}
</svg>`;

await mkdir(OUT, { recursive: true });
for (const slug of process.argv.slice(2)) {
  const s = SCENES[slug];
  if (!s) { console.error('no scene for', slug); continue; }
  const hero = sharp(Buffer.from(scene(s, 1200, 630, true)));
  await writeFile(OUT + `${slug}.webp`, await hero.clone().webp({ quality: 84 }).toBuffer());
  await writeFile(OUT + `${slug}-800.webp`, await hero.clone().resize(800).webp({ quality: 82 }).toBuffer());
  const card = sharp(Buffer.from(scene(s, 800, 500, false)));
  for (const w of [250, 330, 500]) await writeFile(OUT + `${w}px-${slug}.webp`, await card.clone().resize(w).webp({ quality: 80 }).toBuffer());
  console.log('hero:', slug);
}
