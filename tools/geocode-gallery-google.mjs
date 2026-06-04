// tools/geocode-gallery-google.mjs — richer location names via Google Maps Platform.
//
// Same clustering/output as geocode-gallery.mjs, but resolves each cluster centroid using
// Google (better POI coverage than OSM). Strategy per cluster:
//   1. Places "Nearby Search" (rankby=distance) → if the nearest establishment is within
//      NEAR_M meters, use its NAME (a real venue, e.g. "Palace at Weston").
//   2. else Geocoding reverse → the most specific street address.
// Geocoding happens in Node, so the public site needs no Maps API / CSP change.
//
// Setup (one-time, on YOUR side — needs a billing account on the GCP project):
//   - Enable "Geocoding API" and "Places API" for project-686d62b7-14f5-43c7-acc.
//   - Provide a key:  GOOGLE_MAPS_KEY=AIza... node tools/geocode-gallery-google.mjs
//     (falls back to the Firebase web apiKey in firebase.js if GOOGLE_MAPS_KEY is unset).
//
// Run:
//   GOOGLE_MAPS_KEY=... node tools/geocode-gallery-google.mjs            # dry-run
//   GOOGLE_MAPS_KEY=... node tools/geocode-gallery-google.mjs --commit   # write locationName
//   [--radius M] cluster radius (default 800)  [--near M] max venue distance (default 70)

import { readFileSync } from "node:fs";
import { getContent, patchContent } from "./firestore.mjs";

const args = process.argv.slice(2);
const commit = args.includes("--commit");
const num = (flag, def) => { const i = args.indexOf(flag); return i >= 0 ? Number(args[i + 1]) : def; };
const RADIUS_M = num("--radius", 800);
const NEAR_M = num("--near", 70);

let KEY = process.env.GOOGLE_MAPS_KEY;
if (!KEY) { const m = readFileSync(new URL("../firebase.js", import.meta.url), "utf8").match(/apiKey:\s*"([^"]+)"/); KEY = m && m[1]; }
if (!KEY) { console.error("No API key. Set GOOGLE_MAPS_KEY=... (or ensure firebase.js has apiKey)."); process.exit(1); }

const R = 6371000, toR = (d) => (d * Math.PI) / 180;
function haversine(a, b) {
    const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function jget(url) { const res = await fetch(url); if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); }

// nearest establishment name (if close enough)
async function placesNearest(lat, lng) {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&rankby=distance&type=establishment&key=${KEY}`;
    const j = await jget(url);
    if (j.status === "REQUEST_DENIED") throw new Error("Places: " + j.error_message);
    const r = j.results && j.results[0];
    if (!r || !r.geometry) return null;
    const d = haversine({ lat, lng }, { lat: r.geometry.location.lat, lng: r.geometry.location.lng });
    const city = (r.vicinity || "").split(",").pop().trim();
    return { name: r.name, city, dist: d };
}
// most specific reverse-geocode address
async function reverseAddress(lat, lng) {
    const j = await jget(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${KEY}`);
    if (j.status === "REQUEST_DENIED") throw new Error("Geocoding: " + j.error_message);
    const r = (j.results || [])[0];
    if (!r) return null;
    // strip the country/zip tail → "1234 NW 5th St, Plantation"
    return r.formatted_address.split(",").slice(0, 2).join(",").trim();
}

async function main() {
    const content = await getContent();
    const gallery = (Array.isArray(content.galleryImages) ? content.galleryImages : []).map(
        (im) => (typeof im === "string" ? { src: im } : { ...im })
    );

    const clusters = [];
    gallery.forEach((e, i) => {
        if (!e.gps || typeof e.gps.lat !== "number") return;
        const pt = { lat: e.gps.lat, lng: e.gps.lng };
        let c = clusters.find((cl) => haversine(cl, pt) <= RADIUS_M);
        if (!c) { c = { lat: pt.lat, lng: pt.lng, idxs: [] }; clusters.push(c); }
        c.idxs.push(i);
        const n = c.idxs.length; c.lat += (pt.lat - c.lat) / n; c.lng += (pt.lng - c.lng) / n;
    });

    console.log(`${clusters.length} cluster(s); resolving via Google (near<=${NEAR_M}m → venue, else address):\n`);
    for (const c of clusters) {
        const lat = +c.lat.toFixed(6), lng = +c.lng.toFixed(6);
        let label = null, how = "";
        try {
            const p = await placesNearest(lat, lng);
            if (p && p.dist <= NEAR_M) { label = p.city && p.name !== p.city ? `${p.name}, ${p.city}` : p.name; how = `venue ${Math.round(p.dist)}m`; }
            else if (p) how = `nearest venue "${p.name}" too far (${Math.round(p.dist)}m)`;
        } catch (e) { how = e.message; }
        if (!label) { try { const a = await reverseAddress(lat, lng); if (a) { label = a; how += (how ? " → " : "") + "address"; } } catch (e) { how += " | " + e.message; } }
        c.label = label || "(unresolved)";
        console.log(`  ${lat},${lng}  ${c.idxs.length} photos`);
        console.log(`    → ${c.label}    [${how}]`);
        await sleep(200);
    }

    if (!commit) { console.log("\n[dry-run] no write. Add --commit to save these labels."); return; }
    for (const c of clusters) for (const i of c.idxs) gallery[i] = { ...gallery[i], locationName: c.label };
    await patchContent({ galleryImages: gallery });
    console.log(`\n✓ Wrote locationName onto ${clusters.reduce((s, c) => s + c.idxs.length, 0)} entries.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
