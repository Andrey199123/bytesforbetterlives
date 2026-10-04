#!/usr/bin/env node
// IndexNow ping — see CLAUDE.md "AI crawlers & search". Tells Bing (whose index feeds ChatGPT
// search), Yandex, Seznam, Naver and the other IndexNow engines that every URL in sitemap.xml may
// have changed, so they recrawl in minutes instead of weeks. The deploy Action runs it after each
// production deploy triggered by a push (not the daily snapshot refresh).
//
// Ownership proof is the key file at the site root (<KEY>.txt, whose body is the key). IndexNow
// requires every URL in one submission to share the submission's host, and fetches the key from
// that host — so URLs are grouped per host, and each chapter subdomain proves itself with the same
// file (one deployment serves every host).
//
//   node tools/indexnow.mjs            # submit
//   node tools/indexnow.mjs --dry-run  # print what would be sent

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KEY = "5f4fd16d128d1617bf98ce8a802f205f";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry-run");

const sitemap = await readFile(resolve(ROOT, "sitemap.xml"), "utf8");
const byHost = new Map();
for (const [, loc] of sitemap.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    const host = new URL(loc).host;
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(loc);
}

let failed = 0;
for (const [host, urlList] of byHost) {
    const body = { host, key: KEY, keyLocation: `https://${host}/${KEY}.txt`, urlList };
    if (DRY) {
        console.log(JSON.stringify(body));
        continue;
    }
    try {
        const res = await fetch("https://api.indexnow.org/indexnow", {
            method: "POST",
            headers: { "content-type": "application/json; charset=utf-8" },
            body: JSON.stringify(body)
        });
        // 200 = accepted, 202 = accepted, key validation pending. 403 = key not found at
        // keyLocation, 422 = URL/host mismatch, 429 = too many requests.
        const ok = res.status === 200 || res.status === 202;
        if (!ok) failed += 1;
        console.log(`${ok ? "ok  " : "FAIL"} ${res.status} ${host} (${urlList.length} URL${urlList.length === 1 ? "" : "s"})`);
    } catch (error) {
        failed += 1;
        console.log(`FAIL --- ${host}: ${error.message}`);
    }
}
if (failed) process.exitCode = 1;
