"""Geography ch.1 maps: India locator, extent/graticule/boundaries, blank numbered districts."""
import sys
from geobase import *
from pyproj import Transformer

# ---------- 1. India locator ----------
LCC = 'EPSG:7755'  # India NSF LCC
ind = states.to_crs(LCC)
ukL = ind[ind.ST_NM == 'Uttarakhand'].geometry.union_all()
W = 900
fr = Frame(ind.total_bounds, W, pad=60000)
H = fr.h
tl = Transformer.from_crs('EPSG:4326', LCC, always_xy=True)
b = [f'<rect width="{W}" height="{H:.0f}" fill="#eef4f8"/>']
for _, r in ind.iterrows():
    fill = '#16a34a' if r.ST_NM == 'Uttarakhand' else '#fbfaf5'
    b.append(f'<path d="{fr.path(r.geometry)}" fill="{fill}" stroke="#94a3b8" stroke-width=".7"/>')
b.append(f'<path d="{fr.path(ind.geometry.union_all())}" fill="none" stroke="#475569" stroke-width="1.3"/>')
# tropic of cancer + graticule labels
for lat in (10, 20, 30):
    pts = [tl.transform(lo, lat) for lo in range(66, 100)]
    b.append('<path d="M' + 'L'.join(f'{fr.xy(x, y)[0]:.1f},{fr.xy(x, y)[1]:.1f}' for x, y in pts) + '" fill="none" stroke="#64748b" stroke-width=".6" stroke-dasharray="3 4" opacity=".7"/>')
    x, y = fr.xy(*tl.transform(67.2, lat)); b.append(text(max(x, 8), y - 4, f'{lat}° उ.', 12, 600, '#475569', anchor='start'))
pts = [tl.transform(lo, 23.44) for lo in range(66, 100)]
b.append('<path d="M' + 'L'.join(f'{fr.xy(x, y)[0]:.1f},{fr.xy(x, y)[1]:.1f}' for x, y in pts) + '" fill="none" stroke="#b45309" stroke-width="1" stroke-dasharray="8 4"/>')
x, y = fr.xy(*tl.transform(96.0, 23.44)); b.append(text(x, y - 6, 'कर्क रेखा', 13, 600, '#b45309', anchor='end'))
for lon in (70, 80, 90):
    pts = [tl.transform(lon, la) for la in range(6, 38)]
    b.append('<path d="M' + 'L'.join(f'{fr.xy(x, y)[0]:.1f},{fr.xy(x, y)[1]:.1f}' for x, y in pts) + '" fill="none" stroke="#64748b" stroke-width=".6" stroke-dasharray="3 4" opacity=".7"/>')
    x, y = fr.xy(*tl.transform(lon, 7.2)); b.append(text(x + 4, y, f'{lon}° पू.', 12, 600, '#475569', anchor='start'))
cx, cy = fr.xy(ukL.centroid.x, ukL.centroid.y)
b.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="34" fill="none" stroke="#dc2626" stroke-width="2.5"/>')
b.append(f'<path d="M{cx+30:.1f},{cy-18:.1f} L{cx+120:.1f},{cy-70:.1f}" stroke="#dc2626" stroke-width="2"/>')
b.append(text(cx + 124, cy - 70, 'उत्तराखंड', 24, 700, '#14532d', anchor='start'))
b.append(text(cx + 124, cy - 46, '53,483 वर्ग किमी · भारत का 1.6%', 14, 600, '#334155', anchor='start'))
dx, dy = fr.xy(*tl.transform(77.21, 28.61)); b.append(f'<circle cx="{dx:.1f}" cy="{dy:.1f}" r="4" fill="#111827"/>' + text(dx - 7, dy + 4, 'नई दिल्ली', 12, 600, '#111827', anchor='end'))
b.append(f'<g><rect x="18" y="18" width="330" height="72" rx="10" fill="#fff" fill-opacity=".95" stroke="#cbd5e1"/>' + text(34, 50, 'भारत में उत्तराखंड', 24, 700, '#14532d', anchor='start', halo=None) + text(34, 76, 'उत्तर भारत, मध्य हिमालय', 15, 400, '#475569', anchor='start', halo=None) + '</g>')
b.append(north_arrow(W - 50, 70, 1.0))
b.append(text(W - 12, H - 12, 'pahadpariksha.in · राज्य सीमाएँ: भारतीय सर्वेक्षण विभाग आधारित (DataMeet, CC BY 4.0)', 11, 400, '#475569', anchor='end'))
save('g01-india-location', svg_doc(W, H, ''.join(b), 'भारत के मानचित्र में उत्तराखंड की स्थिति'), W, H)

# ---------- 2. Extent: graticule, extreme points, boundaries ----------
W = 1500
fr = Frame(uk.bounds, W, pad=26000)
H = fr.h
relief = relief_b64(fr, W, H, mode='grey', quality=80, S=1)
b = [f'<rect width="{W}" height="{H:.0f}" fill="#e9edf0"/>', f'<image href="data:image/jpeg;base64,{relief}" x="0" y="0" width="{W}" height="{H:.2f}" preserveAspectRatio="none"/>']
for _, r in d.iterrows():
    col = '#dcfce7' if DIST_DIV[r.DISTRICT] == 'G' else '#fef3c7'
    b.append(f'<path d="{fr.path(r.geometry)}" fill="{col}" fill-opacity=".72" stroke="#64748b" stroke-width="1" stroke-dasharray="4 3"/>')
b.append(f'<path d="{fr.path(shared)}" fill="none" stroke="#334155" stroke-width="2.4"/>')
for g, col, lab in ((intl_cn, '#b91c1c', 'cn'), (intl_np, '#c2410c', 'np')):
    b.append(f'<path d="{fr.path(g)}" fill="none" stroke="#fff" stroke-width="5" stroke-opacity=".7"/>')
    b.append(f'<path d="{fr.path(g)}" fill="none" stroke="{col}" stroke-width="2.6" stroke-dasharray="{"14 4 3 4" if lab=="cn" else "9 5"}"/>')
# graticule every 30'
from pyproj import Transformer as T2
back = T2.from_crs(CRS, 'EPSG:4326', always_xy=True)
lo0, la0 = back.transform(fr.minx, fr.maxy - H / fr.k); lo1, la1 = back.transform(fr.minx + W / fr.k, fr.maxy)
for la2 in range(int(la0 * 2), int(la1 * 2) + 2):
    lat = la2 / 2
    pts = [fr.ll(lo, lat) for lo in np.linspace(lo0 - 1, lo1 + 1, 60)]
    b.append('<path d="M' + 'L'.join(f'{x:.1f},{y:.1f}' for x, y in pts) + '" fill="none" stroke="#1e3a8a" stroke-width=".7" stroke-opacity=".45"/>')
    x, y = fr.ll(lo0 + 0.02, lat)
    if 10 < y < H - 10: b.append(text(8, y - 4, f"{int(lat)}°{'30' if lat % 1 else '00'}′ उ.", 12, 600, '#1e3a8a', anchor='start'))
for lo2 in range(int(lo0 * 2), int(lo1 * 2) + 2):
    lon = lo2 / 2
    pts = [fr.ll(lon, la) for la in np.linspace(la0 - 1, la1 + 1, 60)]
    b.append('<path d="M' + 'L'.join(f'{x:.1f},{y:.1f}' for x, y in pts) + '" fill="none" stroke="#1e3a8a" stroke-width=".7" stroke-opacity=".45"/>')
    x, y = fr.ll(lon, la0 + 0.05)
    if 30 < x < W - 30: b.append(text(x + 4, H - 8, f"{int(lon)}°{'30' if lon % 1 else '00'}′ पू.", 12, 600, '#1e3a8a', anchor='start'))
# extreme points from the boundary itself
ukll = gpd.GeoSeries([uk], crs=CRS).to_crs('EPSG:4326').iloc[0]
minlon, minlat, maxlon, maxlat = ukll.bounds
def dms(v): return f"{int(v)}°{int(round((v % 1) * 60)):02d}′"
coords = list(ukll.exterior.coords) if ukll.geom_type == 'Polygon' else [c for g in ukll.geoms for c in g.exterior.coords]
ext = {'उत्तरतम': max(coords, key=lambda c: c[1]), 'दक्षिणतम': min(coords, key=lambda c: c[1]), 'पूर्वतम': max(coords, key=lambda c: c[0]), 'पश्चिमतम': min(coords, key=lambda c: c[0])}
for k, (lo, la) in ext.items():
    x, y = fr.ll(lo, la)
    b.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="7" fill="#facc15" stroke="#111827" stroke-width="2"/>')
    val = f'{dms(la)} उ.' if k in ('उत्तरतम', 'दक्षिणतम') else f'{dms(lo)} पू.'
    ox, anc = {'उत्तरतम': (12, 'start'), 'दक्षिणतम': (-12, 'end'), 'पूर्वतम': (-12, 'end'), 'पश्चिमतम': (12, 'start')}[k]
    oy = {'उत्तरतम': -6, 'दक्षिणतम': 22, 'पूर्वतम': -14, 'पश्चिमतम': 20}[k]
    b.append(text(x + ox, y + oy, f'{k} बिंदु: {val}', 14, 700, '#111827', anchor=anc, halo='#fff', halo_w=4))
print('extremes', {k: (round(v[0], 4), round(v[1], 4)) for k, v in ext.items()})
# district names
for _, r in d.iterrows():
    p = r.geometry.representative_point(); x, y = fr.xy(p.x, p.y)
    if r.DISTRICT == 'Hardwar': y += 8
    b.append(text(x, y, DIST_HI[r.DISTRICT], 15, 700, '#14532d' if DIST_DIV[r.DISTRICT] == 'G' else '#92400e', halo='#fff', halo_w=3.5))
b += neighbours(fr, 21)
# lengths measured from the generalised boundary (approx.)
L_cn, L_np = intl_cn.length / 1000, intl_np.length / 1000
L_hp = uk.boundary.intersection(hp.buffer(400)).length / 1000
L_up = uk.boundary.intersection(up.buffer(400)).length / 1000
print('lengths km', round(L_cn), round(L_np), round(L_hp), round(L_up))
b.append(title_box(18, 18, 520, 'उत्तराखंड', 'अक्षांश-देशांतर विस्तार व सीमाएँ', 'हर 30′ पर अक्षांश/देशांतर रेखाएँ · पीले बिंदु = चरम बिंदु'))
lx, ly, lw, lh = W - 360, H - 262, 342, 222
lg = [f'<rect x="{lx}" y="{ly}" width="{lw}" height="{lh}" rx="10" fill="#fff" fill-opacity=".95" stroke="#cbd5e1"/>', text(lx + 16, ly + 30, 'संकेत', 17, 700, '#0f172a', anchor='start', halo=None)]
syms = [('<path d="M0,0 H34" stroke="#b91c1c" stroke-width="2.6" stroke-dasharray="14 4 3 4"/>', 'अंतरराष्ट्रीय सीमा — चीन (तिब्बत)'),
        ('<path d="M0,0 H34" stroke="#c2410c" stroke-width="2.6" stroke-dasharray="9 5"/>', 'अंतरराष्ट्रीय सीमा — नेपाल (काली नदी)'),
        ('<path d="M0,0 H34" stroke="#334155" stroke-width="2.4"/>', 'राज्य सीमा (हिमाचल, उत्तर प्रदेश)'),
        ('<rect x="0" y="-8" width="34" height="16" fill="#dcfce7" stroke="#64748b"/>', 'गढ़वाल मंडल (7 ज़िले)'),
        ('<rect x="0" y="-8" width="34" height="16" fill="#fef3c7" stroke="#64748b"/>', 'कुमाऊँ मंडल (6 ज़िले)'),
        ('<circle cx="17" cy="0" r="7" fill="#facc15" stroke="#111827" stroke-width="2"/>', 'चरम बिंदु')]
for i, (s, t) in enumerate(syms):
    yy = ly + 58 + i * 27
    lg.append(f'<g transform="translate({lx+16},{yy})">{s}</g>' + text(lx + 60, yy + 5, t, 13.5, 400, '#1f2937', anchor='start', halo=None))
b += lg
b.append(scalebar(fr, 34, H - 92, 50, (0, 25, 50)))
b.append(north_arrow(W - 50, 150, 1.1))
b.append(text(W - 14, H - 28, CREDIT, 11, 400, '#475569', anchor='end', halo='#fff', halo_w=3))
save('g01-extent', svg_doc(W, H, ''.join(b), 'उत्तराखंड का अक्षांश-देशांतर विस्तार, चरम बिंदु और सीमाएँ'), W, H)

# ---------- 3. Blank numbered district map (practice) ----------
order = ['Uttarkashi', 'Dehradun', 'Tehri Garhwal', 'Hardwar', 'Garhwal', 'Rudraprayag', 'Chamoli', 'Pithoragarh', 'Bageshwar', 'Almora', 'Nainital', 'Champawat', 'Udham Singh Nagar']
W = 1200
fr = Frame(uk.bounds, W, pad=20000)
H = fr.h
b = [f'<rect width="{W}" height="{H:.0f}" fill="#f8fafc"/>']
for _, r in d.iterrows():
    b.append(f'<path d="{fr.path(r.geometry)}" fill="#ffffff" stroke="#334155" stroke-width="1.4"/>')
b += boundaries(fr, district_lines=False)
for _, r in d.iterrows():
    p = r.geometry.representative_point(); x, y = fr.xy(p.x, p.y)
    n = order.index(r.DISTRICT) + 1
    b.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="17" fill="#1e3a8a"/>' + text(x, y + 7, n, 19, 700, '#fff', halo=None))
b.append(title_box(16, 16, 470, 'अभ्यास मानचित्र', '', 'संख्या देखकर ज़िले का नाम बताइए (उत्तर नीचे)'))
b.append(north_arrow(W - 46, 70, 1.0))
b.append(text(W - 12, H - 12, 'pahadpariksha.in · सीमाएँ: जनगणना 2011 (DataMeet, CC BY 4.0)', 11, 400, '#475569', anchor='end'))
save('g01-districts-blank', svg_doc(W, H, ''.join(b), 'उत्तराखंड के ज़िलों का रिक्त अभ्यास मानचित्र'), W, H)
print('ORDER', [DIST_HI[o] for o in order])
