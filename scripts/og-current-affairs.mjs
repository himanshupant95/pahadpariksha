// Builds the share/hero image for the daily current-affairs page (1200×630 JPEG):
// date of the latest edition, point count and its top topics, in the site's green/mountain style.
// Output: public/og/current-affairs-<YYYY-MM-DD>.jpg (dated name, so WhatsApp/Telegram never show a stale preview).
// Runs before `astro build` (see package.json). Fonts are committed in scripts/fonts (Noto Sans Devanagari + Noto Sans, OFL).
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';

const ROOT = new URL('..', import.meta.url).pathname;
// librsvg (inside sharp) shapes Hindi with HarfBuzz; point fontconfig at the committed fonts so CI renders identically.
process.env.FONTCONFIG_FILE = ROOT + 'scripts/fonts/fonts.conf';
const { default: sharp } = await import('sharp');
const OUT = ROOT + 'public/og/';
const MONTHS = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
const WEEKDAYS = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Devanagari renders ~0.55em per code point incl. matras; good enough to keep topics on one line.
const clip = (s, max) => { // cut at a word boundary so no half-word (and no broken conjunct) is shown
  if ([...s].length <= max) return s;
  let out = '';
  for (const w of s.split(' ')) { if ([...(out ? out + ' ' + w : w)].length > max - 1) break; out = out ? out + ' ' + w : w; }
  return (out || [...s].slice(0, max - 1).join('')) + '…';
};

const dg = JSON.parse(await readFile(ROOT + 'src/data/digest.json', 'utf8'));
const latest = dg.points.map((p) => p.date).sort().at(-1);
if (!latest) { console.log('og: no points yet'); process.exit(0); }
const items = dg.points.filter((p) => p.date === latest).sort((a, b) => b.imp - a.imp);
const d = new Date(latest + 'T00:00:00Z');
const dateHi = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const quizN = items.filter((p) => p.quiz).length;
const topics = items.slice(0, 4).map((p) => clip(p.tag || p.fact, 30));

const logo = (await readFile(ROOT + 'public/logo.png')).toString('base64');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b3a20"/><stop offset=".55" stop-color="#14532d"/><stop offset="1" stop-color="#166534"/>
    </linearGradient>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fbbf24" stop-opacity=".9"/><stop offset="1" stop-color="#f97316" stop-opacity=".75"/>
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f0fdf4"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <!-- sun + Himalayan ridges -->
  <circle cx="560" cy="430" r="64" fill="url(#sky)" opacity=".5"/>
  <path d="M0 520 L90 440 L150 478 L250 380 L330 452 L420 400 L520 470 L600 430 L700 500 L700 630 L0 630 Z" fill="#1f7a45" opacity=".55"/>
  <path d="M250 380 L272 400 L262 398 L250 410 L240 398 L230 400 Z" fill="#ecfdf3" opacity=".8"/>
  <path d="M420 400 L440 418 L430 416 L420 426 L410 416 L400 418 Z" fill="#ecfdf3" opacity=".7"/>
  <path d="M0 575 L120 505 L210 548 L320 485 L430 545 L540 505 L700 570 L700 630 L0 630 Z" fill="#0b3a20" opacity=".75"/>

  <!-- brand -->
  <image x="56" y="44" width="58" height="58" xlink:href="data:image/png;base64,${logo}"/>
  <text x="128" y="70" font-family="Noto Sans Devanagari, Noto Sans" font-weight="700" font-size="28" fill="#ffffff">पहाड़ परीक्षा</text>
  <text x="128" y="98" font-family="Noto Sans Devanagari, Noto Sans" font-weight="400" font-size="19" fill="#bbf7d0">pahadpariksha.in</text>

  <!-- left column -->
  <rect x="56" y="140" rx="18" ry="18" width="268" height="40" fill="#c2410c"/>
  <text x="190" y="168" text-anchor="middle" font-family="Noto Sans Devanagari, Noto Sans" font-weight="700" font-size="21" fill="#ffffff">दैनिक करेंट अफेयर्स</text>
  <text x="56" y="250" font-family="Noto Sans Devanagari, Noto Sans" font-weight="700" font-size="54" fill="#ffffff">उत्तराखंड</text>
  <text x="56" y="316" font-family="Noto Sans Devanagari, Noto Sans" font-weight="700" font-size="54" fill="#ffffff">करेंट अफेयर्स</text>
  <text x="56" y="396" font-family="Noto Sans Devanagari, Noto Sans" font-weight="700" font-size="62" fill="#fde68a">${esc(dateHi)}</text>
  <text x="58" y="436" font-family="Noto Sans Devanagari, Noto Sans" font-weight="600" font-size="24" fill="#d1fae5">${esc(WEEKDAYS[d.getUTCDay()])} · UKSSSC · UKPSC</text>

  <!-- right card: today's topics -->
  <rect x="730" y="58" rx="22" ry="22" width="414" height="514" fill="url(#card)"/>
  <rect x="730" y="58" rx="22" ry="22" width="414" height="86" fill="#ecfdf3"/>
  <rect x="730" y="122" width="414" height="22" fill="#ecfdf3"/>
  <text x="760" y="104" font-family="Noto Sans Devanagari, Noto Sans" font-weight="700" font-size="26" fill="#14532d">आज के मुख्य विषय</text>
  <text x="760" y="132" font-family="Noto Sans Devanagari, Noto Sans" font-weight="400" font-size="17" fill="#57534e">${items.length} परीक्षा बिंदु${quizN ? ` · ${quizN} अभ्यास प्रश्न` : ''}</text>
  ${topics.map((t, i) => {
    const y = 196 + i * 78;
    return `<circle cx="776" cy="${y - 8}" r="17" fill="#14532d"/>
  <text x="776" y="${y - 1}" text-anchor="middle" font-family="Noto Sans Devanagari, Noto Sans" font-weight="700" font-size="19" fill="#ffffff">${i + 1}</text>
  <text x="806" y="${y}" font-family="Noto Sans Devanagari, Noto Sans" font-weight="600" font-size="23" fill="#1c1917">${esc(t)}</text>
  ${i < topics.length - 1 ? `<line x1="760" y1="${y + 32}" x2="1114" y2="${y + 32}" stroke="#e7e5e4" stroke-width="2"/>` : ''}`;
  }).join('\n  ')}
  <rect x="760" y="510" rx="12" ry="12" width="354" height="44" fill="#14532d"/>
  <text x="937" y="540" text-anchor="middle" font-family="Noto Sans Devanagari, Noto Sans" font-weight="700" font-size="20" fill="#ffffff">तथ्य · स्थायी GK · क्विज़ — हिंदी में</text>
</svg>`;

await mkdir(OUT, { recursive: true });
const name = `current-affairs-${latest}.jpg`;
for (const f of await readdir(OUT)) if (f.startsWith('current-affairs-') && f !== name) await unlink(OUT + f);
try {
  await writeFile(OUT + name, await sharp(Buffer.from(svg), { density: 72 }).jpeg({ quality: 86, mozjpeg: true }).toBuffer());
} catch (e) { // never block a deploy over the picture: fall back to the site's default share image
  console.error('og: render failed, using og-default.jpg —', e.message);
  await writeFile(OUT + name, await readFile(ROOT + 'public/og-default.jpg'));
}
console.log(`og: public/og/${name} (${items.length} points)`);
