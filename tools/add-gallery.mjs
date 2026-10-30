// tools/add-gallery.mjs — ADD new photos to the gallery (with de-duplication + EXIF).
//
// Sibling of ingest-gallery.mjs, but for NEW photos that aren't in the gallery yet.
// For a folder of originals it:
//   1. computes a perceptual hash (dHash) for each new file,
//   2. drops near/exact duplicates WITHIN the batch (keeps the first of each cluster),
//   3. drops any new file that already matches an EXISTING gallery entry (so re-runs are safe),
//   4. parses full EXIF (+ convenience takenAt/gps/camera) for the survivors,
//   5. uploads the original bytes (EXIF intact) to Firebase Storage,
//   6. APPENDS the survivors to site/content.galleryImages.
//
// After this, run tools/geocode-gallery.mjs to turn GPS into locationName labels.
//
// Auth: gcloud Application Default Credentials (same as firestore.mjs).
// Run:
//   node tools/add-gallery.mjs <folder>            # dry-run: print the add/skip plan only
//   node tools/add-gallery.mjs <folder> --commit   # upload + append to Firestore
//   [--dup N]   max dHash Hamming distance treated as a duplicate (default 10)
//   [--alt "text"]  default alt text for the added photos (else a generic BFBL caption)

import { readdir, readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { randomUUID } from "node:crypto";
import exifr from "exifr";
import sharp from "sharp";
import { getStorage } from "firebase-admin/storage";
import { getContent, patchContent } from "./firestore.mjs"; // initializes admin app

const BUCKET = "project-686d62b7-14f5-43c7-acc.firebasestorage.app";
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tif", ".tiff"]);
const CONTENT_TYPE = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".webp": "image/webp", ".avif": "image/avif", ".tif": "image/tiff", ".tiff": "image/tiff",
};
const REPO_ROOT = new URL("../public/", import.meta.url).pathname;

const args = process.argv.slice(2);
const commit = args.includes("--commit");
const dIdx = args.indexOf("--dup");
const DUP = dIdx >= 0 ? Number(args[dIdx + 1]) : 10;
const aIdx = args.indexOf("--alt");
const DEFAULT_ALT = aIdx >= 0 ? args[aIdx + 1] : "Bytes for Better Lives volunteers helping the community";
const consumed = new Set([dIdx >= 0 ? args[dIdx + 1] : null, aIdx >= 0 ? args[aIdx + 1] : null]);
const folder = args.find((a) => !a.startsWith("--") && !consumed.has(a));
if (!folder) {
    console.error("Usage: node tools/add-gallery.mjs <folder> [--commit] [--dup N] [--alt text]");
    process.exit(1);
}

// ---- perceptual hash (dHash, 64-bit) — robust to resize / re-encode / format change ----
async function dhash(buf) {
    const { data } = await sharp(buf, { failOn: "none" })
        .grayscale().resize(9, 8, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
    let bits = 0n;
    for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++)
            bits = (bits << 1n) | (data[r * 9 + c] < data[r * 9 + c + 1] ? 1n : 0n);
    return bits;
}
function hamming(a, b) { let x = a ^ b, n = 0; while (x) { n += Number(x & 1n); x >>= 1n; } return n; }

async function loadEntryBytes(src) {
    if (/^https?:\/\//.test(src)) {
        const res = await fetch(src);
        if (!res.ok) throw new Error("HTTP " + res.status);
        return Buffer.from(await res.arrayBuffer());
    }
    return readFile(join(REPO_ROOT, src.replace(/^\//, "")));
}

function cleanExif(raw) {
    if (!raw || typeof raw !== "object") return null;
    const out = {};
    for (const [k, v] of Object.entries(raw)) {
        if (v == null) continue;
        if (Buffer.isBuffer(v) || ArrayBuffer.isView(v)) continue;
        if (v instanceof Date) { out[k] = v.toISOString(); continue; }
        if (Array.isArray(v)) { if (v.length <= 8 && v.every((x) => typeof x !== "object")) out[k] = v; continue; }
        if (typeof v === "object") continue;
        if (typeof v === "string" && v.length > 300) continue;
        out[k] = v;
    }
    return Object.keys(out).length ? out : null;
}
async function extractMeta(buf) {
    let raw = null;
    try { raw = await exifr.parse(buf, { tiff: true, exif: true, gps: true, ifd0: true, interop: true, mergeOutput: true }); }
    catch { /* no EXIF */ }
    const meta = {};
    const exif = cleanExif(raw);
    if (exif) meta.exif = exif;
    const d = raw && (raw.DateTimeOriginal || raw.CreateDate || raw.ModifyDate);
    if (d) { const dt = d instanceof Date ? d : new Date(d); if (!isNaN(dt)) meta.takenAt = dt.toISOString(); }
    if (raw && typeof raw.latitude === "number" && typeof raw.longitude === "number") meta.gps = { lat: raw.latitude, lng: raw.longitude };
    const cam = raw ? [raw.Make, raw.Model].filter(Boolean).join(" ").trim() : "";
    if (cam) meta.camera = cam;
    return meta;
}

async function main() {
    // 1. gather + hash originals
    const names = (await readdir(folder)).filter((n) => IMAGE_EXT.has(extname(n).toLowerCase())).sort();
    const originals = [];
    for (const name of names) {
        const full = join(folder, name);
        if (!(await stat(full)).isFile()) continue;
        const buf = await readFile(full);
        let hash; try { hash = await dhash(buf); } catch { console.warn("  ! can't decode", name); continue; }
        originals.push({ name, full, buf, hash });
    }
    console.log(`Originals: ${originals.length} decodable image(s)\n`);

    // 2. hash existing gallery
    const content = await getContent();
    const gallery = (Array.isArray(content.galleryImages) ? content.galleryImages : []).map(
        (im) => (typeof im === "string" ? { src: im } : { ...im })
    );
    process.stdout.write(`Hashing ${gallery.length} existing gallery images`);
    const gHashes = [];
    for (let i = 0; i < gallery.length; i++) {
        try { gHashes[i] = await dhash(await loadEntryBytes(gallery[i].src)); process.stdout.write("."); }
        catch { gHashes[i] = null; process.stdout.write("x"); }
    }
    console.log(" done\n");

    // 3. classify each original: NEW / dup-in-batch / dup-of-existing
    const kept = [];                 // accepted hashes (existing + kept-this-run) for in-batch dedup
    for (const h of gHashes) if (h != null) kept.push(h);
    const add = [], skip = [];
    for (const o of originals) {
        // already in gallery?
        let exD = 999, exI = -1;
        for (let i = 0; i < gHashes.length; i++) { if (gHashes[i] == null) continue; const d = hamming(o.hash, gHashes[i]); if (d < exD) { exD = d; exI = i; } }
        if (exD <= DUP) { skip.push({ o, why: `already in gallery (d=${exD})` }); continue; }
        // near-dup of one we're keeping this run?
        let kD = 999;
        for (const h of kept) { const d = hamming(o.hash, h); if (d < kD) kD = d; }
        if (kD <= DUP) { skip.push({ o, why: `near-duplicate of a kept photo (d=${kD})` }); continue; }
        kept.push(o.hash);
        add.push(o);
    }

    console.log(`ADD (${add.length}):`);
    for (const o of add) console.log(`  + ${o.name}`);
    console.log(`\nSKIP (${skip.length}):`);
    for (const s of skip) console.log(`  - ${s.o.name}  (${s.why})`);
    console.log(`\n${add.length} to add · ${skip.length} skipped · dup threshold ≤ ${DUP}`);

    if (!commit) { console.log("\n[dry-run] no upload, no write. Re-run with --commit once the plan looks right."); return; }

    // 4. commit: upload + append
    const bucket = getStorage().bucket(BUCKET);
    let withDate = 0, withGps = 0;
    const newEntries = [];
    for (const o of add) {
        const meta = await extractMeta(o.buf);
        if (meta.takenAt) withDate++;
        if (meta.gps) withGps++;
        const ext = extname(o.name).toLowerCase();
        const safe = o.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
        const path = `gallery/${randomUUID().slice(0, 8)}-${safe}`;
        const token = randomUUID();
        await bucket.file(path).save(o.buf, {
            resumable: false,
            contentType: CONTENT_TYPE[ext] || "application/octet-stream",
            metadata: { metadata: { firebaseStorageDownloadTokens: token } },
        });
        const src = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
        newEntries.push({ src, alt: DEFAULT_ALT, ...meta });
        process.stdout.write("↑");
    }
    console.log(`\n\nUploaded ${newEntries.length} (${withDate} with capture date, ${withGps} with GPS).`);
    await patchContent({ galleryImages: [...gallery, ...newEntries] });
    console.log(`✓ Gallery now has ${gallery.length + newEntries.length} entries (was ${gallery.length}).`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
