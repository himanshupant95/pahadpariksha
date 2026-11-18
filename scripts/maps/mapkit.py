"""Shared helpers for pahadpariksha.in Uttarakhand maps: projection, SVG building, font embedding, PNG export."""
import base64, json, subprocess, os, math
import geopandas as gpd
from shapely.geometry import shape, LineString, Polygon, MultiPolygon, MultiLineString, Point, box
from shapely.ops import unary_union, linemerge
from pyproj import Transformer

DM = '/home/claude/mapdata/dm/Survey-of-India-Index-Maps/Boundaries/'
CRS = 'EPSG:32644'  # UTM 44N — true shapes for Uttarakhand
FONT_DIR = '/home/claude/maps/node_modules/@fontsource/noto-sans-devanagari/files/'
TO_UTM = Transformer.from_crs('EPSG:4326', CRS, always_xy=True)

def load_admin():
    d = gpd.read_file(DM + 'India-Districts-2011Census.shp')
    d = d[d.ST_NM == 'Uttarakhand'].to_crs(CRS)
    s = gpd.read_file(DM + 'India-States.shp').to_crs(CRS)
    return d, s

class Frame:
    """Maps projected metres → SVG pixels (y down)."""
    def __init__(self, bounds, width, pad=0):
        minx, miny, maxx, maxy = bounds
        self.minx, self.maxy = minx - pad, maxy + pad
        self.k = width / ((maxx - minx) + 2 * pad)
        self.w = width
        self.h = ((maxy - miny) + 2 * pad) * self.k
    def xy(self, x, y):
        return ((x - self.minx) * self.k, (self.maxy - y) * self.k)
    def ll(self, lon, lat):
        return self.xy(*TO_UTM.transform(lon, lat))
    def ring(self, coords):
        pts = [self.xy(x, y) for x, y in coords]
        return 'M' + 'L'.join(f'{a:.1f},{b:.1f}' for a, b in pts)
    def path(self, geom):
        if geom is None or geom.is_empty: return ''
        t = geom.geom_type
        if t == 'Polygon':
            return ''.join(self.ring(r.coords) + 'Z' for r in [geom.exterior, *geom.interiors])
        if t in ('MultiPolygon', 'GeometryCollection', 'MultiLineString'):
            return ''.join(self.path(g) for g in geom.geoms)
        if t in ('LineString', 'LinearRing'):
            return self.ring(geom.coords)
        return ''

def font_css():
    css = []
    for w in (400, 600, 700):
        b = base64.b64encode(open(f'{FONT_DIR}noto-sans-devanagari-devanagari-{w}-normal.woff2', 'rb').read()).decode()
        css.append(f"@font-face{{font-family:'NSD';font-weight:{w};src:url(data:font/woff2;base64,{b}) format('woff2');}}")
        lb = f'{FONT_DIR}noto-sans-devanagari-latin-{w}-normal.woff2'
        if os.path.exists(lb):
            b2 = base64.b64encode(open(lb, 'rb').read()).decode()
            css.append(f"@font-face{{font-family:'NSD';font-weight:{w};src:url(data:font/woff2;base64,{b2}) format('woff2');unicode-range:U+0000-00FF,U+2000-206F,U+2190-21FF;}}")
    return ''.join(css)

def esc(s):
    return str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

def text(x, y, s, size=14, weight=400, fill='#1f2937', anchor='middle', halo='#ffffff', halo_w=3, extra=''):
    h = f' stroke="{halo}" stroke-width="{halo_w}" stroke-linejoin="round" paint-order="stroke"' if halo else ''
    return f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" font-weight="{weight}" fill="{fill}" text-anchor="{anchor}"{h} {extra}>{esc(s)}</text>'

def scalebar(fr, x, y, km=50, ticks=(0, 25, 50)):
    L = km * 1000 * fr.k
    out = [f'<g font-size="12" fill="#334155">']
    seg = L / (len(ticks) - 1)
    for i in range(len(ticks) - 1):
        out.append(f'<rect x="{x + i*seg:.1f}" y="{y}" width="{seg:.1f}" height="7" fill="{"#334155" if i % 2 == 0 else "#fff"}" stroke="#334155" stroke-width="1"/>')
    for i, t in enumerate(ticks):
        out.append(f'<text x="{x + i*seg:.1f}" y="{y+22}" text-anchor="middle">{t}</text>')
    out.append(f'<text x="{x + L + 8:.1f}" y="{y+8}" font-size="12">किमी</text></g>')
    return ''.join(out)

def north_arrow(x, y, s=1.0):
    return (f'<g transform="translate({x},{y}) scale({s})"><path d="M0,-34 L12,8 L0,0 L-12,8 Z" fill="#334155"/>'
            f'<path d="M0,-34 L0,0 L-12,8 Z" fill="#94a3b8"/>'
            f'<text x="0" y="28" font-size="15" font-weight="700" text-anchor="middle" fill="#334155">उ</text>'
            f'<text x="0" y="44" font-size="10" text-anchor="middle" fill="#64748b">N</text></g>')

def svg_doc(w, h, body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}" role="img" aria-label="{esc(title)}">'
            f'<title>{esc(title)}</title><style>{font_css()} text{{font-family:NSD,"Noto Sans Devanagari",sans-serif}}</style>{body}</svg>')

def to_png(svg_path, png_path, w, h, scale=1):
    html = svg_path + '.html'
    open(html, 'w').write(f'<!doctype html><meta charset="utf-8"><style>html,body{{margin:0;background:#fff}}</style><img src="{os.path.basename(svg_path)}" width="{w:.0f}" height="{h:.0f}">')
    # img-embedded SVG can't load fonts from network but data: fonts inside the SVG work
    subprocess.run(['google-chrome', '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
                    f'--force-device-scale-factor={scale}', f'--window-size={int(w)},{int(h)}',
                    '--virtual-time-budget=4000', f'--screenshot={png_path}', 'file://' + os.path.abspath(html)],
                   check=True, capture_output=True)
    os.remove(html)
