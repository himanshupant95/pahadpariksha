"""उत्तराखंड — राजनीतिक मानचित्र (districts, divisions, HQs, capitals, neighbours)."""
import json, sys
from mapkit import *

d, states = load_admin()
uk = unary_union(d.geometry)
hp = states[states.ST_NM == 'Himachal Pradesh'].geometry.union_all()
up = states[states.ST_NM == 'Uttar Pradesh'].geometry.union_all()
hr = states[states.ST_NM == 'Haryana'].geometry.union_all()

HI = {  # census name → (Hindi, HQ Hindi, division, HQ OSM name(s))
    'Uttarkashi': ('उत्तरकाशी', 'उत्तरकाशी', 'G', ['Uttarkashi']),
    'Chamoli': ('चमोली', 'गोपेश्वर', 'G', ['Gopeshwar']),
    'Rudraprayag': ('रुद्रप्रयाग', 'रुद्रप्रयाग', 'G', ['Rudraprayag']),
    'Tehri Garhwal': ('टिहरी गढ़वाल', 'नई टिहरी', 'G', ['New Tehri', 'Tehri']),
    'Dehradun': ('देहरादून', 'देहरादून', 'G', ['Dehradun', 'Dehra Dun']),
    'Garhwal': ('पौड़ी गढ़वाल', 'पौड़ी', 'G', ['Pauri']),
    'Hardwar': ('हरिद्वार', 'हरिद्वार', 'G', ['Haridwar', 'Haridwār', 'Hardwar']),
    'Pithoragarh': ('पिथौरागढ़', 'पिथौरागढ़', 'K', ['Pithoragarh']),
    'Bageshwar': ('बागेश्वर', 'बागेश्वर', 'K', ['Bageshwar', 'Bāgeshwar']),
    'Almora': ('अल्मोड़ा', 'अल्मोड़ा', 'K', ['Almora']),
    'Champawat': ('चंपावत', 'चंपावत', 'K', ['Champawat']),
    'Nainital': ('नैनीताल', 'नैनीताल', 'K', ['Nainital']),
    'Udham Singh Nagar': ('ऊधम सिंह नगर', 'रुद्रपुर', 'K', ['Rudrapur']),
}
# fallback HQ coords (lon, lat) only if OSM lookup fails
HQ_FALLBACK = {'Uttarkashi': (78.4436, 30.7268), 'Chamoli': (79.3240, 30.4085), 'Rudraprayag': (78.9806, 30.2844),
               'Tehri Garhwal': (78.4313, 30.3747), 'Dehradun': (78.0322, 30.3165), 'Garhwal': (78.7802, 30.1474),
               'Hardwar': (78.1642, 29.9457), 'Pithoragarh': (80.2182, 29.5829), 'Bageshwar': (79.7717, 29.8379),
               'Almora': (79.6591, 29.5971), 'Champawat': (80.0981, 29.3363), 'Nainital': (79.4636, 29.3803),
               'Udham Singh Nagar': (79.4141, 28.9875)}

def osm_places():
    try:
        j = json.load(open('/home/claude/mapdata/osm/osm-places.json'))
    except Exception:
        return {}
    out = {}
    for e in j['elements']:
        n = e.get('tags', {}).get('name:en') or e.get('tags', {}).get('name')
        if n and 'lat' in e: out.setdefault(n, (e['lon'], e['lat']))
    return out

PL = osm_places()
def hq_ll(dist):
    for n in HI[dist][3]:
        if n in PL: return PL[n], 'osm'
    return HQ_FALLBACK[dist], 'fallback'

W = 1600
LEG_W = 0
fr = Frame(uk.bounds, W, pad=22000)
H = fr.h
view = box(fr.minx, fr.maxy - H / fr.k, fr.minx + W / fr.k, fr.maxy)

# palette: Garhwal = cool hues, Kumaon = warm hues (adjacent districts stay distinct)
COL = {'Uttarkashi': '#cfe8d6', 'Chamoli': '#bfe0f0', 'Rudraprayag': '#e4d9f2', 'Tehri Garhwal': '#f4e3b8', 'Dehradun': '#d7ecc0',
       'Garhwal': '#c9dcf3', 'Hardwar': '#f3d3d0', 'Pithoragarh': '#f7dcc0', 'Bageshwar': '#e8f2c2', 'Almora': '#f9cfa8',
       'Champawat': '#d9e9e0', 'Nainital': '#f6e7a6', 'Udham Singh Nagar': '#f1c9b4'}

b = []
b.append(f'<rect width="{W}" height="{H:.0f}" fill="#eef3f6"/>')
# neighbours (clipped to view)
for g, fill in ((hp, '#f2efe8'), (up, '#f2efe8'), (hr, '#f2efe8')):
    gg = g.intersection(view)
    b.append(f'<path d="{fr.path(gg)}" fill="{fill}" stroke="#b9b3a6" stroke-width="1"/>')
# outside-India area (Nepal / Tibet) tinted differently: everything in view not India
india_near = unary_union([uk, hp.intersection(view), up.intersection(view), hr.intersection(view)])
foreign = view.difference(india_near.buffer(1))
b.append(f'<path d="{fr.path(foreign)}" fill="#e6e2da" stroke="none"/>')
# districts
for _, r in d.iterrows():
    b.append(f'<path d="{fr.path(r.geometry)}" fill="{COL[r.DISTRICT]}" stroke="#7c8a99" stroke-width="1.1" stroke-dasharray="5 3"/>')
# division boundary (Garhwal vs Kumaon)
gar = unary_union([r.geometry for _, r in d.iterrows() if HI[r.DISTRICT][2] == 'G'])
kum = unary_union([r.geometry for _, r in d.iterrows() if HI[r.DISTRICT][2] == 'K'])
div_line = gar.boundary.intersection(kum.buffer(300))
b.append(f'<path d="{fr.path(div_line)}" fill="none" stroke="#9a3412" stroke-width="3.2" stroke-linecap="round"/>')
# state & international borders
shared = uk.boundary.intersection(unary_union([hp, up, hr]).buffer(400))
intl = uk.boundary.difference(unary_union([hp, up, hr]).buffer(400))
b.append(f'<path d="{fr.path(shared)}" fill="none" stroke="#475569" stroke-width="2.4"/>')
b.append(f'<path d="{fr.path(intl)}" fill="none" stroke="#b91c1c" stroke-width="5" stroke-opacity=".25"/>')
b.append(f'<path d="{fr.path(intl)}" fill="none" stroke="#b91c1c" stroke-width="2.4" stroke-dasharray="14 4 3 4"/>')

# neighbour labels (lon, lat)
for (lon, lat), t, sz in (((77.72, 31.25), 'हिमाचल प्रदेश', 22), ((78.25, 29.12), 'उत्तर प्रदेश', 22), ((80.75, 29.35), 'नेपाल', 24),
                          ((80.30, 31.10), 'तिब्बत (चीन)', 24), ((77.44, 30.26), 'हरियाणा', 15)):
    x, y = fr.ll(lon, lat)
    if 0 < x < W and 0 < y < H:
        b.append(text(x, y, t, sz, 600, '#8a8170', halo='#f2efe8', extra='letter-spacing="2"'))

# district labels + HQ markers
LAB_LL = {  # district-name label positions (lon, lat), placed by hand to avoid HQs and borders
    'Uttarkashi': (78.52, 31.05), 'Chamoli': (79.58, 30.66), 'Rudraprayag': (79.06, 30.50), 'Tehri Garhwal': (78.66, 30.24),
    'Dehradun': (77.86, 30.66), 'Garhwal': (78.80, 29.86), 'Hardwar': (77.98, 29.80), 'Pithoragarh': (80.45, 30.08),
    'Bageshwar': (79.88, 30.10), 'Almora': (79.55, 29.74), 'Champawat': (80.07, 29.22), 'Nainital': (79.33, 29.30),
    'Udham Singh Nagar': (79.82, 28.98)}
HQ_LABEL_SIDE = {'Dehradun': ('end', -10, 4), 'Hardwar': ('start', 9, 4), 'Udham Singh Nagar': ('start', 9, -6), 'Nainital': ('start', 9, -4),
                 'Champawat': ('start', 9, 4), 'Almora': ('end', -9, 4), 'Bageshwar': ('start', 9, 4), 'Pithoragarh': ('start', 9, 4),
                 'Garhwal': ('start', 9, 4), 'Rudraprayag': ('end', -9, 4), 'Chamoli': ('start', 9, 4), 'Tehri Garhwal': ('end', -9, 4),
                 'Uttarkashi': ('start', 9, 4)}
labels, marks, used = [], [], {}
for _, r in d.iterrows():
    name, hq, div, _ = HI[r.DISTRICT]
    x, y = fr.ll(*LAB_LL[r.DISTRICT]); dx = dy = 0
    labels.append(text(x + dx, y + dy, name, 21 if r.DISTRICT not in ('Rudraprayag', 'Champawat', 'Bageshwar', 'Hardwar') else 18, 700, '#1e293b', halo='#ffffff', halo_w=4))
    (lon, lat), src = hq_ll(r.DISTRICT)
    used[r.DISTRICT] = src
    hx, hy = fr.ll(lon, lat)
    is_cap = r.DISTRICT == 'Dehradun'
    if is_cap:
        marks.append(f'<path transform="translate({hx:.1f},{hy:.1f})" d="M0,-11 L3.2,-3.4 L11,-3.4 L4.8,1.6 L7,9.5 L0,4.8 L-7,9.5 L-4.8,1.6 L-11,-3.4 L-3.2,-3.4Z" fill="#dc2626" stroke="#fff" stroke-width="1.5"/>')
    else:
        marks.append(f'<circle cx="{hx:.1f}" cy="{hy:.1f}" r="5.5" fill="#fff" stroke="#111827" stroke-width="2.2"/><circle cx="{hx:.1f}" cy="{hy:.1f}" r="2" fill="#111827"/>')
    anc, ox, oy = HQ_LABEL_SIDE.get(r.DISTRICT, ('start', 9, 4))
    marks.append(text(hx + ox, hy + oy, hq + (' (राजधानी)' if is_cap else ''), 14, 600, '#374151', anchor=anc, halo='#ffffff', halo_w=3))
# summer capital Bhararisain (Gairsain), Chamoli
gx, gy = fr.ll(*PL.get('Gairsain', (79.29, 30.0546)))
marks.append(f'<path transform="translate({gx:.1f},{gy:.1f})" d="M0,-10 L2.9,-3.1 L10,-3.1 L4.4,1.5 L6.4,8.6 L0,4.4 L-6.4,8.6 L-4.4,1.5 L-10,-3.1 L-2.9,-3.1Z" fill="#f59e0b" stroke="#fff" stroke-width="1.5"/>')
marks.append(text(gx + 11, gy + 4, 'गैरसैंण (भराड़ीसैंण)', 13, 600, '#92400e', anchor='start'))
marks.append(text(gx + 11, gy + 20, 'ग्रीष्मकालीन राजधानी', 11, 400, '#92400e', anchor='start'))

# division names
for (lon, lat), t in (((78.80, 30.88), 'गढ़वाल मंडल'), ((80.32, 29.86), 'कुमाऊँ मंडल')):
    x, y = fr.ll(lon, lat)
    b.append(text(x, y, t, 25, 700, '#9a3412', halo=None, extra='opacity=".22" letter-spacing="4"'))

b += labels + marks

# title block (top-left, over Himachal)
b.append(f'<g><rect x="18" y="18" width="430" height="92" rx="10" fill="#ffffff" fill-opacity=".92" stroke="#cbd5e1"/>'
         + text(36, 58, 'उत्तराखंड', 34, 700, '#14532d', anchor='start', halo=None)
         + text(212, 58, 'राजनीतिक मानचित्र', 22, 600, '#334155', anchor='start', halo=None)
         + text(36, 92, '13 जिले · 2 मंडल (गढ़वाल 7, कुमाऊँ 6)', 16, 400, '#475569', anchor='start', halo=None) + '</g>')

# legend (bottom-right, over UP/Nepal)
lx, ly = W - 330, H - 300
leg = [f'<rect x="{lx}" y="{ly}" width="312" height="282" rx="10" fill="#fff" fill-opacity=".94" stroke="#cbd5e1"/>',
       text(lx + 18, ly + 32, 'संकेत', 18, 700, '#0f172a', anchor='start', halo=None)]
rows = [
    (f'<path d="M0,0 H42" stroke="#b91c1c" stroke-width="2.4" stroke-dasharray="14 4 3 4"/>', 'अंतरराष्ट्रीय सीमा'),
    (f'<path d="M0,0 H42" stroke="#475569" stroke-width="2.4"/>', 'राज्य सीमा'),
    (f'<path d="M0,0 H42" stroke="#9a3412" stroke-width="3.2"/>', 'मंडल सीमा (गढ़वाल / कुमाऊँ)'),
    (f'<path d="M0,0 H42" stroke="#7c8a99" stroke-width="1.1" stroke-dasharray="5 3"/>', 'जिला सीमा'),
    (f'<path transform="translate(21,0)" d="M0,-11 L3.2,-3.4 L11,-3.4 L4.8,1.6 L7,9.5 L0,4.8 L-7,9.5 L-4.8,1.6 L-11,-3.4 L-3.2,-3.4Z" fill="#dc2626"/>', 'राजधानी (देहरादून)'),
    (f'<path transform="translate(21,0)" d="M0,-10 L2.9,-3.1 L10,-3.1 L4.4,1.5 L6.4,8.6 L0,4.4 L-6.4,8.6 L-4.4,1.5 L-10,-3.1 L-2.9,-3.1Z" fill="#f59e0b"/>', 'ग्रीष्मकालीन राजधानी'),
    (f'<circle cx="21" cy="0" r="5.5" fill="#fff" stroke="#111827" stroke-width="2.2"/><circle cx="21" cy="0" r="2" fill="#111827"/>', 'जिला मुख्यालय'),
]
for i, (sym, lab) in enumerate(rows):
    yy = ly + 62 + i * 30
    leg.append(f'<g transform="translate({lx+18},{yy})">{sym}</g>' + text(lx + 74, yy + 5, lab, 15, 400, '#1f2937', anchor='start', halo=None))
b += leg
b.append(scalebar(fr, 34, H - 70, 50, (0, 25, 50)))
b.append(north_arrow(W - 60, 160, 1.1))
b.append(text(W - 14, H - 12, 'pahadpariksha.in  ·  सीमाएँ: जनगणना 2011 / भारतीय सर्वेक्षण विभाग (DataMeet, CC BY 4.0)', 12, 400, '#64748b', anchor='end', halo=None))
b.append(text(34, H - 92, 'पहाड़ परीक्षा', 15, 700, '#166534', anchor='start', halo='#eef3f6', extra='translate="no"'))

svg = svg_doc(W, H, ''.join(b), 'उत्तराखंड का राजनीतिक मानचित्र — 13 जिले, गढ़वाल व कुमाऊँ मंडल, जिला मुख्यालय')
open('out/uttarakhand-political.svg', 'w').write(svg)
print('size', W, round(H), 'hq sources', used)
to_png('out/uttarakhand-political.svg', 'out/uttarakhand-political.png', W, H)
