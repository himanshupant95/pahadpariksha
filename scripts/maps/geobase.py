"""Shared data for the geography-series maps (relief raster, OSM layers, labels). Import, don't run."""
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
ukb = uk.buffer(1500)
shared = uk.boundary.intersection(unary_union([hp, up, hr]).buffer(400))
intl = uk.boundary.difference(unary_union([hp, up, hr]).buffer(400))

def split_intl():
    """International boundary → (Nepal part, China/Tibet part). Kali-river stretch lies south of ~30.24°N."""
    x, y = TO_UTM.transform(79.9, 30.24)
    south_east = box(x, -1e7, 1e7, y)
    return intl.intersection(south_east), intl.difference(south_east)
intl_np, intl_cn = split_intl()

DIST_HI = {'Uttarkashi': 'उत्तरकाशी', 'Chamoli': 'चमोली', 'Rudraprayag': 'रुद्रप्रयाग', 'Tehri Garhwal': 'टिहरी गढ़वाल',
           'Dehradun': 'देहरादून', 'Garhwal': 'पौड़ी गढ़वाल', 'Hardwar': 'हरिद्वार', 'Pithoragarh': 'पिथौरागढ़',
           'Bageshwar': 'बागेश्वर', 'Almora': 'अल्मोड़ा', 'Champawat': 'चंपावत', 'Nainital': 'नैनीताल', 'Udham Singh Nagar': 'ऊधम सिंह नगर'}
DIST_DIV = {k: ('G' if k in ('Uttarkashi', 'Chamoli', 'Rudraprayag', 'Tehri Garhwal', 'Dehradun', 'Garhwal', 'Hardwar') else 'K') for k in DIST_HI}

def dem_grid(fr, W, H, S=2):
    px = 1 / (fr.k * S)
    RW, RH = int(W * S), int(round(H * S))
    t = Affine(px, 0, fr.minx, 0, -px, fr.maxy)
    dem = np.zeros((RH, RW), dtype='float32')
    with rasterio.open(OSM + 'uk-dem-srtm90.tif') as src:
        reproject(rasterio.band(src, 1), dem, dst_transform=t, dst_crs=CRS, resampling=Resampling.bilinear, src_nodata=-32768, dst_nodata=0)
    return np.where(dem < -100, 0, dem), t, px

def hillshade(z, px, az, alt=45, zf=1.6):
    gy, gx = np.gradient(z * zf, px)
    slope = np.pi / 2 - np.arctan(np.hypot(gx, gy))
    aspect = np.arctan2(-gx, gy)
    a, al = np.radians(360 - az + 90), np.radians(alt)
    return np.clip(np.sin(al) * np.sin(slope) + np.cos(al) * np.cos(slope) * np.cos(a - aspect), 0, 1)

STOPS = [(0, (135, 178, 112)), (300, (164, 197, 124)), (700, (205, 218, 146)), (1200, (232, 220, 158)), (2000, (222, 190, 130)),
         (3000, (196, 154, 110)), (4000, (170, 136, 116)), (4800, (205, 196, 200)), (5500, (236, 240, 246)), (8000, (255, 255, 255))]
def tint(z):
    out = np.zeros(z.shape + (3,), 'float32')
    zs = [s[0] for s in STOPS]
    for c in range(3):
        out[..., c] = np.interp(z, zs, [s[1][c] for s in STOPS])
    return out

def relief_b64(fr, W, H, mode='color', quality=84, S=2):
    """mode: color (hypsometric+shade inside UK, grey outside) | grey (light shaded relief everywhere)."""
    dem, t, px = dem_grid(fr, W, H, S)
    hs = 0.5 * hillshade(dem, px, 315) + 0.3 * hillshade(dem, px, 270) + 0.2 * hillshade(dem, px, 0)
    inside = ~geometry_mask([uk.__geo_interface__], out_shape=dem.shape, transform=t)
    gray = (215 + 40 * (hs - 0.5))[..., None].repeat(3, -1) * np.array([1.0, 0.99, 0.96])
    if mode == 'color':
        rgb_in = np.clip(tint(dem) * (0.35 + 0.75 * hs)[..., None], 0, 255)
    else:
        rgb_in = np.clip((228 + 38 * (hs - 0.5))[..., None].repeat(3, -1) * np.array([1.0, 1.0, 0.97]), 0, 255)
        gray = gray * 0.93
    rgb = np.where(inside[..., None], rgb_in, np.clip(gray, 0, 255))
    buf = io.BytesIO(); Image.fromarray(rgb.astype('uint8')).save(buf, 'JPEG', quality=quality, optimize=True, progressive=True)
    return base64.b64encode(buf.getvalue()).decode()

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

# river name → (Hindi, system key)
RIV = [('Yamuna', 'यमुना', 'yam'), ('Tons', 'टोंस', 'yam'), ('Asan', 'आसन', 'yam'), ('Giri', 'गिरि', 'yam'), ('Pabbar', 'पब्बर', 'yam'), ('Rupin', 'रूपिन', 'yam'), ('Supin', 'सुपिन', 'yam'),
       ('Bhagirathi', 'भागीरथी', 'bha'), ('Bhilangna', 'भिलंगना', 'bha'), ('Bhillangana', 'भिलंगना', 'bha'), ('Bhilangana', 'भिलंगना', 'bha'), ('Jadh Ganga', 'जाड़ गंगा', 'bha'), ('Jahnavi', 'जाड़ गंगा', 'bha'), ('Kedar Ganga', 'केदार गंगा', 'bha'), ('Assi Ganga', 'असी गंगा', 'bha'),
       ('Alaknanda', 'अलकनंदा', 'ala'), ('Mandakini', 'मंदाकिनी', 'ala'), ('Pindar', 'पिंडर', 'ala'), ('Nandakini', 'नंदाकिनी', 'ala'), ('Dhauliganga', 'धौलीगंगा', 'ala'), ('Dhauli Ganga', 'धौलीगंगा', 'ala'),
       ('Rishiganga', 'ऋषिगंगा', 'ala'), ('Rishi Ganga', 'ऋषिगंगा', 'ala'), ('Birahi', 'बिरही', 'ala'), ('Saraswati', 'सरस्वती', 'ala'), ('Vishnuganga', 'विष्णुगंगा', 'ala'), ('Kaliganga', 'काली गंगा', 'ala'), ('Madhyamaheshwar', 'मध्यमहेश्वर गंगा', 'ala'), ('Nayar', 'नयार', 'gan'),
       ('Ganges', 'गंगा', 'gan'), ('Ganga', 'गंगा', 'gan'), ('Song', 'सौंग', 'gan'), ('Suswa', 'सुसवा', 'gan'), ('Rispana', 'रिस्पना', 'gan'), ('Bindal', 'बिंदाल', 'gan'), ('Hiyunl', 'हेंवल', 'gan'), ('Heval', 'हेंवल', 'gan'),
       ('Ramganga', 'रामगंगा', 'ram'), ('Kosi', 'कोसी', 'ram'), ('Khoh', 'खोह', 'ram'), ('Gaula', 'गौला', 'ram'), ('Dabka', 'दाबका', 'ram'), ('Bhakra', 'भाखड़ा', 'ram'), ('Kichha', 'किच्छा', 'ram'), ('Baur', 'बौर', 'ram'),
       ('Sarju', 'सरयू', 'kal'), ('Saryu', 'सरयू', 'kal'), ('Gomati', 'गोमती', 'kal'), ('Goriganga', 'गोरी गंगा', 'kal'), ('Gori Ganga', 'गोरी गंगा', 'kal'), ('Mahakali', 'काली', 'kal'), ('Sharda', 'शारदा', 'kal'), ('Sarda', 'शारदा', 'kal'),
       ('Kali', 'काली', 'kal'), ('Kuthi Yankti', 'कुटी यांग्ती', 'kal'), ('Darma Yankti', 'धौली (दारमा)', 'kal'), ('Ladhiya', 'लधिया', 'kal'), ('Lohawati', 'लोहावती', 'kal'), ('Panar', 'पनार', 'kal'), ('Ramgad', 'रामगाड़', 'kal')]
SYS = {'yam': ('यमुना–टोंस तंत्र', '#7c3aed'), 'bha': ('भागीरथी तंत्र', '#0284c7'), 'ala': ('अलकनंदा तंत्र', '#059669'),
       'gan': ('गंगा (देवप्रयाग के बाद)', '#1d4ed8'), 'ram': ('रामगंगा–कोसी–गौला तंत्र', '#d97706'), 'kal': ('काली (शारदा)–सरयू–गोरी तंत्र', '#dc2626')}

def riv_key(t):
    n = (t.get('name:en') or t.get('name') or '')
    if 'Kali Nadi' in n or 'Kali Gad' in n: return None
    nl = n.lower()
    for k, hi, s in sorted(RIV, key=lambda r: -len(r[0])):
        if k.lower() in nl:
            # Ramganga east (Pithoragarh) drains to Saryu → Kali system
            return (hi, s)
    return None

PEAKS = [('नंदा देवी', 79.970, 30.376, 7816, 'start'), ('कामेट', 79.593, 30.920, 7756, 'start'), ('चौखंबा', 79.288, 30.750, 7138, 'end'),
         ('त्रिशूल', 79.778, 30.313, 7120, 'end'), ('द्रोणागिरि', 79.866, 30.516, 7066, 'end'), ('सतोपंथ', 79.214, 30.850, 7075, 'end'),
         ('केदारनाथ', 79.066, 30.798, 6940, 'end'), ('पंचाचूली', 80.427, 30.215, 6904, 'start'), ('नंदा कोट', 80.067, 30.281, 6861, 'start'),
         ('नीलकंठ', 79.404, 30.731, 6596, 'start'), ('शिवलिंग', 79.063, 30.880, 6543, 'end'), ('बंदरपूँछ', 78.553, 31.004, 6316, 'end')]
PASSES = [('माणा', 79.42, 31.07, 'end'), ('नीति', 79.88, 30.97, 'start'), ('लिपुलेख', 81.03, 30.23, 'end')]
PRAYAG = [('देवप्रयाग', 78.5986, 30.1461), ('रुद्रप्रयाग', 78.981, 30.287), ('कर्णप्रयाग', 79.2171, 30.2596), ('नंदप्रयाग', 79.326, 30.333), ('विष्णुप्रयाग', 79.567, 30.562)]

def places():
    out = {}
    for e in json.load(open(OSM + 'osm-places.json'))['elements']:
        t = e.get('tags', {})
        for k in ('name:en', 'name'):
            if t.get(k): out.setdefault(t[k], (e['lon'], e['lat']))
    return out

CREDIT = 'pahadpariksha.in · सीमाएँ: जनगणना 2011 / भारतीय सर्वेक्षण विभाग (DataMeet, CC BY 4.0) · © OpenStreetMap contributors (ODbL) · ऊँचाई: NASA SRTM'

def title_box(x, y, w, t1, t2, sub=None):
    h = 92 if sub else 64
    s = f'<g><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="#fff" fill-opacity=".94" stroke="#cbd5e1"/>'
    s += text(x + 18, y + 40, t1, 28, 700, '#14532d', anchor='start', halo=None)
    if t2: s += f'<text x="{x+18}" y="{y+40}" font-size="20" font-weight="600" fill="#334155" text-anchor="start" dx="{len(t1)*15+14}">{esc(t2)}</text>'
    if sub: s += text(x + 18, y + 72, sub, 15, 400, '#475569', anchor='start', halo=None)
    return s + '</g>'

def boundaries(fr, district_lines=True, dstroke='#ffffff', dop=.6):
    b = []
    if district_lines:
        for _, r in d.iterrows():
            b.append(f'<path d="{fr.path(r.geometry)}" fill="none" stroke="{dstroke}" stroke-opacity="{dop}" stroke-width=".9" stroke-dasharray="4 3"/>')
    b.append(f'<path d="{fr.path(shared)}" fill="none" stroke="#334155" stroke-width="2"/>')
    b.append(f'<path d="{fr.path(intl)}" fill="none" stroke="#fff" stroke-width="4.5" stroke-opacity=".6"/>')
    b.append(f'<path d="{fr.path(intl)}" fill="none" stroke="#b91c1c" stroke-width="2.2" stroke-dasharray="14 4 3 4"/>')
    return b

def neighbours(fr, size=19):
    out = []
    for (lon, lat), t in (((77.72, 31.25), 'हिमाचल प्रदेश'), ((78.25, 29.12), 'उत्तर प्रदेश'), ((80.88, 29.62), 'नेपाल'), ((80.30, 31.10), 'तिब्बत (चीन)')):
        x, y = fr.ll(lon, lat)
        out.append(text(x, y, t, size, 600, '#6b6455', halo='#ffffff', halo_w=3, extra='letter-spacing="2" opacity=".9"'))
    return out

def save(name, svg, W, H, outdir='out/geo'):
    import os
    os.makedirs(outdir, exist_ok=True)
    open(f'{outdir}/{name}.svg', 'w').write(svg)
    to_png(f'{outdir}/{name}.svg', f'{outdir}/{name}.png', W, H)
    print('saved', name, int(W), int(H))
