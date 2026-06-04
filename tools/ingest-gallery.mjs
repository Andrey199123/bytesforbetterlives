// tools/ingest-gallery.mjs — match ORIGINAL photos to existing gallery images by CONTENT,
// then upload the originals (EXIF intact) and write the FULL metadata into Firestore.
//
// Why content matching: the originals have generic camera names (IMG_####.jpeg) that don't
// correspond to the gallery entry names (e.g. "palace at weston 1"). So we match by what the
// image LOOKS like — a perceptual hash (dHash) that's robust to the gallery copies being
// resized / re-encoded / converted to .avif. We ONLY ingest originals that confidently match
// something already in the gallery; unmatched originals are skipped (never added).
//
// For each matched original we:
//   1. upload the original bytes verbatim to Firebase Storage (EXIF stays embedded in the file),
//   2. parse the FULL EXIF block and store it on the entry (+ convenience takenAt/gps/camera),
//   3. REPLACE the matched gallery entry's src in place (no duplicates).
//
// Auth: gcloud Application Default Credentials (same as firestore.mjs).
// Run:
//   node tools/ingest-gallery.mjs <folder>            # dry-run: print the match plan only
//   node tools/ingest-gallery.mjs <folder> --commit   # upload + write Firestore
//   [--threshold N]  override the max dHash Hamming distance for a match (default 12)

import { readdir, readFile, stat } from "node:fs/promises";
import { join, basename, extname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import exifr from "exifr";
import sharp from "sharp";
import { getStorage } from "firebase-admin/storage";
import { getContent, patchContent } from "./firestore.mjs"; // initializes admin app

const BUCKET = "project-686d62b7-14f5-43c7-acc.firebasestorage.app";
const REPO_ROOT = resolve(new URL("..", import.meta.url).pathname);
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tif", ".tiff"]);
const CONTENT_TYPE = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".webp": "image/webp", ".avif": "image/avif", ".tif": "image/tiff", ".tiff": "image/tiff",
};

const args = process.argv.slice(2);
const commit = args.includes("--commit");
const tIdx = args.indexOf("--threshold");
const THRESHOLD = tIdx >= 0 ? Number(args[tIdx + 1]) : 12;
const tValArg = tIdx >= 0 ? args[tIdx + 1] : null;
const folder = args.find((a) => !a.startsWith("--") && a !== tValArg);
if (!folder) {
    console.error("Usage: node tools/ingest-gallery.mjs <folder> [--commit] [--threshold N]");
    process.exit(1);
}

// ---- perceptual hash (dHash, 64-bit) — robust to resize / re-encode / format change ----
async function dhash(buf) {
    const { data } = await sharp(buf, { failOn: "none" })
        .grayscale().resize(9, 8, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
    let bits = 0n;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            bits = (bits << 1n) | (data[r * 9 + c] < data[r * 9 + c + 1] ? 1n : 0n);
        }
    }
    return bits;
}
function hamming(a, b) { let x = a ^ b, n = 0; while (x) { n += Number(x & 1n); x >>= 1n; } return n; }

// ---- load bytes for an existing gallery entry (local repo path OR remote Storage URL) ----
async function loadEntryBytes(src) {
    if (/^https?:\/\//.test(src)) {
        const res = await fetch(src);
        if (!res.ok) throw new Error("HTTP " + res.status);
        return Buffer.from(await res.arrayBuffer());
    }
    return readFile(join(REPO_ROOT, src.replace(/^\//, "")));
}

// ---- pull ALL metadata, flattened; drop binary/huge fields so it's Firestore-safe ----
function cleanExif(raw) {
    if (!raw || typeof raw !== "object") return null;
    const out = {};
    for (const [k, v] of Object.entries(raw)) {
        if (v == null) continue;
        if (Buffer.isBuffer(v) || ArrayBuffer.isView(v)) continue;        // thumbnails, maker-note blobs
        if (v instanceof Date) { out[k] = v.toISOString(); continue; }
        if (Array.isArray(v)) { if (v.length <= 8 && v.every((x) => typeof x !== "object")) out[k] = v; continue; }
        if (typeof v === "object") continue;                               // skip nested structs
        if (typeof v === "string" && v.length > 300) continue;             // stray long strings
        out[k] = v;
    }
    return Object.keys(out).length ? out : null;
}
async function extractMeta(buf) {
    let raw = null;
    try { raw = await exifr.parse(buf, { tiff: true, exif: true, gps: true, ifd0: true, interop: true, mergeOutput: true }); }
    catch { /* file may have no EXIF */ }
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
    // 1. gather originals (images only; skip .mov etc.)
    const names = (await readdir(folder)).filter((n) => IMAGE_EXT.has(extname(n).toLowerCase()));
    const originals = [];
    for (const name of names) {
        const full = join(folder, name);
        if (!(await stat(full)).isFile()) continue;
        const buf = await readFile(full);
        let hash; try { hash = await dhash(buf); } catch { console.warn("  ! can't decode", name); continue; }
        originals.push({ name, full, buf, hash });
    }
    console.log(`Originals: ${originals.length} decodable image(s) (skipped ${names.length - originals.length})`);

    // 2. hash every existing gallery entry
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

    // 3. best gallery match per original
    const cand = [];
    for (const o of originals) {
        let best = -1, bestD = 999;
        for (let i = 0; i < gHashes.length; i++) {
            if (gHashes[i] == null) continue;
            const d = hamming(o.hash, gHashes[i]);
            if (d < bestD) { bestD = d; best = i; }
        }
        cand.push({ o, gi: best, dist: bestD });
    }

    // 4. one original per gallery entry — keep the closest; within-threshold only
    const bestForEntry = new Map(); // gi -> candidate
    for (const c of cand) {
        if (c.dist > THRESHOLD) continue;
        const prev = bestForEntry.get(c.gi);
        if (!prev || c.dist < prev.dist) bestForEntry.set(c.gi, c);
    }
    const accepted = [...bestForEntry.values()].sort((a, b) => a.dist - b.dist);
    const acceptedOrig = new Set(accepted.map((c) => c.o));

    // 5. report
    const galName = (i) => gallery[i].alt || decodeURIComponent((gallery[i].src || "").split("?")[0]).split("/").pop();
    console.log("MATCHES (will REPLACE in place):");
    for (const c of accepted) console.log(`  d=${String(c.dist).padStart(2)}  ${c.o.name.padEnd(20)} → ${galName(c.gi)}`);
    const noMatch = cand.filter((c) => !acceptedOrig.has(c.o));
    console.log(`\nNO CONFIDENT MATCH (skipped, nearest dist shown):`);
    for (const c of noMatch.sort((a, b) => a.dist - b.dist)) console.log(`  d=${String(c.dist).padStart(2)}  ${c.o.name}${c.dist <= THRESHOLD + 6 ? "  → near: " + galName(c.gi) : ""}`);
    console.log(`\n${accepted.length} matched · ${noMatch.length} skipped · threshold ≤ ${THRESHOLD}`);

    if (!commit) { console.log("\n[dry-run] no upload, no write. Re-run with --commit once the plan looks right."); return; }

    // 6. commit: upload original bytes + full metadata, replace entry src
    const bucket = getStorage().bucket(BUCKET);
    let withDate = 0;
    for (const c of accepted) {
        const meta = await extractMeta(c.o.buf);
        if (meta.takenAt) withDate++;
        const ext = extname(c.o.name).toLowerCase();
        const safe = c.o.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
        const path = `gallery/${randomUUID().slice(0, 8)}-${safe}`;
        const token = randomUUID();
        await bucket.file(path).save(c.o.buf, {
            resumable: false,
            contentType: CONTENT_TYPE[ext] || "application/octet-stream",
            metadata: { metadata: { firebaseStorageDownloadTokens: token } },
        });
        const src = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
        gallery[c.gi] = { ...gallery[c.gi], ...meta, src };
        process.stdout.write("↑");
    }
    console.log(`\n\nUploaded + enriched ${accepted.length} (${withDate} with a capture date).`);
    await patchContent({ galleryImages: gallery });
    console.log(`✓ Wrote ${gallery.length} gallery entries to site/content.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
