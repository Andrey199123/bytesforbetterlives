#!/usr/bin/env node
// Crawler snapshots.
//
// AI crawlers (GPTBot, ClaudeBot, PerplexityBot…) fetch raw HTML and run no JavaScript, and every
// page on this site is filled in by script.js, so to them a chapter page is 0 words. This renders
// each page in headless Chrome against a local static server (so it is exactly the commit being
// deployed, with LIVE Firestore content), freezes it — final counter values, reveals settled,
// runtime scripts stripped, JSON-LD kept — and writes _snapshots/<page>. middleware.js serves those
// files to the bots at the page's real URL; humans never see them.
//
// It never fails the deploy: a page that won't render gets a copy of its raw shell, so every
// rewrite target exists (worst case = what bots got before this existed).
//
//   node tools/prerender.mjs [--out _snapshots] [--only about.html,faq.html]
//
// Needs playwright-core, deliberately NOT in package.json (Vercel's build runs `npm install`, and
// this is a deploy-time tool). The deploy Action installs it to a temp dir and passes its location
// in PLAYWRIGHT_CORE_DIR. Locally: `npm i --prefix /tmp/pw playwright-core` then
// `PLAYWRIGHT_CORE_DIR=/tmp/pw node tools/prerender.mjs`. Uses the installed Google Chrome
// (channel "chrome"; GitHub's ubuntu runners ship one), so no browser download.

import { constants } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir, copyFile, rm } from "node:fs/promises";
import { extname, join, normalize, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PUBLIC_PAGES } from "../middleware.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://www.bytesforbetterlives.net";
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i === -1 ? null : args[i + 1]; };
const OUT = resolve(ROOT, flag("--out") || "_snapshots");
const ONLY = flag("--only") ? flag("--only").split(",") : null;
const PAGES = ONLY ? PUBLIC_PAGES.filter((p) => ONLY.includes(p)) : PUBLIC_PAGES;
const CI = Boolean(process.env.GITHUB_ACTIONS);
const warn = (msg) => console.log(CI ? `::warning::${msg}` : `WARN ${msg}`);

const TYPES = {
    ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
    ".mjs": "text/javascript", ".json": "application/json", ".txt": "text/plain", ".xml": "application/xml",
    ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".avif": "image/avif", ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon",
    ".mp4": "video/mp4", ".woff2": "font/woff2"
};

function serve() {
    const server = createServer(async (req, res) => {
        try {
            let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
            if (path === "/") path = "/index.html";
            const file = normalize(join(ROOT, path));
            if (!file.startsWith(ROOT)) throw new Error("outside root");
            const body = await readFile(file);
            res.writeHead(200, { "content-type": TYPES[extname(file).toLowerCase()] || "application/octet-stream" });
            res.end(body);
        } catch {
            res.writeHead(404).end("not found");
        }
    });
    return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
}

const words = (text) => (text.match(/\S+/g) || []).length;
function rawWords(html) {
    return words(html
        .replace(/<head[\s\S]*?<\/head>/i, " ")
        .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ")
        .replace(/<[^>]+>/g, " "));
}

// Runs IN the page: freeze the rendered DOM into a static document.
function freeze() {
    document.querySelectorAll("script").forEach((s) => { if (s.type !== "application/ld+json") s.remove(); });
    document.querySelectorAll('link[rel="preload"][as="script"], link[rel="modulepreload"]').forEach((l) => l.remove());
    // JS-hidden states (hideSectionWhenEmpty's empty sections, a chapter page's "Chapter not found"
    // card) can never be shown without script — and a tag-stripping crawler would read them as text.
    document.querySelectorAll('body [hidden], body [style*="display: none"], body [style*="display:none"]').forEach((el) => el.remove());
    // Scroll reveals would leave below-the-fold cards at opacity:0 with no script to reveal them.
    document.querySelectorAll(".reveal-ready").forEach((el) => {
        el.classList.remove("reveal-ready");
        el.classList.add("reveal-in");
    });
    // Count-ups only run when scrolled into view: write the final value (same format as initCounters).
    document.querySelectorAll(".animated-counter[data-target]").forEach((el) => {
        const decimals = parseInt(el.getAttribute("data-decimals"), 10) || 0;
        const value = new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
            .format(parseFloat(el.getAttribute("data-target")) || 0);
        el.textContent = (el.getAttribute("data-prefix") || "") + value + (el.getAttribute("data-suffix") || "");
    });
    return { html: "<!DOCTYPE html>\n" + document.documentElement.outerHTML, words: (document.body.innerText.match(/\S+/g) || []).length };
}

async function launch() {
    const dir = process.env.PLAYWRIGHT_CORE_DIR;
    const require = createRequire(dir ? join(resolve(dir), "package.json") : import.meta.url);
    const { chromium } = require("playwright-core");
    return chromium.launch({ channel: process.env.PRERENDER_CHROME_CHANNEL || "chrome", headless: true });
}

async function render(context, origin, file) {
    const page = await context.newPage();
    try {
        await page.goto(`${origin}/${file}`, { waitUntil: "load", timeout: 45000 });
        await page.evaluate(() => window.BFBL_DATA_READY);
        if (file.startsWith("chapter-")) await page.waitForSelector("main[data-chapter-ready]", { timeout: 20000 });
        await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
        await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
        return await page.evaluate(freeze);
    } finally {
        await page.close();
    }
}

async function main() {
    const started = Date.now();
    if (!ONLY) await rm(OUT, { recursive: true, force: true }); // --only refreshes in place
    await mkdir(OUT, { recursive: true });

    const server = await serve();
    const origin = `http://127.0.0.1:${server.address().port}`;
    const rows = [];
    let browser = null;
    try {
        browser = await launch();
    } catch (error) {
        warn(`prerender: could not launch Chrome (${error.message.split("\n")[0]}) — every snapshot falls back to its raw shell`);
    }

    const context = browser && await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
    let live = false;
    for (const file of PAGES) {
        const shell = await readFile(join(ROOT, file), "utf8");
        const target = join(OUT, file);
        if (!context) {
            await copyFile(join(ROOT, file), target);
            rows.push([file, rawWords(shell), "—", "raw shell (no browser)"]);
            continue;
        }
        try {
            const snap = await render(context, origin, file);
            // Anything that leaked the local origin into the DOM must point at production instead.
            const html = snap.html.split(origin).join(SITE).replace("<head>",
                `<head>\n<!-- Static snapshot for crawlers that don't run JavaScript (see middleware.js). ` +
                `Rendered ${new Date().toISOString()} by tools/prerender.mjs; visitors get the live page. -->`);
            await writeFile(target, html);
            rows.push([file, rawWords(shell), snap.words, "rendered"]);
        } catch (error) {
            await copyFile(join(ROOT, file), target);
            warn(`prerender: ${file} failed (${error.message.split("\n")[0]}) — using its raw shell`);
            rows.push([file, rawWords(shell), "—", "raw shell (render failed)"]);
        }
    }
    // firebase-data.js caches its localStorage snapshot ONLY after a genuinely live read, so its
    // presence proves these pages were rendered from Firestore rather than the data.js seed.
    if (context) {
        const probe = await context.newPage();
        try {
            await probe.goto(`${origin}/robots.txt`);
            live = await probe.evaluate(() => Object.keys(localStorage).some((k) => k.startsWith("bfbl:data:")));
        } catch { /* reported below as not live */ } finally { await probe.close(); }
    }
    if (context && !live) warn("prerender: no live Firestore read was cached — snapshots may hold the data.js seed, not live content");

    if (browser) await browser.close();
    server.close();

    console.log(`\nprerender → ${OUT.replace(ROOT + "/", "")}/ (${((Date.now() - started) / 1000).toFixed(1)}s, live data: ${live ? "yes" : "NO"})`);
    console.log("page".padEnd(30) + "raw words".padStart(10) + "snapshot".padStart(10) + "  status");
    for (const [file, raw, snap, status] of rows) {
        console.log(file.padEnd(30) + String(raw).padStart(10) + String(snap).padStart(10) + "  " + status);
    }
}

main().catch((error) => {
    // Last resort: never block the deploy. Middleware rewrites to files that may now be missing,
    // so put raw shells in place for any page that has no snapshot yet (EXCL: never clobber a good one).
    warn(`prerender crashed: ${error.stack || error}`);
    mkdir(OUT, { recursive: true })
        .then(() => Promise.all(PAGES.map((file) => copyFile(join(ROOT, file), join(OUT, file), constants.COPYFILE_EXCL).catch(() => {}))))
        .finally(() => process.exit(0));
});
