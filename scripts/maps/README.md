# Uttarakhand maps (public/maps/)

Generated, not hand-drawn. Re-run to update:

1. Source data: run the **Map source data (manual)** workflow → it pushes SRTM elevation + OpenStreetMap layers to the `map-data` branch.
2. Boundaries: `git clone https://github.com/datameet/maps` (Survey-of-India-Index-Maps/Boundaries, CC BY 4.0).
3. `pip install geopandas rasterio pillow`, `npm i @fontsource/noto-sans-devanagari`, Google Chrome (headless) for PNG/PDF export.
4. `python3 political.py` / `python3 physical.py` → SVG + PNG in `out/`; then export WebP/HD/PDF into `public/maps/`.

Paths at the top of `mapkit.py` / `physical.py` point to the local data folders — adjust before running.
