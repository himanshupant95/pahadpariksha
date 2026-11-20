"""Geography ch.6–8 maps: IMD district rainfall normals, altitude climate zones, potential vegetation belts, protected areas.
Run: python3 geo_ch678.py [rain|zones|veg|pa]  → out/geo/<name>.svg/.png ; then `python3 geo_ch678.py webp` copies webp to public/."""
import sys, os
from geobase import *

WHAT = sys.argv[1:] or ['rain', 'zones', 'veg', 'pa', 'webp']
PL = places()
W = 1500
fr = Frame(uk.bounds, W, pad=20000); H = fr.h
TOWNS = [('Dehradun', 'देहरादून'), ('Haridwar', 'हरिद्वार'), ('Rishikesh', 'ऋषिकेश'), ('Mussoorie', 'मसूरी'), ('Uttarkashi', 'उत्तरकाशी'), ('Joshimath', 'जोशीमठ'),
         ('Nainital', 'नैनीताल'), ('Almora', 'अल्मोड़ा'), ('Pithoragarh', 'पिथौरागढ़'), ('Munsiyari', 'मुनस्यारी'), ('Haldwani', 'हल्द्वानी'), ('Rudrapur', 'रुद्रपुर'),
         ('Pauri', 'पौड़ी'), ('Kotdwar', 'कोटद्वार'), ('Tehri', 'टिहरी'), ('Bageshwar', 'बागेश्वर'), ('Champawat', 'चंपावत'), ('Mukteshwar', 'मुक्तेश्वर'), ('Pantnagar', 'पंतनगर')]

def towns(sel, size=13):
    out = []
    for en, hi in TOWNS:
        if en not in sel or en not in PL: continue
        x, y = fr.ll(*PL[en])
        out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="#111827" stroke="#fff" stroke-width="1.5"/>')
        out.append(text(x + 7, y - 6, hi, size, 600, '#111827', anchor='start', halo='#fff', halo_w=3))
    return out

def frame_extras(title, sub, legend):
    b = [title_box(16, 16, 640, 'उत्तराखंड', title, sub)]
    ly = H - 40 - 30 * len(legend)
    b.append(f'<rect x="{W-380}" y="{ly-36}" width="364" height="{30*len(legend)+46}" rx="10" fill="#fff" fill-opacity=".94" stroke="#cbd5e1"/>')
    b.append(text(W - 365, ly - 12, 'संकेत', 15, 700, '#0f172a', anchor='start', halo=None))
    for i, (col, lab) in enumerate(legend):
        y = ly + 30 * i
        b.append(f'<rect x="{W-365}" y="{y}" width="26" height="18" rx="3" fill="{col}" stroke="#475569" stroke-width=".6"/>')
        b.append(text(W - 330, y + 14, lab, 13, 500, '#1f2937', anchor='start', halo=None))
    b.append(scalebar(fr, 30, H - 66, 50, (0, 25, 50))); b.append(north_arrow(W - 50, 150, 1.0))
    return b

def credit(extra=''):
    return text(W - 12, H - 10, CREDIT + extra, 11, 400, '#334155', anchor='end', halo='#fff', halo_w=3)

# ---------- IMD district rainfall normals (1961–2010) ----------
RAIN = {'Almora': 965.9, 'Bageshwar': 1229.0, 'Chamoli': 1136.4, 'Champawat': 1513.9, 'Dehradun': 1632.1, 'Hardwar': 1202.9, 'Nainital': 1521.2,
        'Garhwal': 1040.1, 'Pithoragarh': 1775.4, 'Rudraprayag': 1546.2, 'Tehri Garhwal': 1216.7, 'Udham Singh Nagar': 1071.1, 'Uttarkashi': 1288.8}
RBINS = [(1100, '#dbeafe', '1,100 मिमी से कम'), (1300, '#93c5fd', '1,100–1,300 मिमी'), (1550, '#3b82f6', '1,300–1,550 मिमी'), (9999, '#1e3a8a', '1,550 मिमी से अधिक')]
if 'rain' in WHAT:
    relief = relief_b64(fr, W, H, mode='grey', quality=78, S=1)
    b = [f'<image href="data:image/jpeg;base64,{relief}" x="0" y="0" width="{W}" height="{H:.2f}" preserveAspectRatio="none"/>']
    for _, r in d.iterrows():
        v = RAIN[r.DISTRICT]; col = next(c for lim, c, _ in RBINS if v < lim)
        b.append(f'<path d="{fr.path(r.geometry)}" fill="{col}" fill-opacity=".82" stroke="#fff" stroke-width="1.6"/>')
    b += boundaries(fr, district_lines=False)
    for _, r in d.iterrows():
        p = r.geometry.representative_point(); x, y = fr.xy(p.x, p.y)
        v = RAIN[r.DISTRICT]; dark = v >= 1300
        b.append(text(x, y - 4, DIST_HI[r.DISTRICT], 14, 700, '#fff' if dark else '#0f172a', halo='#0f172a' if dark else '#fff', halo_w=3))
        b.append(text(x, y + 15, f'{v:,.0f} मिमी', 13, 600, '#fff' if dark else '#0f172a', halo='#0f172a' if dark else '#fff', halo_w=3))
    b += neighbours(fr)
    b += frame_extras('ज़िलेवार सामान्य वार्षिक वर्षा', 'IMD सामान्य (1961–2010) · राज्य औसत 1,326 मिमी · सर्वाधिक पिथौरागढ़, न्यूनतम अल्मोड़ा', [(c, l) for _, c, l in RBINS])
    b.append(credit(' · वर्षा: IMD "Climate of Uttarakhand"'))
    save('g06-district-rainfall', svg_doc(W, H, ''.join(b), 'उत्तराखंड ज़िलेवार सामान्य वार्षिक वर्षा (IMD 1961–2010)'), W, H)

# ---------- altitude-band maps ----------
def band_map(name, title, sub, bands, label_pts, alt):
    dem, t, px = dem_grid(fr, W, H, 1)
    hs = 0.5 * hillshade(dem, px, 315) + 0.3 * hillshade(dem, px, 270) + 0.2 * hillshade(dem, px, 0)
    inside = ~geometry_mask([uk.__geo_interface__], out_shape=dem.shape, transform=t)
    rgb = np.zeros(dem.shape + (3,), 'float32')
    for lo, hi, col, _ in bands:
        m = (dem >= lo) & (dem < hi)
        c = np.array([int(col[i:i+2], 16) for i in (1, 3, 5)], 'float32')
        rgb[m] = c
    rgb = rgb * (0.62 + 0.5 * hs)[..., None]
    gray = (222 + 30 * (hs - 0.5))[..., None].repeat(3, -1)
    rgb = np.where(inside[..., None], np.clip(rgb, 0, 255), gray)
    buf = io.BytesIO(); Image.fromarray(rgb.astype('uint8')).save(buf, 'JPEG', quality=82, optimize=True)
    img = base64.b64encode(buf.getvalue()).decode()
    # share of state area per band (equal-area UTM pixels)
    tot = inside.sum()
    shares = [(lab, 100 * ((dem >= lo) & (dem < hi) & inside).sum() / tot) for lo, hi, _, lab in bands]
    print(name, [(l, round(s, 1)) for l, s in shares])
    b = [f'<image href="data:image/jpeg;base64,{img}" x="0" y="0" width="{W}" height="{H:.2f}" preserveAspectRatio="none"/>']
    b += boundaries(fr, dstroke='#1f2937', dop=.35)
    b += towns({'Dehradun', 'Haridwar', 'Mussoorie', 'Uttarkashi', 'Joshimath', 'Nainital', 'Almora', 'Pithoragarh', 'Munsiyari', 'Haldwani', 'Rudrapur', 'Pauri', 'Tehri'})
    for lab, lon, lat in label_pts:
        x, y = fr.ll(lon, lat)
        b.append(text(x, y, lab, 15, 700, '#0f172a', halo='#fff', halo_w=4))
    b += neighbours(fr)
    leg = [(col, f'{lab} ({s:.0f}%)') for (lo, hi, col, lab), (_, s) in zip(bands, shares)]
    b += frame_extras(title, sub, leg)
    b.append(credit())
    save(name, svg_doc(W, H, ''.join(b), alt), W, H)
    return shares

if 'zones' in WHAT:
    ZB = [(-100, 900, '#65a30d', 'उपोष्ण/गर्म (900 मी तक)'), (900, 1800, '#d9c36a', 'गर्म शीतोष्ण (900–1,800)'), (1800, 3000, '#a16207', 'ठंडा शीतोष्ण (1,800–3,000)'),
          (3000, 4800, '#7c8aa6', 'उप-अल्पाइन/अल्पाइन (3,000–4,800)'), (4800, 9000, '#f8fafc', 'हिम/टुंड्रा (4,800 से ऊपर)')]
    band_map('g06-altitude-zones', 'ऊँचाई आधारित जलवायु क्षेत्र', 'SRTM ऊँचाई से सरलीकृत · सीमाएँ स्थूल; ढाल-दिशा व स्थानीय कारकों से बदलती हैं · % = राज्य क्षेत्रफल में हिस्सा',
             ZB, [('तराई-भाबर', 79.6, 28.92), ('गहरी नदी-घाटियाँ गर्म', 79.05, 30.42)], 'उत्तराखंड के ऊँचाई आधारित जलवायु क्षेत्र')

if 'veg' in WHAT:
    VB = [(-100, 1000, '#15803d', 'साल व उष्ण पर्णपाती (1,000 मी तक)'), (1000, 1800, '#84cc16', 'चीड़ (1,000–1,800)'), (1800, 3000, '#0b3d20', 'बाँज, देवदार, फ़र-स्प्रूस (1,800–3,000)'),
          (3000, 3600, '#0e7490', 'भोजपत्र, बुरांश झाड़ी (3,000–3,600)'), (3600, 4800, '#c4b56a', 'बुग्याल/अल्पाइन (3,600–4,800)'), (4800, 9000, '#f1f5f9', 'हिम-चट्टान, वनस्पति-विहीन')]
    band_map('g07-vegetation-belts', 'ऊँचाई के अनुसार संभावित वनस्पति पट्टियाँ', 'संभावित (potential) पट्टियाँ — वास्तविक वन-आवरण नहीं; ऊँचाई-सीमाएँ स्थूल व ढाल-दिशा से बदलती हैं',
             VB, [], 'उत्तराखंड की ऊँचाई के अनुसार संभावित वनस्पति पट्टियाँ')

# ---------- protected areas ----------
if 'pa' in WHAT:
    relief = relief_b64(fr, W, H, mode='grey', quality=78, S=1)
    b = [f'<image href="data:image/jpeg;base64,{relief}" x="0" y="0" width="{W}" height="{H:.2f}" preserveAspectRatio="none"/>']
    pa = osm_polys('osm-protected.json')
    NP = {'Gangotri National Park': 'गंगोत्री रा.उ.', 'Govind Pashu Vihar National Park': 'गोविंद रा.उ.', 'Jim Corbett National Park': 'कॉर्बेट रा.उ.',
          'Nanda Devi National Park': 'नंदा देवी रा.उ.', 'Rajaji National Park/Tiger Reserve': 'राजाजी रा.उ.', 'Valley of Flowers National Park': 'फूलों की घाटी रा.उ.'}
    WS = {'Askot Musk Deer Wildlife Sanctuary': 'अस्कोट अभयारण्य', 'Binsar WLS': 'बिनसर अभ.', 'Govind Pashu Vihar WLS': 'गोविंद अभयारण्य', 'Kedarnath WLS': 'केदारनाथ अभयारण्य',
          'Mussoorie WLS': 'मसूरी (बिनोग) अभ.', 'Sonanadi WLS': 'सोनानदी अभ.'}
    OFF = {'गंगोत्री रा.उ.': (0, 0), 'गोविंद रा.उ.': (-10, -18), 'गोविंद अभयारण्य': (-60, 26), 'कॉर्बेट रा.उ.': (40, 10), 'नंदा देवी रा.उ.': (40, 0), 'राजाजी रा.उ.': (-20, 30),
           'फूलों की घाटी रा.उ.': (-50, -26), 'अस्कोट अभयारण्य': (40, 10), 'बिनसर अभ.': (40, 4), 'केदारनाथ अभयारण्य': (-30, 30), 'मसूरी (बिनोग) अभ.': (-40, -22), 'सोनानदी अभ.': (-70, -10)}
    labs = []
    ctr = None
    for t, poly in pa:
        n = t.get('name')
        if n == 'Corbett Tiger Reserve': ctr = poly.intersection(uk)
    if ctr is not None and not ctr.is_empty:
        b.append(f'<path d="{fr.path(ctr)}" fill="none" stroke="#ea580c" stroke-width="2.4" stroke-dasharray="8 4"/>')
    for t, poly in pa:
        n = t.get('name')
        if n in WS:
            pp = poly.intersection(uk)
            b.append(f'<path d="{fr.path(pp)}" fill="#86efac" fill-opacity=".75" stroke="#15803d" stroke-width="1.2"/>'); labs.append((WS[n], pp))
    for t, poly in pa:
        n = t.get('name')
        if n in NP:
            pp = poly.intersection(uk)
            b.append(f'<path d="{fr.path(pp)}" fill="#15803d" fill-opacity=".78" stroke="#14532d" stroke-width="1.4"/>'); labs.append((NP[n], pp))
    b += boundaries(fr, dstroke='#334155', dop=.35)
    for lab, pp in labs:
        p = pp.representative_point(); x, y = fr.xy(p.x, p.y); ox, oy = OFF.get(lab, (0, 0))
        if ox or oy: b.append(f'<path d="M{x:.1f},{y:.1f} L{x+ox:.1f},{y+oy:.1f}" stroke="#14532d" stroke-width="1"/>')
        b.append(text(x + ox, y + oy + 5, lab, 13, 700, '#052e16', halo='#fff', halo_w=4))
    # not in OSM → approximate point markers
    PTS = [('नंधौर अभयारण्य*', 79.83, 29.18, 30, 4, '#86efac'), ('आसन संरक्षण आरक्षित (रामसर)*', 77.68, 30.43, 12, 30, '#38bdf8'),
           ('झिलमिल झील सं.आ.*', 78.24, 29.81, 14, 28, '#38bdf8'), ('पवलगढ़ सं.आ.*', 79.18, 29.32, -14, 30, '#38bdf8'), ('नैना देवी पक्षी सं.आ.*', 79.45, 29.42, -16, -18, '#38bdf8')]
    for lab, lo, la, ox, oy, col in PTS:
        x, y = fr.ll(lo, la)
        b.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="7" fill="{col}" stroke="#0f172a" stroke-width="1.4"/>')
        b.append(text(x + ox, y + oy, lab, 12.5, 700, '#0f172a', anchor='start' if ox >= 0 else 'end', halo='#fff', halo_w=4))
    b += neighbours(fr)
    leg = [('#15803d', 'राष्ट्रीय उद्यान (6)'), ('#86efac', 'वन्यजीव अभयारण्य (7)'), ('#38bdf8', 'संरक्षण आरक्षित (बिंदु)'), ('#ffffff', '- - कॉर्बेट टाइगर रिज़र्व सीमा')]
    b += frame_extras('संरक्षित क्षेत्र', 'सीमाएँ OpenStreetMap से (अधिसूचित मानचित्र नहीं) · * = अनुमानित स्थान-बिंदु', leg)
    b.append(credit())
    save('g08-protected-areas', svg_doc(W, H, ''.join(b), 'उत्तराखंड के राष्ट्रीय उद्यान, अभयारण्य और संरक्षण आरक्षित'), W, H)

if 'webp' in WHAT:
    pub = '../../public/maps/geo/'
    for n in ['g06-district-rainfall', 'g06-altitude-zones', 'g07-vegetation-belts', 'g08-protected-areas']:
        p = f'out/geo/{n}.png'
        if not os.path.exists(p): continue
        im = Image.open(p).convert('RGB')
        if im.width > 1600: im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
        im.save(pub + n + '.webp', 'WEBP', quality=80, method=6)
        im.resize((800, round(im.height * 800 / im.width)), Image.LANCZOS).save(pub + n + '-800.webp', 'WEBP', quality=78, method=6)
        print('webp', n, im.size)
