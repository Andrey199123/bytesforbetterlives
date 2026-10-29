// Vercel Routing Middleware (no framework, no dependencies; runs BEFORE the filesystem). Jobs 1 and 3
// are impossible in vercel.json: its `rewrites` lose to the filesystem ("precedence is given to the
// filesystem prior to rewrites"), so a rewrite of "/" never beats index.html.
//
// 1. Chapter subdomains serve their chapter page at "/" with a 200 (was a 307 redirect to
//    /chapter-<id>.html, which left every chapter's canonical URL pointing at a redirect).
// 2. The .net domain (same deployment) 308s to its .org twin, path kept — .org has been the
//    canonical domain since 2026-10-29 (it was the other way round before). Serving both with a 200
//    is a full indexed duplicate of the site. Apex → www hops are Vercel domain settings and run
//    before this file; a .net apex that reaches it goes straight to www.bytesforbetterlives.org.
// 3. AI crawlers (and Bing, whose index feeds ChatGPT search) get a static SNAPSHOT of the page
//    from /_snapshots/, rendered by tools/prerender.mjs in the deploy Action. These bots fetch raw
//    HTML and run no JavaScript, and every page here is filled in by script.js — without this a
//    chapter page reads to them as 0 words. Same URL, same content, scripts stripped.
//    Googlebot is deliberately NOT on the list: it renders JavaScript itself.
//
// Failure modes are graceful by design: a page missing from PUBLIC_PAGES just serves the live page
// to bots, and a chapter missing from CHAPTERS serves the homepage at its subdomain root.
// tools/prerender.mjs imports both lists, so a snapshot exists for exactly the pages rewritten here.

export const config = { matcher: ["/", "/(.*\\.html)"] };

// Every chapter id with a chapter-<id>.html stub. Its <id>.bytesforbetterlives.org host also needs
// a DNS A record + the domain added in Vercel (see CHAPTERS_WITHOUT_SUBDOMAIN in script.js).
export const CHAPTERS = [
    "ahs", "cypress", "new-york", "virginia", "gainesville", "coral-springs",
    "miami", "doral", "russia", "turkey", "los-angeles", "parkland"
];

// Public pages that get a crawler snapshot. Admin pages, design-system.html and the stale test-*
// harnesses are intentionally absent.
export const PUBLIC_PAGES = [
    "index.html", "about.html", "impact.html", "ongoing-initiatives.html", "team.html",
    "chapters.html", "contact.html", "past-events.html", "gallery.html", "donate.html", "faq.html",
    ...CHAPTERS.map((id) => `chapter-${id}.html`)
];

// User-agent tokens of crawlers that don't execute JavaScript, plus Bing (renders JS unreliably,
// and explicitly endorses serving bots pre-rendered HTML).
export const SNAPSHOT_BOTS = new RegExp([
    "GPTBot", "OAI-SearchBot", "ChatGPT-User",
    "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai",
    "PerplexityBot", "Perplexity-User",
    "bingbot", "BingPreview", "msnbot",
    "Applebot", "Amazonbot", "meta-externalagent", "meta-externalfetcher",
    "DuckAssistBot", "MistralAI-User", "cohere-ai", "YouBot", "CCBot", "AI2Bot", "Diffbot"
].join("|"), "i");

const CHAPTER_HOST = /^([a-z-]+)\.bytesforbetterlives\.org$/;
const NET_HOST = /^(?:([a-z-]+)\.)?bytesforbetterlives\.net$/;

function forward(destination, request, headers) {
    const out = new Headers(headers || {});
    out.set("x-middleware-rewrite", new URL(destination, request.url).toString());
    return new Response(null, { headers: out });
}

function pass() {
    return new Response(null, { headers: { "x-middleware-next": "1" } });
}

export default function middleware(request) {
    try {
        const url = new URL(request.url);
        if (url.pathname.startsWith("/_snapshots/")) return pass();

        const net = NET_HOST.exec(url.hostname.toLowerCase());
        if (net) {
            url.hostname = `${!net[1] || net[1] === "www" ? "www" : net[1]}.bytesforbetterlives.org`;
            return Response.redirect(url.toString(), 308);
        }

        let page = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
        if (url.pathname === "/") {
            const host = CHAPTER_HOST.exec(url.hostname.toLowerCase());
            if (host && CHAPTERS.includes(host[1])) page = `chapter-${host[1]}.html`;
        }

        if (PUBLIC_PAGES.includes(page) && SNAPSHOT_BOTS.test(request.headers.get("user-agent") || "")) {
            return forward(`/_snapshots/${page}`, request, { "x-bfbl-render": "snapshot" });
        }
        if (url.pathname === "/" && page !== "index.html") return forward(`/${page}`, request);
        return pass();
    } catch (error) {
        return pass();
    }
}
