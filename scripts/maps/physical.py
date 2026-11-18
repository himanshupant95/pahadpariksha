"""उत्तराखंड — भौतिक मानचित्र (relief, rivers, glaciers, peaks, passes, prayags)."""
import json, io, base64, math
import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling
from rasterio.transform import Affine
from rasterio.features import geometry_mask
from PIL import Image
from mapkit import *

OSM = '/home/claude/mapdata/osm/'
d, states = load_admin()
uk = unary_union(d.geometry)
hp = states[states.ST_NM == 'Himachal Pradesh'].geometry.union_all()
up = states[states.ST_NM == 'Uttar Pradesh'].geometry.union_all()
hr = states[states.ST_NM == 'Haryana'].geometry.union_all()

W = 1600
fr = Frame(uk.bounds, W, pad=22000)
H = fr.h
S = 2  # raster supersampling
view = box(fr.minx, fr.maxy - H / fr.k, fr.minx + W / fr.k, fr.maxy)

# ---------- relief raster ----------
px = 1 / (fr.k * S)
RW, RH = int(W * S), int(round(H * S))
dst_t = Affine(px, 0, fr.minx, 0, -px, fr.maxy)
dem = np.zeros((RH, RW), dtype='float32')
with rasterio.open(OSM + 'uk-dem-srtm90.tif') as src:
    reproject(rasterio.band(src, 1), dem, dst_transform=dst_t, dst_crs=CRS, resampling=Resampling.bilinear, src_nodata=-32768, dst_nodata=0)
dem = np.where(dem < -100, 0, dem)

def hillshade(z, az, alt=45, zf=1.6):
    gy, gx = np.gradient(z * zf, px)
    slope = np.pi / 2 - np.arctan(np.hypot(gx, gy))
    aspect = np.arctan2(-gx, gy)
    a, al = np.radians(360 - az + 90), np.radians(alt)
    return np.clip(np.sin(al) * np.sin(slope) + np.cos(al) * np.cos(slope) * np.cos(a - aspect), 0, 1)

hs = 0.5 * hillshade(dem, 315) + 0.3 * hillshade(dem, 270) + 0.2 * hillshade(dem, 0)
STOPS = [(0, (135, 178, 112)), (300, (164, 197, 124)), (700, (205, 218, 146)), (1200, (232, 220, 158)), (2000, (222, 190, 130)),
         (3000, (196, 154, 110)), (4000, (170, 136, 116)), (4800, (205, 196, 200)), (5500, (236, 240, 246)), (8000, (255, 255, 255))]
def tint(z):
    out = np.zeros(z.shape + (3,), 'float32')
    zs = [s[0] for s in STOPS]
    for c in range(3):
        out[..., c] = np.interp(z, zs, [s[1][c] for s in STOPS])
    return out
col = tint(dem)
shade = (0.35 + 0.75 * hs)[..., None]
rgb_in = np.clip(col * shade, 0, 255)
gray = (205 + 45 * (hs - 0.5))[..., None].repeat(3, -1) * np.array([1.0, 0.99, 0.96])
inside = ~geometry_mask([uk.__geo_interface__], out_shape=(RH, RW), transform=dst_t)
rgb = np.where(inside[..., None], rgb_in, np.clip(gray, 0, 255))
img = Image.fromarray(rgb.astype('uint8'))
buf = io.BytesIO(); img.save(buf, 'JPEG', quality=86, optimize=True, progressive=True)
relief_b64 = base64.b64encode(buf.getvalue()).decode()
print('relief jpeg kB', len(buf.getvalue()) // 1024)

# ---------- vector data ----------
def osm_lines(fn):
    out = []
    for e in json.load(open(OSM + fn))['elements']:
        if e.get('geometry'):
            pts = [TO_UTM.transform(p['lon'], p['lat']) for p in e['geometry']]
            if len(pts) > 1: out.append((e.get('tags', {}), LineString(pts)))
    return out

def osm_polys(fn, name_filter=None):
    out = []
    for e in json.load(open(OSM + fn))['elements']:
        t = e.get('tags', {})
        if name_filter and not name_filter(t): continue
        try:
            if e['type'] == 'way' and e.get('geometry'):
                pts = [TO_UTM.transform(p['lon'], p['lat']) for p in e['geometry']]
                if len(pts) > 3: out.append((t, Polygon(pts).buffer(0)))
            elif e['type'] == 'relation':
                outers = []
                for m in e.get('members', []):
                    if m.get('role') == 'outer' and m.get('geometry'):
                        outers.append(LineString([TO_UTM.transform(p['lon'], p['lat']) for p in m['geometry']]))
                merged = linemerge(outers)
                rings = merged.geoms if merged.geom_type == 'MultiLineString' else [merged]
                polys = [Polygon(r.coords).buffer(0) for r in rings if r.is_ring and len(r.coords) > 3]
                if polys: out.append((t, unary_union(polys)))
        except Exception:
            pass
    return out

RIV_HI = [('Yamuna', 'यमुना'), ('Tons', 'टौंस'), ('Bhagirathi', 'भागीरथी'), ('Bhilangna', 'भिलंगना'), ('Bhillangana', 'भिलंगना'), ('Bhilangana', 'भिलंगना'), ('Alaknanda', 'अलकनंदा'),
          ('Mandakini', 'मंदाकिनी'), ('Pindar', 'पिंडर'), ('Nandakini', 'नंदाकिनी'), ('Dhauliganga', 'धौलीगंगा'), ('Dhauli Ganga', 'धौलीगंगा'),
          ('Ganges', 'गंगा'), ('Ramganga', 'रामगंगा'), ('Kosi', 'कोसी'), ('Sarju', 'सरयू'), ('Goriganga', 'गोरी गंगा'), ('Gori Ganga', 'गोरी गंगा'),
          ('Mahakali', 'काली'), ('Kali', 'काली'), ('Kuthi Yankti', 'कुटी यांग्ती'), ('Darma Yankti', 'धौली (दारमा)'),
          ('Nayar', 'नयार'), ('Gaula', 'गौला'), ('Ladhiya', 'लधिया'), ('Rishiganga', 'ऋषिगंगा'), ('Rishi Ganga', 'ऋषिगंगा'), ('Jadh Ganga', 'जाड़ गंगा'), ('Song', 'सौंग'), ('Saryu', 'सरयू')]
def hi_name(t):
    n = (t.get('name:en') or t.get('name') or '')
    if 'Kali Nadi' in n: return None  # a different Kali (UP plains)
    for k, v in RIV_HI:
        if k.lower() in n.lower(): return v
    return None

rivers = osm_lines('osm-rivers.json')
ukb = uk.buffer(1500)
riv_major, riv_minor = [], []
for t, g in rivers:
    if not g.intersects(view): continue
    (riv_major if hi_name(t) else riv_minor).append((t, g))

glaciers = osm_polys('osm-glaciers.json')
lakes = osm_polys('osm-water.json')

b = [f'<rect width="{W}" height="{H:.0f}" fill="#e9edf0"/>',
     f'<image href="data:image/jpeg;base64,{relief_b64}" x="0" y="0" width="{W}" height="{H:.2f}" preserveAspectRatio="none"/>']
# glaciers
for t, g in glaciers:
    gg = g.intersection(view)
    if not gg.is_empty:
        b.append(f'<path d="{fr.path(gg)}" fill="#f4f9fc" fill-opacity=".9" stroke="#8fb8d4" stroke-width=".7"/>')
# rivers
mn = unary_union([g for _, g in riv_minor]).intersection(ukb)
b.append(f'<path d="{fr.path(mn)}" fill="none" stroke="#3b82c4" stroke-width=".7" stroke-opacity=".75" stroke-linejoin="round"/>')
mj = unary_union([g for _, g in riv_major]).intersection(view)
mj_in = mj.intersection(ukb); mj_out = mj.difference(ukb)
b.append(f'<path d="{fr.path(mj_out)}" fill="none" stroke="#6b9fcf" stroke-width="1.4" stroke-opacity=".8"/>')
b.append(f'<path d="{fr.path(mj_in)}" fill="none" stroke="#1d6fb8" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round"/>')
# lakes
for t, g in lakes:
    gg = g.intersection(ukb)
    if not gg.is_empty and gg.area > 2e5:
        b.append(f'<path d="{fr.path(gg)}" fill="#5aa3dd" stroke="#1d6fb8" stroke-width=".6"/>')
# boundaries: districts faint, state, international
for _, r in d.iterrows():
    b.append(f'<path d="{fr.path(r.geometry)}" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width=".9" stroke-dasharray="4 3"/>')
shared = uk.boundary.intersection(unary_union([hp, up, hr]).buffer(400))
intl = uk.boundary.difference(unary_union([hp, up, hr]).buffer(400))
b.append(f'<path d="{fr.path(shared)}" fill="none" stroke="#334155" stroke-width="2"/>')
b.append(f'<path d="{fr.path(intl)}" fill="none" stroke="#fff" stroke-width="4.5" stroke-opacity=".6"/>')
b.append(f'<path d="{fr.path(intl)}" fill="none" stroke="#b91c1c" stroke-width="2.2" stroke-dasharray="14 4 3 4"/>')

L = []  # labels drawn last
def lab_on(name_hi, lon, lat, size=15, color='#0b4f8a', geoms=None, disp=None):
    """Label a river at the river point nearest (lon,lat), rotated along it."""
    x0, y0 = TO_UTM.transform(lon, lat)
    p = Point(x0, y0)
    best = None
    for t, g in (geoms or riv_major):
        if hi_name(t) != name_hi: continue
        dd = g.distance(p)
        if best is None or dd < best[0]: best = (dd, g)
    if best is None or best[0] > 15000:
        print('label miss', name_hi); return
    g = best[1]; s = g.project(p)
    a, c = g.interpolate(max(s - 2500, 0)), g.interpolate(min(s + 2500, g.length))
    (ax, ay), (cx, cy) = fr.xy(a.x, a.y), fr.xy(c.x, c.y)
    ang = math.degrees(math.atan2(cy - ay, cx - ax))
    if ang > 90: ang -= 180
    if ang < -90: ang += 180
    mx, my = fr.xy(*g.interpolate(s).coords[0])
    L.append(f'<g transform="translate({mx:.1f},{my:.1f}) rotate({ang:.1f})">' + text(0, -4, disp or name_hi, size, 600, color, halo='#ffffff', halo_w=3.5, extra='font-style="italic"') + '</g>')

for args in [('यमुना', 78.12, 30.66), ('टौंस', 77.88, 30.93), ('भागीरथी', 78.62, 30.86), ('भिलंगना', 78.70, 30.50), ('अलकनंदा', 79.43, 30.43),
             ('मंदाकिनी', 79.03, 30.47), ('पिंडर', 79.55, 30.07), ('नंदाकिनी', 79.47, 30.27), ('धौलीगंगा', 79.75, 30.62), ('गंगा', 78.22, 30.03),
             ('कोसी', 79.36, 29.52), ('सरयू', 79.88, 29.70), ('गोरी गंगा', 80.25, 30.08), ('काली', 80.68, 29.78),
             ('नयार', 78.95, 29.98), ('काली', 80.95, 30.08)]:
    lab_on(*args, size=14)
lab_on('रामगंगा', 79.08, 29.72, size=14, disp='रामगंगा (पश्चिमी)')
lab_on('रामगंगा', 80.05, 29.92, size=14, disp='रामगंगा (पूर्वी)')

def ll_pt(lon, lat): return fr.ll(lon, lat)

# glacier labels
for nm, hi, lon, lat in (('Gangotri Glacier', 'गंगोत्री हिमनद', 79.00, 30.96), ('Satopanth Glacier', 'सतोपंथ हिमनद', 79.40, 30.81),
                         ('Milam Glacier', 'मिलम हिमनद', 80.07, 30.55), ('Pindar Glacier', 'पिंडारी हिमनद', 79.95, 30.17)):
    if not [g for t, g in glaciers if t.get('name') == nm]: print('glacier miss', nm)
    x, y = ll_pt(lon, lat)
    L.append(text(x, y, hi, 12, 600, '#0e5a8a', halo='#ffffff', halo_w=3, extra='font-style="italic"'))

# lakes
for (lon, lat), t, anc, ox, oy in (((78.44, 30.40), 'टिहरी झील', 'end', -10, 0), ((79.46, 29.39), 'नैनी झील', 'start', 8, 4),
                                   ((79.75, 28.97), 'नानक सागर', 'start', 8, 4)):
    x, y = ll_pt(lon, lat)
    L.append(text(x + ox, y + oy, t, 12, 600, '#0b4f8a', anchor=anc, halo='#ffffff', halo_w=3))

# peaks (verified heights, metres)
PEAKS = [('नंदा देवी', 79.970, 30.376, 7816, 'start'), ('कामेट', 79.593, 30.920, 7756, 'start'), ('चौखंबा', 79.288, 30.750, 7138, 'end'),
         ('त्रिशूल', 79.778, 30.313, 7120, 'end'), ('द्रोणागिरि', 79.866, 30.516, 7066, 'end'), ('सतोपंथ', 79.214, 30.850, 7075, 'end'),
         ('केदारनाथ', 79.066, 30.798, 6940, 'end'), ('पंचाचूली', 80.427, 30.215, 6904, 'start'), ('नंदा कोट', 80.067, 30.281, 6861, 'start'),
         ('नीलकंठ', 79.404, 30.731, 6596, 'start'), ('शिवलिंग', 79.063, 30.880, 6543, 'end'), ('बंदरपूँछ', 78.553, 31.004, 6316, 'end')]
for nm, lon, lat, h, anc in PEAKS:
    x, y = ll_pt(lon, lat)
    L.append(f'<path d="M{x:.1f},{y-7:.1f} L{x+6.5:.1f},{y+4.5:.1f} L{x-6.5:.1f},{y+4.5:.1f}Z" fill="#7c2d12" stroke="#fff" stroke-width="1.3"/>')
    ox = 9 if anc == 'start' else -9
    L.append(text(x + ox, y + 1, nm, 13, 700, '#3b1d0f', anchor=anc, halo='#ffffff', halo_w=3.2))
    L.append(text(x + ox, y + 15, f'{h:,} मी.'.replace(',', ','), 11, 600, '#7c2d12', anchor=anc, halo='#ffffff', halo_w=3))

# passes
for nm, lon, lat, anc in (('माणा दर्रा', 79.42, 31.07, 'end'), ('नीति दर्रा', 79.88, 30.97, 'start'), ('लिपुलेख', 81.03, 30.23, 'end')):
    x, y = ll_pt(lon, lat)
    L.append(f'<g transform="translate({x:.1f},{y:.1f})"><path d="M-7,-5 Q0,3 7,-5 M-7,5 Q0,-3 7,5" fill="none" stroke="#111827" stroke-width="2"/></g>')
    ox = 11 if anc == 'start' else -11
    L.append(text(x + ox, y + 4, nm, 12, 700, '#111827', anchor=anc, halo='#ffffff', halo_w=3))

# Panch Prayag
for nm, lon, lat, anc, ox, oy in (('देवप्रयाग', 78.598, 30.146, 'end', -8, 4), ('रुद्रप्रयाग', 78.981, 30.287, 'end', -8, -6), ('कर्णप्रयाग', 79.223, 30.262, 'start', 8, 12),
                                  ('नंदप्रयाग', 79.326, 30.333, 'start', 8, 4), ('विष्णुप्रयाग', 79.567, 30.562, 'start', 8, 4)):
    x, y = ll_pt(lon, lat)
    L.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4.2" fill="#facc15" stroke="#1d4ed8" stroke-width="2"/>')
    L.append(text(x + ox, y + oy, nm, 11.5, 600, '#1e3a8a', anchor=anc, halo='#ffffff', halo_w=3))

# towns for orientation
PLJ = {}
for e in json.load(open(OSM + 'osm-places.json'))['elements']:
    t = e.get('tags', {})
    for k in ('name:en', 'name'):
        if t.get(k): PLJ.setdefault(t[k], (e['lon'], e['lat']))
for en, hi, anc in (('Dehradun', 'देहरादून', 'start'), ('Haridwār', 'हरिद्वार', 'end'), ('Nainital', 'नैनीताल', 'end'), ('Almora', 'अल्मोड़ा', 'start'),
                    ('Pithoragarh', 'पिथौरागढ़', 'start'), ('Uttarkashi', 'उत्तरकाशी', 'start'), ('Gopeshwar', 'गोपेश्वर', 'end'), ('Rudrapur', 'रुद्रपुर', 'end')):
    if en not in PLJ: print('town miss', en); continue
    x, y = ll_pt(*PLJ[en])
    L.append(f'<rect x="{x-3.5:.1f}" y="{y-3.5:.1f}" width="7" height="7" fill="#111827" stroke="#fff" stroke-width="1.2"/>')
    L.append(text(x + (8 if anc == 'start' else -8), y + 4, hi, 12, 600, '#111827', anchor=anc, halo='#ffffff', halo_w=3))
# region labels
for (lon, lat), t, sz in (((79.55, 28.86), 'तराई', 18), ((79.25, 29.20), 'भाबर', 15), ((77.98, 30.33), 'दून घाटी', 15)):
    x, y = ll_pt(lon, lat)
    L.append(text(x, y, t, sz, 700, '#3f6212', halo='#ffffff', halo_w=3, extra='letter-spacing="4" opacity=".85"'))
for (lon, lat), t, sz in (((77.72, 31.25), 'हिमाचल प्रदेश', 20), ((78.25, 29.12), 'उत्तर प्रदेश', 20), ((80.88, 29.62), 'नेपाल', 22), ((80.30, 31.10), 'तिब्बत (चीन)', 22)):
    x, y = ll_pt(lon, lat)
    L.append(text(x, y, t, sz, 600, '#6b6455', halo='#ffffff', halo_w=3, extra='letter-spacing="2" opacity=".9"'))
b += L

# title
b.append(f'<g><rect x="18" y="18" width="430" height="92" rx="10" fill="#ffffff" fill-opacity=".93" stroke="#cbd5e1"/>'
         + text(36, 58, 'उत्तराखंड', 34, 700, '#14532d', anchor='start', halo=None)
         + text(212, 58, 'भौतिक मानचित्र', 22, 600, '#334155', anchor='start', halo=None)
         + text(36, 92, 'ऊँचाई, नदियाँ, हिमनद, प्रमुख चोटियाँ व दर्रे', 16, 400, '#475569', anchor='start', halo=None) + '</g>')

# legend: elevation ramp + symbols
lx, ly, lw, lh = W - 330, H - 352, 312, 334
lg = [f'<rect x="{lx}" y="{ly}" width="{lw}" height="{lh}" rx="10" fill="#fff" fill-opacity=".95" stroke="#cbd5e1"/>',
      text(lx + 18, ly + 32, 'ऊँचाई (मीटर)', 17, 700, '#0f172a', anchor='start', halo=None)]
ticks = [0, 500, 1000, 2000, 3000, 4000, 5000, 6000, 7000]
bw = 26; bh = 22
for i, z in enumerate(reversed(ticks)):
    c = tint(np.array([z + (250 if z < 1000 else 500)], 'float32'))[0].astype(int)
    yy = ly + 48 + i * bh
    lg.append(f'<rect x="{lx+18}" y="{yy}" width="{bw}" height="{bh}" fill="rgb({c[0]},{c[1]},{c[2]})" stroke="#94a3b8" stroke-width=".5"/>')
    lg.append(text(lx + 52, yy + bh - 5, f'{z:,}+' if i == 0 else f'{z:,}', 12.5, 400, '#334155', anchor='start', halo=None))
sy = ly + 52
sx = lx + 140
syms = [(f'<path d="M0,0 H34" stroke="#1d6fb8" stroke-width="2.4"/>', 'प्रमुख नदी'),
        (f'<path d="M0,0 H34" stroke="#3b82c4" stroke-width=".9"/>', 'सहायक नदी'),
        (f'<rect x="0" y="-7" width="34" height="14" fill="#f4f9fc" stroke="#8fb8d4"/>', 'हिमनद'),
        (f'<rect x="0" y="-7" width="34" height="14" fill="#5aa3dd" stroke="#1d6fb8"/>', 'झील / जलाशय'),
        (f'<path transform="translate(17,0)" d="M0,-7 L6.5,4.5 L-6.5,4.5Z" fill="#7c2d12"/>', 'चोटी (ऊँचाई)'),
        (f'<path transform="translate(17,0)" d="M-7,-5 Q0,3 7,-5 M-7,5 Q0,-3 7,5" fill="none" stroke="#111827" stroke-width="2"/>', 'दर्रा'),
        (f'<circle cx="17" cy="0" r="4.2" fill="#facc15" stroke="#1d4ed8" stroke-width="2"/>', 'प्रयाग (संगम)'),
        (f'<path d="M0,0 H34" stroke="#b91c1c" stroke-width="2.2" stroke-dasharray="10 3 2 3"/>', 'अंतरराष्ट्रीय सीमा'),
        (f'<path d="M0,0 H34" stroke="#334155" stroke-width="2"/>', 'राज्य सीमा'),
        (f'<rect x="13" y="-3.5" width="7" height="7" fill="#111827"/>', 'प्रमुख नगर')]
for i, (s, t) in enumerate(syms):
    yy = sy + i * 25
    lg.append(f'<g transform="translate({sx},{yy})">{s}</g>' + text(sx + 42, yy + 5, t, 13, 400, '#1f2937', anchor='start', halo=None))
lg.append(text(lx + 18, ly + lh - 18, 'ऊँचाई: NASA SRTM · नदी/हिमनद: © OpenStreetMap', 10.5, 400, '#64748b', anchor='start', halo=None))
b += lg
b.append(scalebar(fr, 34, H - 70, 50, (0, 25, 50)))
b.append(north_arrow(W - 60, 160, 1.1))
b.append(text(W - 14, H - 12, 'pahadpariksha.in  ·  सीमाएँ: जनगणना 2011 / भारतीय सर्वेक्षण विभाग (DataMeet, CC BY 4.0) · © OpenStreetMap contributors (ODbL)', 11.5, 400, '#475569', anchor='end', halo='#ffffff', halo_w=3))
b.append(text(34, H - 92, 'पहाड़ परीक्षा', 15, 700, '#166534', anchor='start', halo='#ffffff', extra='translate="no"'))

svg = svg_doc(W, H, ''.join(b), 'उत्तराखंड का भौतिक मानचित्र — ऊँचाई, नदियाँ, हिमनद, चोटियाँ, दर्रे और पंच प्रयाग')
open('out/uttarakhand-physical.svg', 'w').write(svg)
to_png('out/uttarakhand-physical.svg', 'out/uttarakhand-physical.png', W, H)
print('done', W, round(H))
