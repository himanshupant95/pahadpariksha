"""Interactive layered atlas SVG (no embedded fonts; page font is used). Each layer is <g id="L-…"> toggled by page JS."""
import sys
sys.argv = [sys.argv[0], 'none']
from geo_ch345 import *

W = 1000
fr = Frame(uk.bounds, W, pad=14000); H = fr.h
view = box(fr.minx, fr.maxy - H / fr.k, fr.minx + W / fr.k, fr.maxy)
TOL = 250  # metres
def P(g): return fr.path(g.simplify(TOL, preserve_topology=False))
relief = relief_b64(fr, W, H, mode='color', quality=92, S=2)
import io as _io
_im = Image.open(_io.BytesIO(base64.b64decode(relief))); _im.resize((W, int(round(H))), Image.LANCZOS).save('out/geo/atlas-relief.webp', 'WEBP', quality=72, method=6)
out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H:.0f}" class="atlas-svg" role="img" aria-labelledby="atlas-t"><title id="atlas-t">उत्तराखंड का परत-वार इंटरैक्टिव मानचित्र</title>',
       f'<rect width="{W}" height="{H:.0f}" fill="#e9edf0"/>',
       f'<g id="L-relief"><image href="/maps/geo/atlas-relief.webp" width="{W}" height="{H:.1f}" preserveAspectRatio="none"/></g>']
# districts (fill + names), division colour
g = ['<g id="L-districts">']
for _, r in d.iterrows():
    col = '#16a34a' if DIST_DIV[r.DISTRICT] == 'G' else '#d97706'
    g.append(f'<path d="{P(r.geometry)}" fill="{col}" fill-opacity=".14" stroke="#1f2937" stroke-opacity=".55" stroke-width=".8" stroke-dasharray="3 2" data-name="{DIST_HI[r.DISTRICT]}"/>')
for _, r in d.iterrows():
    p = r.geometry.representative_point(); x, y = fr.xy(p.x, p.y)
    g.append(text(x, y, DIST_HI[r.DISTRICT], 12, 700, '#14532d' if DIST_DIV[r.DISTRICT] == 'G' else '#92400e', halo='#fff', halo_w=3))
g.append('</g>'); out += g
# protected areas
pa = osm_polys('osm-protected.json')
g = ['<g id="L-protected" style="display:none">']
for t, poly in pa:
    pp = poly.intersection(uk)
    if pp.is_empty or pp.area < 2e7: continue
    g.append(f'<path d="{P(pp)}" fill="#15803d" fill-opacity=".28" stroke="#166534" stroke-width="1"/>')
g.append('</g>'); out += g
# glaciers
gl = osm_polys('osm-glaciers.json')
gg = unary_union([p for _, p in gl]).intersection(view)
out.append(f'<g id="L-glaciers"><path d="{fr.path(gg.simplify(120))}" fill="#f0f9ff" stroke="#0369a1" stroke-width=".5"/></g>')
# rivers by system
sysr, minor = classify_rivers(view)
g = ['<g id="L-rivers">', f'<path d="{P(unary_union(minor).intersection(ukb))}" fill="none" stroke="#3b82c4" stroke-width=".45" stroke-opacity=".6"/>']
for s, items in sysr.items():
    geom = unary_union([x[1] for x in items]).intersection(ukb)
    g.append(f'<path class="riv riv-{s}" d="{P(geom)}" fill="none" stroke="{SYS[s][1]}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>')
g.append('</g>'); out += g
# boundaries (always)
out.append('<g id="L-bounds">' + f'<path d="{P(shared)}" fill="none" stroke="#334155" stroke-width="1.6"/>' + f'<path d="{P(intl)}" fill="none" stroke="#b91c1c" stroke-width="1.8" stroke-dasharray="10 3 2 3"/></g>')
# peaks
g = ['<g id="L-peaks">']
for nm, lo, la, h, anc in PEAKS:
    x, y = fr.ll(lo, la)
    g.append(f'<path d="M{x:.1f},{y-6:.1f} L{x+5.5:.1f},{y+4:.1f} L{x-5.5:.1f},{y+4:.1f}Z" fill="#7c2d12" stroke="#fff" stroke-width="1"/>')
    g.append(text(x + (7 if anc == 'start' else -7), y + 4, f'{nm} {h:,}', 10.5, 700, '#3b1d0f', anchor=anc, halo='#fff', halo_w=2.6))
g.append('</g>'); out += g
# passes
g = ['<g id="L-passes">']
for nm, lo, la, anc in PASSES:
    x, y = fr.ll(lo, la)
    g.append(f'<g transform="translate({x:.1f},{y:.1f})"><path d="M-6,-4 Q0,2 6,-4 M-6,4 Q0,-2 6,4" fill="none" stroke="#111827" stroke-width="1.8"/></g>')
    g.append(text(x + (9 if anc == 'start' else -9), y + 4, nm + ' दर्रा', 10.5, 700, '#111827', anchor=anc, halo='#fff', halo_w=2.6))
g.append('</g>'); out += g
# prayags
g = ['<g id="L-prayag">']
for nm, lo, la in PRAYAG:
    x, y = fr.ll(lo, la)
    g.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="#facc15" stroke="#1d4ed8" stroke-width="1.8"><title>{nm}</title></circle>')
g.append('</g>'); out += g
# towns
g = ['<g id="L-towns">']
for en, hi, anc in (('Dehradun', 'देहरादून', 'start'), ('Haridwār', 'हरिद्वार', 'end'), ('Nainital', 'नैनीताल', 'end'), ('Almora', 'अल्मोड़ा', 'start'), ('Pithoragarh', 'पिथौरागढ़', 'start'),
                    ('Uttarkashi', 'उत्तरकाशी', 'start'), ('Gopeshwar', 'गोपेश्वर', 'end'), ('Rudrapur', 'रुद्रपुर', 'end'), ('Haldwani', 'हल्द्वानी', 'start'), ('Pauri', 'पौड़ी', 'end'), ('Bāgeshwar', 'बागेश्वर', 'start'), ('Champawat', 'चंपावत', 'start')):
    if en not in PL: print('miss', en); continue
    x, y = fr.ll(*PL[en])
    g.append(f'<rect x="{x-3:.1f}" y="{y-3:.1f}" width="6" height="6" fill="#111827" stroke="#fff" stroke-width="1"/>' + text(x + (7 if anc == 'start' else -7), y + 4, hi, 10.5, 600, '#111827', anchor=anc, halo='#fff', halo_w=2.6))
g.append('</g>'); out += g
out += [text(x, y, t, 13, 600, '#6b6455', halo='#fff', halo_w=3) for (x, y), t in ((fr.ll(77.72, 31.30), 'हिमाचल प्रदेश'), (fr.ll(78.25, 29.12), 'उत्तर प्रदेश'), (fr.ll(80.88, 29.62), 'नेपाल'), (fr.ll(80.30, 31.15), 'तिब्बत (चीन)'))]
out.append(north_arrow(W - 34, 52, .75))
out.append(scalebar(fr, 18, H - 34, 50, (0, 25, 50)))
out.append('</svg>')
svg = ''.join(out)
import os; os.makedirs('out/geo', exist_ok=True)
open('out/geo/atlas-layers.svg', 'w').write(svg)
print('atlas kB', len(svg) // 1024, W, round(H))
