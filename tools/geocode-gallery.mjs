// tools/geocode-gallery.mjs — turn the gallery's GPS coords into place-name labels.
//
// Clusters the GPS-bearing gallery entries by proximity (same venue = one cluster),
// reverse-geocodes each cluster's centroid via OpenStreetMap Nominatim, and writes a
// `locationName` onto every entry in that cluster. The runtime gallery render then groups
// photos into sections by `locationName` (and pulls no-GPS photos into a section when their
// takenAt is within ±2 days of a located photo — that part lives in script.js).
//
// Geocoding happens HERE (Node), not in the browser, so the public site needs no map API
// and no CSP change.
//
// Run:
//   node tools/geocode-gallery.mjs            # dry-run: print clusters + proposed names
//   node tools/geocode-gallery.mjs --commit   # write locationName to Firestore
//   [--radius M]   cluster radius in meters (default 800)

import { getContent, patchContent } from "./firestore.mjs";

const args = process.argv.slice(2);
const commit = args.includes("--commit");
const rIdx = args.indexOf("--radius");
const RADIUS_M = rIdx >= 0 ? Number(args[rIdx + 1]) : 800;
const UA = "bfbl-gallery-geocoder/1.0 (contact: storyleafai@gmail.com)";

function haversine(a, b) {
    const R = 6371000, toR = (d) => (d * Math.PI) / 180;
    const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// Build a concise label from a Nominatim address object: prefer a named venue, else a
// neighbourhood/road, always anchored to its city.
function labelFromAddress(addr, fallbackName) {
    if (!addr) return fallbackName || "Unknown location";
    const venue = addr.amenity || addr.building || addr.office || addr.leisure || addr.tourism ||
        addr.shop || addr.house_name || (fallbackName && !/^\d/.test(fallbackName) ? fallbackName : null);
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || addr.suburb || addr.county;
    const area = addr.neighbourhood || addr.suburb || addr.road;
    if (venue && city && venue !== city) return `${venue}, ${city}`;
    if (venue) return venue;
    if (area && city && area !== city) return `${area}, ${city}`;
    return city || area || (addr.state || "Unknown location");
}

async function reverseGeocode(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "en" } });
    if (!res.ok) throw new Error("Nominatim HTTP " + res.status);
    const j = await res.json();
    return { label: labelFromAddress(j.address, j.name), raw: j.display_name };
}

async function main() {
    const content = await getContent();
    const gallery = (Array.isArray(content.galleryImages) ? content.galleryImages : []).map(
        (im) => (typeof im === "string" ? { src: im } : { ...im })
    );

    // greedy proximity clustering of GPS-bearing entries
    const clusters = []; // { lat, lng, idxs: [] }
    gallery.forEach((e, i) => {
        if (!e.gps || typeof e.gps.lat !== "number") return;
        const pt = { lat: e.gps.lat, lng: e.gps.lng };
        let c = clusters.find((cl) => haversine(cl, pt) <= RADIUS_M);
        if (!c) { c = { lat: pt.lat, lng: pt.lng, idxs: [] }; clusters.push(c); }
        c.idxs.push(i);
        // running centroid
        const n = c.idxs.length;
        c.lat += (pt.lat - c.lat) / n;
        c.lng += (pt.lng - c.lng) / n;
    });

    console.log(`${clusters.length} location cluster(s) from ${clusters.reduce((s, c) => s + c.idxs.length, 0)} GPS photos:\n`);
    for (let k = 0; k < clusters.length; k++) {
        const c = clusters[k];
        let geo = { label: "(geocode failed)", raw: "" };
        try { geo = await reverseGeocode(c.lat.toFixed(6), c.lng.toFixed(6)); } catch (e) { geo.label = "(geocode error: " + e.message + ")"; }
        c.label = geo.label;
        const dates = c.idxs.map((i) => (gallery[i].takenAt || "").slice(0, 10)).filter(Boolean).sort();
        console.log(`  [${k + 1}] ${geo.label}`);
        console.log(`      ${c.idxs.length} photos · ${dates[0] || "?"}${dates.length > 1 ? " → " + dates[dates.length - 1] : ""} · ${c.lat.toFixed(5)},${c.lng.toFixed(5)}`);
        console.log(`      ↳ ${geo.raw}`);
        await sleep(1100); // Nominatim: max ~1 req/sec
    }

    if (!commit) { console.log("\n[dry-run] no write. Re-run with --commit to save these locationName labels."); return; }

    for (const c of clusters) for (const i of c.idxs) gallery[i] = { ...gallery[i], locationName: c.label };
    await patchContent({ galleryImages: gallery });
    console.log(`\n✓ Wrote locationName onto ${clusters.reduce((s, c) => s + c.idxs.length, 0)} entries.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
