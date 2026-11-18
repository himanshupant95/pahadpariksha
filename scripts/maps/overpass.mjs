// Fetch Uttarakhand map features from OpenStreetMap (Overpass API) → out/*.json (raw Overpass JSON with geometry)
import { writeFile, mkdir } from 'node:fs/promises';
const BBOX = '28.60,77.40,31.60,81.20';
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const Q = {
  rivers: `way["waterway"="river"](${BBOX});`,
  streams_named: `way["waterway"="stream"]["name"](${BBOX});`,
  water: `(way["natural"="water"]["name"](${BBOX});relation["natural"="water"]["name"](${BBOX});way["water"="reservoir"](${BBOX}););`,
  glaciers: `(way["natural"="glacier"](${BBOX});relation["natural"="glacier"](${BBOX}););`,
  peaks: `node["natural"~"^(peak|volcano)$"]["name"](${BBOX});`,
  passes: `(node["mountain_pass"="yes"]["name"](${BBOX});node["natural"="saddle"]["name"](${BBOX}););`,
  places: `node["place"~"^(city|town)$"](${BBOX});`,
  protected: `(relation["boundary"~"^(national_park|protected_area)$"]["name"](${BBOX});way["boundary"~"^(national_park|protected_area)$"]["name"](${BBOX}););`,
};
await mkdir('out', { recursive: true });
for (const [name, body] of Object.entries(Q)) {
  const query = `[out:json][timeout:600];${body}out geom;`;
  let ok = false;
  for (const ep of ENDPOINTS) {
    for (let t = 0; t < 2 && !ok; t++) {
      try {
        const r = await fetch(ep, { method: 'POST', body: 'data=' + encodeURIComponent(query), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'pahadpariksha.in map builder (github actions)' }, signal: AbortSignal.timeout(620000) });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        await writeFile(`out/osm-${name}.json`, JSON.stringify(j));
        console.log(`${name}: ${j.elements.length} elements via ${ep}`);
        ok = true;
      } catch (e) { console.log(`${name}: ${ep} failed (${e.message}), retrying…`); await new Promise((r) => setTimeout(r, 20000)); }
    }
    if (ok) break;
  }
  if (!ok) console.log(`${name}: FAILED on all endpoints`);
  await new Promise((r) => setTimeout(r, 5000));
}
