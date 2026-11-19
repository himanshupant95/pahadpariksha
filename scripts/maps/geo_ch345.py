"""Geography ch.3–5 maps: swath elevation profiles, river systems, blank rivers, Panch Prayag zoom, glaciers, interactive atlas."""
import sys
from geobase import *

PL = places()
DEM = rasterio.open(OSM + 'uk-dem-srtm90.tif')
DEMA = DEM.read(1).astype('float32')
def z_at(lon, lat):
    r, c = DEM.index(lon, lat)
    if 0 <= r < DEMA.shape[0] and 0 <= c < DEMA.shape[1]:
        v = DEMA[r, c]; return float(v) if v > -100 else float('nan')
    return float('nan')

FROM_UTM = Transformer.from_crs(CRS, 'EPSG:4326', always_xy=True)
WHAT = sys.argv[1:] or ['profiles', 'rivers', 'prayag', 'glaciers', 'atlas']

# ---------------- swath profiles ----------------
def swath(route, half=6000, step=500):
    pts = [TO_UTM.transform(lo, la) for _, lo, la in route]
    line = LineString(pts)
    out = []
    n = int(line.length // step)
    for i in range(n + 1):
        s = i * step
        p = line.interpolate(s); a = line.interpolate(max(s - 200, 0)); c = line.interpolate(min(s + 200, line.length))
        dx, dy = c.x - a.x, c.y - a.y; L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L, dx / L
        zs = []
        for k in np.linspace(-half, half, 25):
            lo, la = FROM_UTM.transform(p.x + nx * k, p.y + ny * k)
            zs.append(z_at(lo, la))
        zs = np.array(zs); zs = zs[~np.isnan(zs)]
        lo, la = FROM_UTM.transform(p.x, p.y)
        out.append((s / 1000, z_at(lo, la), zs.min(), zs.mean(), zs.max()))
    marks = [(nm, line.project(Point(*TO_UTM.transform(lo, la))) / 1000) for nm, lo, la in route]
    return out, marks

def profile_svg(name, title, sub, route, zones, ymax):
    prof, marks = swath(route)
    W, H = 1400, 560
    ml, mr, mt, mb = 70, 24, 120, 70
    X = lambda km: ml + km / prof[-1][0] * (W - ml - mr)
    Y = lambda z: mt + (1 - z / ymax) * (H - mt - mb)
    b = [f'<rect width="{W}" height="{H}" fill="#fff"/>']
    # zone bands
    for i, (k0, k1, lab, col) in enumerate(zones):
        b.append(f'<rect x="{X(k0):.1f}" y="{mt-34}" width="{X(k1)-X(k0):.1f}" height="{H-mb-mt+34}" fill="{col}" opacity=".16"/>')
        b.append(f'<rect x="{X(k0):.1f}" y="{mt-34}" width="{X(k1)-X(k0):.1f}" height="26" fill="{col}" opacity=".85"/>')
        b.append(text((X(k0) + X(k1)) / 2, mt - 15, lab, 13 if X(k1) - X(k0) > 110 else 10, 700, '#fff', halo=None))
    # grid
    for z in range(0, ymax + 1, 1000):
        b.append(f'<line x1="{ml}" x2="{W-mr}" y1="{Y(z):.1f}" y2="{Y(z):.1f}" stroke="#e2e8f0"/>' + text(ml - 8, Y(z) + 4, f'{z:,}', 12, 400, '#475569', anchor='end', halo=None))
    km_step = 20 if prof[-1][0] > 150 else 10
    for k in range(0, int(prof[-1][0]) + 1, km_step):
        b.append(f'<line x1="{X(k):.1f}" x2="{X(k):.1f}" y1="{H-mb}" y2="{H-mb+6}" stroke="#475569"/>' + text(X(k), H - mb + 22, k, 12, 400, '#475569', halo=None))
    b.append(text(W / 2, H - 14, 'दूरी (किमी) →', 13, 600, '#334155', halo=None))
    b.append(f'<text x="18" y="{(mt + H - mb) / 2:.0f}" font-size="13" font-weight="600" fill="#334155" transform="rotate(-90 18 {(mt + H - mb) / 2:.0f})" text-anchor="middle">ऊँचाई (मीटर)</text>')
    top = 'M' + 'L'.join(f'{X(p[0]):.1f},{Y(p[4]):.1f}' for p in prof)
    bot = 'L'.join(f'{X(p[0]):.1f},{Y(p[2]):.1f}' for p in reversed(prof))
    b.append(f'<path d="{top}L{bot}Z" fill="#cbd5e1" opacity=".55"/>')
    mean = 'M' + f'{X(prof[0][0]):.1f},{Y(0):.1f}L' + 'L'.join(f'{X(p[0]):.1f},{Y(p[3]):.1f}' for p in prof) + f'L{X(prof[-1][0]):.1f},{Y(0):.1f}Z'
    b.append(f'<path d="{mean}" fill="#a16207" fill-opacity=".55" stroke="#713f12" stroke-width="1.6"/>')
    b.append('<path d="M' + 'L'.join(f'{X(p[0]):.1f},{Y(p[4]):.1f}' for p in prof) + '" fill="none" stroke="#334155" stroke-width="1" stroke-dasharray="3 3"/>')
    for (nm, km), (_, lo, la) in zip(marks, route):
        zz = z_at(lo, la)
        x = X(km)
        b.append(f'<line x1="{x:.1f}" x2="{x:.1f}" y1="{Y(zz):.1f}" y2="{H-mb}" stroke="#111827" stroke-width="1" stroke-dasharray="2 3"/>')
        b.append(f'<circle cx="{x:.1f}" cy="{Y(zz):.1f}" r="4" fill="#111827"/>')
        b.append(f'<text x="{x+4:.1f}" y="{H-mb-8}" font-size="12.5" font-weight="700" fill="#111827" transform="rotate(-90 {x+4:.1f} {H-mb-8})" stroke="#fff" stroke-width="3" paint-order="stroke">{esc(nm)}</text>')
    b.append(text(ml, 30, title, 22, 700, '#14532d', anchor='start', halo=None))
    b.append(text(ml, 54, sub, 13.5, 400, '#475569', anchor='start', halo=None))
    lg = [('#a16207', 'औसत धरातल (मार्ग के ±6 किमी चौड़ाई में)'), ('#cbd5e1', 'न्यूनतम–अधिकतम ऊँचाई (घाटी से चोटी)')]
    for i, (c, t) in enumerate(lg):
        b.append(f'<rect x="{W-470}" y="{20+i*22}" width="22" height="13" fill="{c}" opacity=".8"/>' + text(W - 440, 31 + i * 22, t, 12.5, 400, '#334155', anchor='start', halo=None))
    b.append(text(W - 12, H - 4, 'pahadpariksha.in · ऊँचाई: NASA SRTM (90 मी.) · क्षेत्र-विभाजन सरलीकृत व अनुमानित', 10.5, 400, '#64748b', anchor='end', halo=None))
    save(name, svg_doc(W, H, ''.join(b), title), W, H)
    return prof, marks

if 'profiles' in WHAT:
    kum = [('रुद्रपुर', 79.40, 28.98), ('हल्द्वानी', 79.51, 29.22), ('नैनीताल', 79.46, 29.39), ('अल्मोड़ा', 79.66, 29.60), ('बागेश्वर', 79.77, 29.84),
           ('मुनस्यारी', 80.24, 30.07), ('मिलम', 80.15, 30.43), ('मिलम हिमनद', 80.07, 30.52)]
    prof, marks = swath(kum)
    mk = dict(marks)
    zones = [(0, mk['हल्द्वानी'] - 4, 'तराई', '#65a30d'), (mk['हल्द्वानी'] - 4, mk['हल्द्वानी'] + 2, 'भाबर', '#a3a33a'),
             (mk['हल्द्वानी'] + 2, mk['हल्द्वानी'] + 9, 'शिवालिक', '#ca8a04'), (mk['हल्द्वानी'] + 9, mk['मुनस्यारी'] + 3, 'लघु हिमालय (हिमाचल)', '#b45309'),
             (mk['मुनस्यारी'] + 3, mk['मिलम हिमनद'], 'वृहत हिमालय (हिमाद्रि)', '#64748b')]
    profile_svg('g03-profile-kumaon', 'कुमाऊँ का अनुप्रस्थ परिच्छेद: रुद्रपुर से मिलम हिमनद तक', 'दक्षिण (मैदान) → उत्तर (हिमनद) · मार्ग के साथ धरातल की ऊँचाई; MBT हल्द्वानी के उत्तर, MCT (मुनस्यारी थ्रस्ट) मुनस्यारी के पास', kum, zones, 6000)
    gar = [('हरिद्वार', 78.164, 29.945), ('ऋषिकेश', 78.27, 30.09), ('देवप्रयाग', 78.599, 30.146), ('श्रीनगर', 78.78, 30.22), ('रुद्रप्रयाग', 78.98, 30.285),
           ('कर्णप्रयाग', 79.22, 30.26), ('चमोली', 79.33, 30.40), ('जोशीमठ', 79.565, 30.555), ('बद्रीनाथ', 79.493, 30.744), ('माणा', 79.497, 30.773), ('माणा दर्रा', 79.42, 31.07)]
    prof, marks = swath(gar)
    mk = dict(marks)
    zones = [(0, mk['हरिद्वार'] + 3, 'मैदान', '#65a30d'), (mk['हरिद्वार'] + 3, mk['ऋषिकेश'] + 2, 'शिवालिक', '#ca8a04'),
             (mk['ऋषिकेश'] + 2, mk['जोशीमठ'] - 6, 'लघु हिमालय (हिमाचल)', '#b45309'), (mk['जोशीमठ'] - 6, mk['माणा'] + 4, 'वृहत हिमालय', '#64748b'),
             (mk['माणा'] + 4, mk['माणा दर्रा'], 'टेथिस हिमालय', '#7c3aed')]
    profile_svg('g03-profile-garhwal', 'गढ़वाल का अनुप्रस्थ परिच्छेद: हरिद्वार से माणा दर्रे तक (अलकनंदा घाटी)', 'मार्ग नदी-घाटी के साथ है, इसलिए मार्ग की ऊँचाई कम और ±6 किमी की चोटियाँ ऊँची दिखती हैं · MCT जोशीमठ-हेलंग के पास', gar, zones, 7000)
    for nm, lo, la in gar + kum:
        print(nm, round(z_at(lo, la)))

# ---------------- rivers by system ----------------
def classify_rivers(view):
    rivers = osm_lines('osm-rivers.json')
    out = {k: [] for k in SYS}; minor = []
    for t, g in rivers:
        if not g.intersects(view): continue
        k = riv_key(t)
        if not k: minor.append(g); continue
        hi, s = k
        lon = FROM_UTM.transform(g.centroid.x, g.centroid.y)[0]
        if s == 'ram' and hi == 'रामगंगा' and lon > 79.85: s = 'kal'; hi = 'रामगंगा (पूर्वी)'
        lat = FROM_UTM.transform(g.centroid.x, g.centroid.y)[1]
        if s == 'ala' and lon > 80.05: s = 'kal'
        if s == 'kal' and lon < 79.2: minor.append(g); continue   # Kali Nadi (west UP) etc.
        if s == 'gan' and hi == 'गंगा' and not (lat < 30.2 and lon < 78.62):
            s = 'yam' if lon < 78.0 else 'bha' if (lon < 78.95 and lat > 30.15) else 'kal' if lon > 79.9 else 'ala' if lat > 30.0 else 'ram'
            hi = '—'
        out[s].append((hi, g))
    return out, minor

if 'rivers' in WHAT:
    W = 1600
    fr = Frame(uk.bounds, W, pad=22000); H = fr.h
    view = box(fr.minx, fr.maxy - H / fr.k, fr.minx + W / fr.k, fr.maxy)
    relief = relief_b64(fr, W, H, mode='grey', quality=80, S=1)
    sysr, minor = classify_rivers(view)
    base = [f'<rect width="{W}" height="{H:.0f}" fill="#e9edf0"/>', f'<image href="data:image/jpeg;base64,{relief}" x="0" y="0" width="{W}" height="{H:.2f}" preserveAspectRatio="none"/>']
    mn = unary_union(minor).intersection(ukb)
    base.append(f'<path d="{fr.path(mn)}" fill="none" stroke="#64748b" stroke-width=".6" stroke-opacity=".55"/>')
    base += boundaries(fr, dstroke='#475569', dop=.35)
    lines = []
    for s, items in sysr.items():
        col = SYS[s][1]
        g = unary_union([x[1] for x in items]).intersection(view)
        lines.append(f'<path d="{fr.path(g.difference(ukb))}" fill="none" stroke="{col}" stroke-width="1.4" stroke-opacity=".55"/>')
        lines.append(f'<path d="{fr.path(g.intersection(ukb))}" fill="none" stroke="{col}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>')
    def lab_at(hi, lon, lat, s, disp=None, size=14):
        x0, y0 = TO_UTM.transform(lon, lat); p = Point(x0, y0); best = None
        for hh, g in sysr[s]:
            if hh != hi: continue
            dd = g.distance(p)
            if best is None or dd < best[0]: best = (dd, g)
        if best is None or best[0] > 15000: print('miss', hi); return ''
        g = best[1]; sp = g.project(p)
        a, c = g.interpolate(max(sp - 2500, 0)), g.interpolate(min(sp + 2500, g.length))
        (ax, ay), (cx, cy) = fr.xy(a.x, a.y), fr.xy(c.x, c.y)
        ang = math.degrees(math.atan2(cy - ay, cx - ax)); ang = ang - 180 if ang > 90 else ang + 180 if ang < -90 else ang
        mx, my = fr.xy(*g.interpolate(sp).coords[0])
        return f'<g transform="translate({mx:.1f},{my:.1f}) rotate({ang:.1f})">' + text(0, -5, disp or hi, size, 700, SYS[s][1], halo='#fff', halo_w=3.8, extra='font-style="italic"') + '</g>'
    LAB = [('यमुना', 78.12, 30.66, 'yam'), ('टोंस', 77.88, 30.93, 'yam'), ('भागीरथी', 78.62, 30.86, 'bha'), ('भिलंगना', 78.70, 30.50, 'bha'), ('अलकनंदा', 79.43, 30.43, 'ala'),
           ('मंदाकिनी', 79.03, 30.47, 'ala'), ('पिंडर', 79.55, 30.07, 'ala'), ('नंदाकिनी', 79.47, 30.27, 'ala'), ('धौलीगंगा', 79.75, 30.62, 'ala'), ('गंगा', 78.22, 30.03, 'gan'),
           ('नयार', 78.95, 29.98, 'gan'), ('रामगंगा', 79.08, 29.72, 'ram'), ('कोसी', 79.36, 29.52, 'ram'), ('सरयू', 79.88, 29.70, 'kal'), ('गोरी गंगा', 80.25, 30.08, 'kal'),
           ('काली', 80.68, 29.78, 'kal'), ('काली', 80.95, 30.08, 'kal'), ('रामगंगा (पूर्वी)', 80.05, 29.92, 'kal'), ('गौला', 79.53, 29.25, 'ram'), ('आसन', 77.85, 30.42, 'yam'), ('लधिया', 79.95, 29.32, 'kal')]
    labs = [lab_at(hi, lo, la, s) for hi, lo, la, s in LAB]
    pts = []
    for nm, lo, la in PRAYAG:
        x, y = fr.ll(lo, la); pts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4.5" fill="#facc15" stroke="#1d4ed8" stroke-width="2"/>')
    conf = [('कालसी (टोंस+यमुना)', 77.85, 30.52, 'end'), ('पंचेश्वर (सरयू+काली)', 80.25, 29.43, 'start'), ('जौलजीबी (गोरी+काली)', 80.38, 29.75, 'start'), ('तवाघाट (धौली+काली)', 80.60, 29.96, 'start'), ('टनकपुर — काली "शारदा" बनती है', 80.11, 29.07, 'end')]
    for nm, lo, la, anc in conf:
        x, y = fr.ll(lo, la)
        pts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="#fff" stroke="#111827" stroke-width="2"/>' + text(x + (8 if anc == 'start' else -8), y + 4, nm, 12, 600, '#111827', anchor=anc, halo='#fff', halo_w=3))
    tl = [title_box(18, 18, 520, 'उत्तराखंड', 'नदी तंत्र', 'हर रंग = एक नदी तंत्र; पीले बिंदु = पंच प्रयाग')]
    lx, ly = W - 360, H - 300
    lg = [f'<rect x="{lx}" y="{ly}" width="342" height="270" rx="10" fill="#fff" fill-opacity=".95" stroke="#cbd5e1"/>' + text(lx + 16, ly + 30, 'नदी तंत्र', 17, 700, '#0f172a', anchor='start', halo=None)]
    for i, (s, (lab, col)) in enumerate(SYS.items()):
        yy = ly + 56 + i * 26
        lg.append(f'<path d="M{lx+16},{yy} h34" stroke="{col}" stroke-width="3.5"/>' + text(lx + 60, yy + 5, lab, 13.5, 400, '#1f2937', anchor='start', halo=None))
    yy = ly + 56 + 6 * 26
    lg.append(f'<path d="M{lx+16},{yy} h34" stroke="#64748b" stroke-width="1"/>' + text(lx + 60, yy + 5, 'अन्य छोटी नदियाँ / गाड़-गधेरे', 13.5, 400, '#1f2937', anchor='start', halo=None))
    lg.append(f'<circle cx="{lx+33}" cy="{yy+26}" r="4.5" fill="#facc15" stroke="#1d4ed8" stroke-width="2"/>' + text(lx + 60, yy + 31, 'पंच प्रयाग (अलकनंदा पर)', 13.5, 400, '#1f2937', anchor='start', halo=None))
    tail = [scalebar(fr, 34, H - 72, 50, (0, 25, 50)), north_arrow(W - 60, 160, 1.1), text(W - 14, H - 12, CREDIT, 11, 400, '#475569', anchor='end', halo='#fff', halo_w=3)]
    save('g04-river-systems', svg_doc(W, H, ''.join(base + lines + pts + labs + neighbours(fr) + tl + lg + tail), 'उत्तराखंड के नदी तंत्र — यमुना, भागीरथी, अलकनंदा, गंगा, रामगंगा, काली'), W, H)
    # blank practice: numbered markers on rivers, no names
    nums = [('यमुना', 78.12, 30.66, 'yam'), ('टोंस', 77.88, 30.93, 'yam'), ('भागीरथी', 78.62, 30.86, 'bha'), ('अलकनंदा', 79.43, 30.43, 'ala'), ('मंदाकिनी', 79.03, 30.47, 'ala'),
            ('पिंडर', 79.55, 30.07, 'ala'), ('रामगंगा', 79.08, 29.72, 'ram'), ('कोसी', 79.36, 29.52, 'ram'), ('सरयू', 79.88, 29.70, 'kal'), ('गोरी गंगा', 80.25, 30.08, 'kal'), ('काली', 80.68, 29.78, 'kal'), ('धौलीगंगा', 79.75, 30.62, 'ala')]
    blank = [f'<rect width="{W}" height="{H:.0f}" fill="#f8fafc"/>']
    blank.append(f'<path d="{fr.path(uk)}" fill="#fff" stroke="none"/>')
    blank.append(f'<path d="{fr.path(mn)}" fill="none" stroke="#94a3b8" stroke-width=".6"/>')
    for s, items in sysr.items():
        g = unary_union([x[1] for x in items]).intersection(ukb)
        blank.append(f'<path d="{fr.path(g)}" fill="none" stroke="#1d6fb8" stroke-width="2.4" stroke-linejoin="round"/>')
    blank += boundaries(fr, dstroke='#64748b', dop=.5)
    for i, (hi, lo, la, s) in enumerate(nums, 1):
        x0, y0 = TO_UTM.transform(lo, la); best = min(((g.distance(Point(x0, y0)), g) for hh, g in sysr[s] if hh == hi), key=lambda z: z[0])
        q = best[1].interpolate(best[1].project(Point(x0, y0))); x, y = fr.xy(q.x, q.y)
        blank.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="15" fill="#b91c1c" stroke="#fff" stroke-width="2"/>' + text(x, y + 6, i, 16, 700, '#fff', halo=None))
    blank.append(title_box(18, 18, 470, 'अभ्यास मानचित्र', '', 'लाल संख्या वाली नदियों को पहचानिए (उत्तर नीचे)'))
    blank.append(north_arrow(W - 60, 160, 1.1)); blank.append(text(W - 14, H - 12, CREDIT, 11, 400, '#475569', anchor='end'))
    save('g04-rivers-blank', svg_doc(W, H, ''.join(blank), 'उत्तराखंड की नदियों का रिक्त अभ्यास मानचित्र'), W, H)
    print('BLANK', [n[0] for n in nums])

# ---------------- Panch Prayag zoom ----------------
if 'prayag' in WHAT:
    x0, y0 = TO_UTM.transform(78.45, 30.02); x1, y1 = TO_UTM.transform(79.75, 30.86)
    W = 1500
    fr = Frame((x0, y0, x1, y1), W, pad=0); H = fr.h
    view = box(x0, y0, x1, y1)
    relief = relief_b64(fr, W, H, mode='color', quality=82, S=1)
    sysr, minor = classify_rivers(view)
    b = [f'<image href="data:image/jpeg;base64,{relief}" x="0" y="0" width="{W}" height="{H:.2f}" preserveAspectRatio="none"/>']
    mn = unary_union(minor).intersection(view)
    b.append(f'<path d="{fr.path(mn)}" fill="none" stroke="#3b82c4" stroke-width=".8" stroke-opacity=".7"/>')
    for s, items in sysr.items():
        g = unary_union([x[1] for x in items]).intersection(view)
        b.append(f'<path d="{fr.path(g)}" fill="none" stroke="#1d6fb8" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>')
    for _, r in d.iterrows():
        b.append(f'<path d="{fr.path(r.geometry)}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.1" stroke-dasharray="5 4"/>')
    def lab2(hi, lon, lat, s, size=17):
        x0_, y0_ = TO_UTM.transform(lon, lat); p = Point(x0_, y0_)
        c = [(g.distance(p), g) for hh, g in sysr[s] if hh == hi]
        if not c: print('miss', hi); return ''
        dd, g = min(c, key=lambda z: z[0]); sp = g.project(p)
        a, cc = g.interpolate(max(sp - 2500, 0)), g.interpolate(min(sp + 2500, g.length))
        (ax, ay), (cx, cy) = fr.xy(a.x, a.y), fr.xy(cc.x, cc.y)
        ang = math.degrees(math.atan2(cy - ay, cx - ax)); ang = ang - 180 if ang > 90 else ang + 180 if ang < -90 else ang
        mx, my = fr.xy(*g.interpolate(sp).coords[0])
        return f'<g transform="translate({mx:.1f},{my:.1f}) rotate({ang:.1f})">' + text(0, -6, hi, size, 700, '#0b4f8a', halo='#fff', halo_w=4, extra='font-style="italic"') + '</g>'
    for a in [('अलकनंदा', 79.50, 30.68, 'ala'), ('अलकनंदा', 79.10, 30.27, 'ala'), ('अलकनंदा', 78.80, 30.23, 'ala'), ('धौलीगंगा', 79.70, 30.60, 'ala'), ('नंदाकिनी', 79.42, 30.30, 'ala'),
              ('पिंडर', 79.40, 30.12, 'ala'), ('मंदाकिनी', 79.02, 30.50, 'ala'), ('भागीरथी', 78.53, 30.30, 'bha'), ('गंगा', 78.50, 30.08, 'gan'), ('विष्णुगंगा', 79.52, 30.70, 'ala')]:
        b.append(lab2(*a))
    info = {'विष्णुप्रयाग': 'अलकनंदा (विष्णुगंगा) + धौलीगंगा', 'नंदप्रयाग': 'अलकनंदा + नंदाकिनी', 'कर्णप्रयाग': 'अलकनंदा + पिंडर',
            'रुद्रप्रयाग': 'अलकनंदा + मंदाकिनी', 'देवप्रयाग': 'अलकनंदा + भागीरथी = गंगा'}
    offs = {'विष्णुप्रयाग': (-16, 34, 'end'), 'नंदप्रयाग': (14, -14, 'start'), 'कर्णप्रयाग': (10, 30, 'start'), 'रुद्रप्रयाग': (-14, -18, 'end'), 'देवप्रयाग': (14, 26, 'start')}
    for i, (nm, lo, la) in enumerate(reversed(PRAYAG), 1):
        x, y = fr.ll(lo, la); rr, cc_ = DEM.index(lo, la); z = float(DEMA[rr-4:rr+5, cc_-4:cc_+5].min())
        ox, oy, anc = offs[nm]
        b.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="11" fill="#facc15" stroke="#1d4ed8" stroke-width="3"/>' + text(x, y + 5, i, 13, 700, '#1e3a8a', halo=None))
        b.append(text(x + ox, y + oy, f'{i}. {nm}', 18, 700, '#1e3a8a', anchor=anc, halo='#fff', halo_w=4.5))
        b.append(text(x + ox, y + oy + 20, f'{info[nm]} · ~{int(round(z, -1))} मी.', 13.5, 600, '#334155', anchor=anc, halo='#fff', halo_w=4))
        print(nm, round(z))
    for en, hi in (('Joshimath', 'जोशीमठ'), ('Gopeshwar', 'गोपेश्वर'), ('Srinagar', 'श्रीनगर'), ('Badrinath', 'बद्रीनाथ'), ('Kedarnath', 'केदारनाथ'), ('Tehri', 'टिहरी')):
        if en in PL:
            x, y = fr.ll(*PL[en]); b.append(f'<rect x="{x-4:.1f}" y="{y-4:.1f}" width="8" height="8" fill="#111827" stroke="#fff"/>' + text(x + 9, y + 5, hi, 13, 600, '#111827', anchor='start', halo='#fff', halo_w=3))
        else: print('town miss', en)
    b.append(title_box(16, 16, 540, 'पंच प्रयाग', 'अलकनंदा के पाँच संगम', 'ऊपर से नीचे का क्रम: 1 → 5 · ऊँचाई: SRTM से अनुमानित'))
    b.append(scalebar(fr, 30, H - 50, 20, (0, 10, 20))); b.append(north_arrow(W - 50, 70, 1.0))
    b.append(text(W - 12, H - 10, 'pahadpariksha.in · © OpenStreetMap contributors (ODbL) · ऊँचाई: NASA SRTM', 11, 400, '#334155', anchor='end', halo='#fff', halo_w=3))
    save('g04-panch-prayag', svg_doc(W, H, ''.join(b), 'पंच प्रयाग — अलकनंदा के पाँच संगम'), W, H)

# ---------------- glaciers ----------------
if 'glaciers' in WHAT:
    x0, y0 = TO_UTM.transform(78.25, 29.95); x1, y1 = TO_UTM.transform(81.10, 31.50)
    W = 1600
    fr = Frame((x0, y0, x1, y1), W, pad=0); H = fr.h
    view = box(x0, y0, x1, y1)
    relief = relief_b64(fr, W, H, mode='grey', quality=80, S=1)
    gl = osm_polys('osm-glaciers.json')
    sysr, minor = classify_rivers(view)
    b = [f'<image href="data:image/jpeg;base64,{relief}" x="0" y="0" width="{W}" height="{H:.2f}" preserveAspectRatio="none"/>']
    area = 0
    for t, g in gl:
        gg = g.intersection(view)
        if gg.is_empty: continue
        if g.intersects(uk): area += g.intersection(uk).area
        b.append(f'<path d="{fr.path(gg)}" fill="#e0f2fe" stroke="#0369a1" stroke-width=".6"/>')
    for s, items in sysr.items():
        g = unary_union([x[1] for x in items]).intersection(view)
        b.append(f'<path d="{fr.path(g)}" fill="none" stroke="#1d6fb8" stroke-width="2" stroke-opacity=".85"/>')
    b += boundaries(fr, dstroke='#475569', dop=.3)
    want = [('Gangotri Glacier', 'गंगोत्री (भागीरथी)'), ('Chaturangi Glacier', 'चतुरंगी'), ('Satopanth Glacier', 'सतोपंथ (अलकनंदा)'), ('Bhagirath Kharak Glacier', 'भागीरथ खरक (अलकनंदा)'),
            ('Chorabari Glacier', 'चोराबाड़ी (मंदाकिनी)'), ('Milam Glacier', 'मिलम (गोरी गंगा)'), ('Pindar Glacier', 'पिंडारी (पिंडर)'), ('Kaphni Glacier', 'कफनी'),
            ('Uttari Nanda Devi Glacier', 'उत्तरी नंदा देवी'), ('Dakshini Nanda Devi Glacier', 'दक्षिणी नंदा देवी'), ('Bagini Glacier', 'बागिनी'), ('Arwa Glacier', 'अरवा'),
            ('Bandarpunch Bamak Glacier', 'बंदरपूँछ बामक'), ('Kedar Bamak', 'केदार बामक'), ('Ralam', 'रालम'), ('Panchchuli', 'पंचचूली'), ('Tipra Bamak Glacier', 'टिपरा बामक'), ('Meola Glacier', 'मेओला'), ('Sona Glacier', 'सोना')]
    offs = {'Gangotri Glacier': (-150, 6), 'Chaturangi Glacier': (-30, -44), 'Satopanth Glacier': (30, -46), 'Bhagirath Kharak Glacier': (60, 56), 'Chorabari Glacier': (-110, 64),
            'Milam Glacier': (60, 10), 'Pindar Glacier': (-60, 22), 'Kaphni Glacier': (50, 26), 'Uttari Nanda Devi Glacier': (0, -26), 'Dakshini Nanda Devi Glacier': (10, 30),
            'Bagini Glacier': (-30, -22), 'Arwa Glacier': (40, -40), 'Bandarpunch Bamak Glacier': (-30, 30), 'Kedar Bamak': (-110, -46), 'Tipra Bamak Glacier': (40, -20), 'Meola Glacier': (60, 0), 'Sona Glacier': (60, 10)}
    found = set()
    for t, g in gl:
        n = t.get('name:en') or t.get('name')
        for en, hi in want:
            if n == en and en not in found:
                found.add(en)
                p = g.representative_point(); x, y = fr.xy(p.x, p.y); ox, oy = offs.get(en, (30, 20))
                b.append(f'<path d="M{x:.1f},{y:.1f} L{x+ox:.1f},{y+oy:.1f}" stroke="#0c4a6e" stroke-width="1"/><circle cx="{x:.1f}" cy="{y:.1f}" r="3" fill="#0c4a6e"/>')
                b.append(text(x + ox, y + oy + (12 if oy > 0 else -4), hi, 14, 700, '#0c4a6e', anchor='middle', halo='#fff', halo_w=4))
    print('glaciers labelled', sorted(found), 'missing', [w for w, _ in want if w not in found])
    print('OSM glacier area in UK km2', round(area / 1e6))
    for nm, lo, la, h, anc in PEAKS:
        x, y = fr.ll(lo, la)
        b.append(f'<path d="M{x:.1f},{y-7:.1f} L{x+6.5:.1f},{y+4.5:.1f} L{x-6.5:.1f},{y+4.5:.1f}Z" fill="#7c2d12" stroke="#fff" stroke-width="1.3"/>')
        b.append(text(x + (9 if anc == 'start' else -9), y + 4, nm, 12, 600, '#3b1d0f', anchor=anc, halo='#fff', halo_w=3))
    b.append(title_box(16, 16, 560, 'उत्तराखंड', 'हिमनद (ग्लेशियर)', 'हल्के नीले क्षेत्र = हिमनद (OpenStreetMap मानचित्रण) · प्रमुख हिमनद नामित'))
    b.append(scalebar(fr, 30, H - 50, 50, (0, 25, 50))); b.append(north_arrow(W - 50, 80, 1.0))
    b.append(text(W - 12, H - 10, CREDIT, 11, 400, '#334155', anchor='end', halo='#fff', halo_w=3))
    save('g05-glaciers', svg_doc(W, H, ''.join(b), 'उत्तराखंड के प्रमुख हिमनद'), W, H)
