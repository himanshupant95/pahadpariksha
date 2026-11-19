# Uttarakhand maps (public/maps/)

Generated, not hand-drawn. Re-run to update:

1. Source data: run the **Map source data (manual)** workflow → it pushes SRTM elevation + OpenStreetMap layers to the `map-data` branch.
2. Boundaries: `git clone https://github.com/datameet/maps` (Survey-of-India-Index-Maps/Boundaries, CC BY 4.0).
3. `pip install geopandas rasterio pillow`, `npm i @fontsource/noto-sans-devanagari`, Google Chrome (headless) for PNG/PDF export.
4. `python3 political.py` / `python3 physical.py` → SVG + PNG in `out/`; then export WebP/HD/PDF into `public/maps/`.

Paths at the top of `mapkit.py` / `physical.py` point to the local data folders — adjust before running.

## Geography series maps (`/geography/`, Nov 2026)
- `geobase.py` — shared data/helpers (Census-2011 district boundaries from DataMeet `/home/claude/mapdata/dm`, OSM layers + `uk-dem-srtm90.tif` from the `map-data` branch at `/home/claude/mapdata/osm`). River-system classifier `riv_key` matches longest name first ("रामगंगा" ≠ "गंगा").
- `geo_ch1.py` → g01-india-location, g01-extent, g01-districts-blank.
- `geo_ch345.py [profiles|rivers|prayag|glaciers]` → g03-profile-garhwal/-kumaon (±6 km swath), g04-river-systems, g04-rivers-blank, g04-panch-prayag, g05-glaciers.
- `geo_atlas.py` → atlas-layers.svg (layer groups `L-*`, rivers `.riv-<sys>`) + atlas-relief.webp; loaded lazily by `src/components/geo/Atlas.astro`.
- Output in `out/geo/` (gitignored); publish as `public/maps/geo/<name>.webp` (≤1600 px) and `<name>-800.webp`.
