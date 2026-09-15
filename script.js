// Subdomain Redirect Logic
(function() {
    const host = window.location.hostname;
    const isSubdomain = host.endsWith('.bytesforbetterlives.net') &&
                        !host.startsWith('www.bytesforbetterlives.net');

    if (isSubdomain) {
        if (window.location.pathname !== '/' && window.location.pathname !== '/index.html' && !window.location.pathname.startsWith('/chapter-')) {
            window.location.replace('https://www.bytesforbetterlives.net' + window.location.pathname + window.location.search + window.location.hash);
        } else {
            document.addEventListener('click', function(e) {
                const a = e.target.closest('a');
                if (a && a.getAttribute('href')) {
                    const href = a.getAttribute('href');
                    if (!href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('#')) {
                        e.preventDefault();
                        let newPath = href;
                        if (!newPath.startsWith('/')) newPath = '/' + newPath;
                        window.location.href = 'https://www.bytesforbetterlives.net' + newPath;
                    }
                }
            });
        }
    }
})();

(function () {
    const fallbackData = {
        contactEmail: "bytesforbetterlives@gmail.com",
        donateUrl: "https://www.gofundme.com/f/help-provide-ipads-to-local-schools",
        socialLinks: {
            instagram: "https://www.instagram.com/bytesforbetterlives?igsh=cmgzYzEwczV6YWI1",
            linkedin: "https://www.linkedin.com/company/bytes-for-better-lives/about/"
        },
        founders: [],
        officers: [],
        chapters: [],
        gallery: [],
        fundraisers: [],
        volunteers: []
    };

    const data = Object.assign({}, fallbackData, window.BFBL_DATA || {});
    let donateUrl = data.donateUrl || fallbackData.donateUrl;
    let contactEmail = data.contactEmail || fallbackData.contactEmail;
    const donateHubUrl = "donate.html";
    const peruFundraiserUrl = "https://www.gofundme.com/f/help-children-gain-access-education-tools-in-peru";

    // Declared here, above every call site, on purpose (used by initNavOverlay, far below). It used
    // to live beside that function as `var navOverlayObserver = null;`, which broke it: the binding
    // hoisted, but the `= null` INITIALIZER ran in source order — i.e. AFTER the parse-time call had
    // already stored an observer in it — wiping the reference, so no later call could disconnect
    // that observer. Pages ended up with two live IntersectionObservers toggling .is-over-hero at
    // two different thresholds. Never give this an initializer, here or anywhere else.
    var navOverlayObserver;

    // Founders are hardcoded here on purpose — they never change, so they are NOT stored in
    // Firestore / data.people and are NOT editable in the admin. Edit this list to update them.
    const FOUNDERS = [
        {
            name: "Aaron Pinto",
            title: "Co-Founder",
            photo: "images/team/aaron-pinto.jpg",
            fallbackPhoto: "images/logo.avif",
            detail: "",
            bio: "Aaron co-founded Bytes for Better Lives to bridge the digital divide through service, education, and donations.",
            contact: "",
            roles: ["founder"]
        },
        {
            name: "Pranav Rai",
            title: "Co-Founder",
            photo: "images/team/pranav-rai.jpg",
            fallbackPhoto: "images/logo.avif",
            detail: "",
            bio: "Pranav co-founded Bytes for Better Lives to help seniors and children build practical technology skills and access.",
            contact: "",
            roles: ["founder"]
        }
    ];

    // Central member registry (data.people): derive the role-specific rosters so the rest of the
    // app can keep using data.founders, data.officers, etc. Re-run whenever the data changes.
    // Founders are always the hardcoded FOUNDERS list (never from data.people / Firestore).
    function deriveRoles() {
        data.founders = FOUNDERS;
        if (!Array.isArray(data.people)) return;
        const byRole = function (role) {
            return data.people.filter(function (person) {
                return person && Array.isArray(person.roles) && person.roles.indexOf(role) !== -1;
            });
        };
        data.officers = byRole("leadership");
        data.design = byRole("design");
        data.volunteers = byRole("volunteer");
        // Board of Directors = members explicitly flagged in the admin (person.execBoard), NOT a
        // heuristic over leadership/design. This is the single source of truth for that section.
        // (The field stays `execBoard` to match Firestore; only the display name is "Board of Directors".)
        data.execBoard = data.people.filter(function (person) { return person && person.execBoard === true; });
    }
    deriveRoles();

    const navItems = [
        { label: "About", href: "about.html" },
        { label: "Impact", href: "impact.html" },
        { label: "Initiatives", href: "ongoing-initiatives.html" },
        { label: "Team", href: "team.html" },
        {
            label: "Chapters",
            href: "chapters.html",
            match: [
                "chapters.html",
                "chapter-ahs.html",
                "chapter-cypress.html",
                "chapter-new-york.html",
                "chapter-gainesville.html",
                "chapter-russia.html",
                "chapter-turkey.html"
            ]
        },
        { label: "Gallery", href: "gallery.html" }
    ];

    // Renders the standalone gallery page, GROUPED INTO LOCATION SECTIONS, from
    // data.galleryImages (Firestore). Each photo's location comes from `locationName`
    // (reverse-geocoded from GPS at ingest time — see tools/geocode-gallery.mjs). Photos
    // without GPS are folded into a location section when their `takenAt` is within ±2 days
    // of a located photo (same event, location stripped on share); anything left lands in a
    // final "No location" section.
    // Human heading for the catch-all bucket (photos with no locationName and no nearby-dated
    // located photo). "No location" leaked an internal data label into the UI.
    var GALLERY_NO_LOCATION = "More moments";

    function galleryLocationFor(im, anchors) {
        if (im.locationName) return im.locationName;        // has its own GPS-derived location
        var t = im.takenAt ? Date.parse(im.takenAt) : NaN;
        if (isNaN(t)) return GALLERY_NO_LOCATION;
        var WINDOW = 2 * 86400000;                          // ±2 days
        var best = null, bestDelta = Infinity;
        for (var i = 0; i < anchors.length; i++) {
            var delta = Math.abs(anchors[i].t - t);
            if (delta <= WINDOW && delta < bestDelta) { bestDelta = delta; best = anchors[i].loc; }
        }
        return best || GALLERY_NO_LOCATION;
    }

    function galleryFormatDate(takenAt) {
        if (!takenAt) return "";
        var d = new Date(takenAt);
        return isNaN(d) ? "" : d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    }

    function galleryTileMarkup(im, i) {
        var src = im.src || "";
        var alt = im.alt || "";
        var dateStr = galleryFormatDate(im.takenAt);
        var loc = im.locationName || "";
        // Deterministic size cadence (per section) → a varied mosaic, not a uniform grid.
        var cls = "g-tile";
        if (i % 16 === 0) cls += " g-feature";
        else if (i % 5 === 3) cls += " g-wide";
        else if (i % 7 === 5) cls += " g-tall";
        // On hover: the capture date (figcaption overlay + native title tooltip). The date +
        // location also ride along as data-* so the lightbox can caption the enlarged photo.
        var caption = dateStr;
        var titleAttr = dateStr ? ' title="' + escapeHTML(dateStr) + '"' : "";
        var dataAttrs = (dateStr ? ' data-taken="' + escapeHTML(dateStr) + '"' : "") +
            (loc ? ' data-location="' + escapeHTML(loc) + '"' : "");
        var isVideo = /\.(mp4|webm|mov)$/i.test(src) || src.includes('/video/upload/');
        var mediaTag = isVideo 
            ? '<video class="clickable-image" src="' + escapeHTML(src) + '" alt="' + escapeHTML(alt) + '"' + titleAttr + dataAttrs + ' autoplay loop muted playsinline data-fallback="images/logo.avif"></video>'
            : '<img class="clickable-image" src="' + escapeHTML(src) + '" alt="' + escapeHTML(alt) + '"' + titleAttr + dataAttrs + ' loading="lazy" decoding="async" data-fallback="images/logo.avif">';
            
        return '<figure class="' + cls + '">' +
            mediaTag +
            (caption ? '<figcaption>' + escapeHTML(caption) + '</figcaption>' : '') +
            '</figure>';
    }

    function galleryDateLabel(items) {
        var ts = [];
        items.forEach(function (im) { var t = Date.parse(im.takenAt); if (!isNaN(t)) ts.push(t); });
        if (!ts.length) return "";
        ts.sort(function (a, b) { return a - b; });
        var fmt = function (t) { return new Date(t).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }); };
        var first = fmt(ts[0]), last = fmt(ts[ts.length - 1]);
        return first === last ? first : first + " – " + last;
    }

    function renderGalleryImages() {
        var root = document.querySelector(".gallery-locations");
        if (!root) return;
        var imgs = (data.galleryImages || []).map(function (im) {
            return typeof im === "string" ? { src: im } : (im || {});
        });

        // Empty state: data.js carries no gallery seed, so if Firestore is empty/unreachable the
        // page body would be blank under the hero. Say so instead of rendering nothing.
        if (!imgs.length) {
            root.innerHTML = '<p class="gallery-empty">Photos from our latest events are on the way — check back soon.</p>';
            return;
        }

        var videos = imgs.filter(function(im) { return /\.(mp4|webm|mov)$/i.test(im.src) || (im.src && im.src.indexOf('/video/upload/') !== -1); }).length;
        var photos = imgs.length - videos;
        var subtitle = document.querySelector(".page-gallery .hero-subtitle");
        if (subtitle && imgs.length > 0) {
            var str = [];
            if (photos > 0) str.push(photos + " photo" + (photos !== 1 ? "s" : ""));
            if (videos > 0) str.push(videos + " video" + (videos !== 1 ? "s" : ""));
            subtitle.textContent = "A collection of " + str.join(" and ") + " from BFBL service days, events, donations, and chapter activities. Tap any media to view it full screen.";
        }

        // Time anchors = located photos; they pull in nearby-in-time photos that lost their GPS.
        var anchors = [];
        imgs.forEach(function (im) {
            if (im.locationName && im.takenAt) {
                var t = Date.parse(im.takenAt);
                if (!isNaN(t)) anchors.push({ t: t, loc: im.locationName });
            }
        });

        // Bucket every photo into a location (first-seen order preserved).
        var order = [], buckets = {};
        imgs.forEach(function (im) {
            var name = galleryLocationFor(im, anchors);
            if (!buckets[name]) { buckets[name] = []; order.push(name); }
            buckets[name].push(im);
        });

        // Section order: located sections newest-event-first, "No location" always last.
        function sectionTime(name) {
            var max = -Infinity;
            buckets[name].forEach(function (im) { var t = Date.parse(im.takenAt); if (!isNaN(t) && t > max) max = t; });
            return max;
        }
        var sections = order.filter(function (n) { return n !== GALLERY_NO_LOCATION; })
            .sort(function (a, b) { return sectionTime(b) - sectionTime(a); });
        if (buckets[GALLERY_NO_LOCATION]) sections.push(GALLERY_NO_LOCATION);

        root.innerHTML = sections.map(function (name) {
            var items = buckets[name];
            items.sort(function (a, b) { return (Date.parse(a.takenAt) || 0) - (Date.parse(b.takenAt) || 0); });
            var meta = galleryDateLabel(items);
            var sub = (meta ? meta + " · " : "") + items.length + " photo" + (items.length === 1 ? "" : "s");
            return '<section class="gallery-location">' +
                '<div class="gallery-location-head">' +
                '<h2 class="gallery-location-title">' + escapeHTML(name) + '</h2>' +
                '<p class="gallery-location-meta">' + escapeHTML(sub) + '</p>' +
                '</div>' +
                '<div class="photo-gallery-grid" data-lightbox-group>' +
                items.map(galleryTileMarkup).join("") +
                '</div>' +
                '</section>';
        }).join("");
    }

    // Static pages carry a seed donate-hub href on their Donate CTAs; re-point them at the hub so
    // the site-wide buttons all land on the same give page.
    function syncDonateLinks() {
        document.querySelectorAll("[data-donate-url]").forEach(function (link) {
            link.href = safeUrl(donateHubUrl);
            link.removeAttribute("target");
            link.removeAttribute("rel");
        });
    }

    // PAGE CHROME — the navbar, the footer, the skip link and their behaviour. None of it needs the
    // Firestore fetch: the only data-driven piece is the Chapters dropdown, which renders from the
    // data.js seed (or firebase-data.js's localStorage snapshot) and is patched in place afterwards
    // by refreshChaptersDropdown(). So this runs SYNCHRONOUSLY at parse time instead of waiting
    // behind BFBL_DATA_READY (up to 3s), which is what left the bar logo-only on every navigation.
    // Every renderer it calls null-guards its root, so this is a harmless no-op on pages without a
    // navbar/footer.
    // ⚠️ CALL EXACTLY ONCE per page, from boot() — the LAST statement of this IIFE (see the call
    // site for why it cannot move up): initNavDropdowns and initMobileNavigation add listeners
    // (initMobileNavigation with no guard at all — a second call toggles the hamburger twice per
    // click, opening then instantly closing the drawer).
    var chromeRendered = false;
    function renderChrome() {
        renderNavigation();
        initNavDropdowns();
        renderFooter();
        syncDonateLinks();
        ensureSkipLink();
        initMobileNavigation();
        // LAST: the overlay navbar's transparent state is JS-applied (solid is the CSS default) and
        // its IntersectionObserver rootMargin measures navbar.offsetHeight, so the bar has to be
        // filled in first. Called again from ensureChapterProfileLayout() once a chapter hero exists
        // — but only on the COLD path, where that runs after this (see the flag).
        chromeRendered = true;
        initNavOverlay();
    }

    // Renderers that read NOTHING from Firestore or data.js — the impact stat band (`stats`), the
    // program tiles (`services`) and the donate methods are all hardcoded arrays. They can paint at
    // parse time on EVERY load, warm or cold, so they are out of initRender and into boot() below.
    function renderStaticBody() {
        renderHomeStats();
        // With the band. It used to sit in initRender, behind the Firestore wait, so on a cold load
        // the band showed five literal zeroes for as long as that took — and any numeral the reader
        // had already scrolled past stayed 0 forever, because the observer never fires for what is
        // behind you (see the scrolled-past branch in initCounters).
        initCounters();
        renderWhatWeDo();
        renderDonatePage();
    }

    function initRender() {
        initVercelAnalytics();
        initPlausible();
        renderHomePage();

        renderGalleryImages();
        renderInitiativesPage();
        renderTeamPage();
        renderChapterDirectoryPage();
        renderChapterMaps();
        renderChapterProfilePage();
        // Again after renderChapterProfilePage (renderChrome already ran it): chapter stubs only get
        // their <main> injected there, and the skip link needs that <main> to exist so its
        // #main-content target is real. ensureSkipLink sets main.id BEFORE its own bail-out, so the
        // second call costs nothing on pages whose <main> is static.
        ensureSkipLink();
        initImageFallbacks();
        initCarousels();
        initLightbox();
        initStoryCards();
        initRevealEffects();
        initSmoothScroll();
    }

    // Render the page BODY from the live content — the data.js seed only if Firestore is empty or
    // unreachable. Re-syncs data and derives roles first; the chrome is already on screen by then
    // (renderChrome), so all this pass owes the navbar/footer is a patch of the two bits live data
    // can actually change.
    //
    // ⚠️ RUNS EXACTLY ONCE per page. Two callers race for it and the guard settles which wins:
    //   - boot(), at parse time, WHEN firebase-data.js installed its localStorage snapshot
    //     synchronously (window.BFBL_DATA_SYNC) — i.e. every warm start, which is what "switching
    //     pages" is. The live content is already in window.BFBL_DATA at that moment, so the body
    //     paints in the FIRST frame instead of a beat after it.
    //   - the DOMContentLoaded handler below, on a cold start, once the Firestore fetch (or its 3s
    //     timeout) lands — today's behaviour, unchanged.
    // Rendering twice is NOT an option: initLightbox/initCarousels/initStoryCards/initSmoothScroll
    // all bind listeners with no re-entry guard, and initRevealEffects would blank cards the reader
    // has already scrolled to. On a warm start the two passes would also be identical by
    // construction — the background fetch deliberately does not re-render the current view.
    var bodyRendered = false;
    function renderBodyOnce() {
        if (bodyRendered) return;
        bodyRendered = true;
        Object.assign(data, window.BFBL_DATA || {});
        donateUrl = data.donateUrl || donateUrl;
        contactEmail = data.contactEmail || contactEmail;
        deriveRoles();
        refreshChaptersDropdown();
        refreshFooter();
        initRender();
    }

    document.addEventListener("DOMContentLoaded", function () {
        if (bodyRendered) return;
        var ready = (window.BFBL_DATA_READY && typeof window.BFBL_DATA_READY.then === "function")
            ? window.BFBL_DATA_READY
            : Promise.resolve();
        ready.then(renderBodyOnce);
    });

    function initVercelAnalytics() {
        // Vercel Web Analytics (static HTML/JS).
        // Safe on non-Vercel hosts: script will 404 and be ignored.
        // Docs/community show an HTML snippet using `window.vaq` + the insights script.
        if (window.__bfblVercelAnalytics) return;
        window.__bfblVercelAnalytics = true;

        window.va = window.va || function () {
            (window.vaq = window.vaq || []).push(arguments);
        };

        const script = document.createElement("script");
        script.defer = true;
        script.src = "/_vercel/insights/script.js";
        script.onerror = function () {
            // Ignore (Netlify/GitHub Pages/etc).
        };
        document.head.appendChild(script);
    }

    function initPlausible() {
        // Plausible Analytics (cookie-less, no consent banner needed). data-domain is the ONE
        // dashboard site: every serving host (www/apex/chapter subdomains) reports into it.
        // The outbound-links variant also records clicks on external links (GoFundMe/PayPal donate
        // CTAs). Plausible's script no-ops on localhost, so local dev never records visits.
        if (window.__bfblPlausible) return;
        window.__bfblPlausible = true;
        if (/admin/.test(String(location.pathname || "").toLowerCase())) return; // no admin traffic
        // Official queue stub so plausible("event") custom calls are safe before the script loads.
        window.plausible = window.plausible || function () {
            (window.plausible.q = window.plausible.q || []).push(arguments);
        };
        const script = document.createElement("script");
        script.defer = true;
        script.setAttribute("data-domain", "bytesforbetterlives.net");
        script.src = "https://plausible.io/js/script.outbound-links.js";
        script.onerror = function () {
            // Blocked/offline — analytics is best-effort.
        };
        document.head.appendChild(script);
    }

    // "smooth" normally, but "auto" (instant) when the user prefers reduced motion.
    function scrollBehavior() {
        return (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) ? "auto" : "smooth";
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (char) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[char];
        });
    }

    // Scheme allowlist for any data-driven value that becomes an href. escapeHTML alone does NOT
    // stop a `javascript:`/`data:` URL (no special chars to escape), so route every such URL through
    // this first: `href="${escapeHTML(safeUrl(x))}"`. Anything not http(s)/mailto becomes "#".
    function safeUrl(value) {
        var raw = String(value ?? "").trim();
        if (!raw) return "#";
        try {
            var p = new URL(raw, window.location.href).protocol;
            return (p === "http:" || p === "https:" || p === "mailto:") ? raw : "#";
        } catch (e) {
            return "#";
        }
    }

    // Returns the base domain to use for chapter subdomains.
    function chapterBaseDomain() {
        return "bytesforbetterlives.net";
    }

    // Whether we should generate chapter subdomain URLs in this environment.
    // Local previews (localhost, file://, netlify.app, vercel.app, etc.) keep using relative chapter pages.
    function shouldUseChapterSubdomains() {
        var host = String(window.location.hostname || "").toLowerCase().replace(/^www\./, "");
        return host === "bytesforbetterlives.net"
            || host.endsWith(".bytesforbetterlives.net");
    }

    // Public-facing URL for a chapter. Falls back to the chapter page file when subdomains
    // are not available (local dev / previews) or when subdomain is missing.
    function chapterPublicHref(chapter) {
        var pageHref = (chapter && chapter.pageHref) || (chapter && chapter.id ? ("chapter-" + chapter.id + ".html") : "chapters.html");
        var sub = chapter && (chapter.subdomain || chapter.id);
        if (!sub || !shouldUseChapterSubdomains()) return pageHref;
        // Use an explicit file path under the subdomain so it works even without server-side rewrites.
        return "https://" + String(sub).toLowerCase() + "." + chapterBaseDomain() + "/" + pageHref;
    }

    function currentPageName() {
        return window.location.pathname.split("/").pop() || "index.html";
    }

    function setText(selector, value) {
        const element = document.querySelector(selector);
        if (element) element.textContent = value;
    }

    function statusKey(status) {
        return String(status || "").trim().toLowerCase();
    }

    function statusClass(status) {
        const key = statusKey(status);
        if (key === "active") return "status-active";
        if (key === "launching") return "status-launching";
        return "status-prospective";
    }

    function statusLabel(status, chapter) {
        const tag = chapter && chapter.statusTag ? String(chapter.statusTag).trim() : "";
        const value = tag || (status || "Prospective");
        return `${value} Chapter`;
    }

    function isExecutiveChapter(chapter) {
        const tag = chapter && chapter.statusTag ? String(chapter.statusTag).trim() : "";
        return tag.toLowerCase() === "executive";
    }

    function chapterStatusBadgeMarkup(chapter) {
        // Every card gets a status pill. The founding (AHS) chapter is special; everyone else
        // shows their status (Active / Launching / …), defaulting to "Active".
        if (isExecutiveChapter(chapter)) {
            return `<span class="status-badge status-executive">Founding Chapter</span>`;
        }
        const status = (chapter && chapter.status ? String(chapter.status).trim() : "") || "Active";
        return `<span class="status-badge ${statusClass(status)}">${escapeHTML(status)}</span>`;
    }

    function chapterStatusDetail(chapter) {
        return isExecutiveChapter(chapter) ? statusLabel(chapter.status, chapter) : "";
    }

    function imageMarkup(src, alt, className, fallback, loading, fetchPriority) {
        const loadMode = loading === "eager" ? "eager" : "lazy";
        const priorityAttr = fetchPriority ? ` fetchpriority="${escapeHTML(fetchPriority)}"` : "";
        return `<img src="${escapeHTML(src || "images/logo.avif")}" alt="${escapeHTML(alt || "Bytes for Better Lives image")}"${className ? ` class="${escapeHTML(className)}"` : ""} data-fallback="${escapeHTML(fallback || "images/logo.avif")}" loading="${loadMode}" decoding="async"${priorityAttr}>`;
    }

    // Up to two initials from a name, e.g. "Aaron Pinto" -> "AP", "Ipek" -> "IP".
    function personInitials(name) {
        const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return "?";
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    // A photo only "counts" if it's a real portrait — the logo placeholder means "no picture".
    function hasRealPhoto(photo) {
        return Boolean(photo) && !/logo\.avif(\?|#|$)/i.test(photo);
    }

    function initialsAvatarMarkup(name, className) {
        return `<span class="avatar-initials${className ? ` ${escapeHTML(className)}` : ""}" role="img" aria-label="${escapeHTML(name || "Member")}">${escapeHTML(personInitials(name))}</span>`;
    }

    // Per-member photo framing (set in the admin): zoom + position within the circle. Returns an
    // inline style string when the member has adjusted it, else "" (no change for everyone else).
    function photoFitStyle(name) {
        const p = personByName(name);
        if (!p) return "";
        const zoom = Number(p.photoZoom) || 1;
        const x = (p.photoX == null) ? 50 : Number(p.photoX);
        const y = (p.photoY == null) ? 50 : Number(p.photoY);
        if (zoom === 1 && x === 50 && y === 50) return "";
        return `object-fit:cover;object-position:${x}% ${y}%;transform:scale(${zoom});transform-origin:${x}% ${y}%;`;
    }

    // Renders a person's portrait, or their initials on the brand green when no real photo exists.
    // If a real photo fails to load, initImageFallbacks swaps it for the initials avatar.
    function personPhotoMarkup(name, photo, className, loading, fetchPriority) {
        if (!hasRealPhoto(photo)) return initialsAvatarMarkup(name, className);
        const loadMode = loading === "eager" ? "eager" : "lazy";
        const priorityAttr = fetchPriority ? ` fetchpriority="${escapeHTML(fetchPriority)}"` : "";
        const fit = photoFitStyle(name);
        const styleAttr = fit ? ` style="${fit}"` : "";
        const img = `<img src="${escapeHTML(photo)}" alt="${escapeHTML(`${name || "Member"} portrait`)}"${className ? ` class="${escapeHTML(className)}"` : ""} data-name="${escapeHTML(name || "")}" data-initials-fallback="1" loading="${loadMode}" decoding="async"${priorityAttr}${styleAttr}>`;
        if (!fit) return img;
        // Adjusted photos are wrapped in a circle that shrink-wraps the img box and clips the
        // zoom/pan so it never overflows into neighbours (layout is unaffected).
        return `<span class="avatar-fit">${img}</span>`;
    }

    // Look up a person in the central registry (data.people) by name.
    function personByName(name) {
        if (!name) return null;
        const key = String(name).trim().toLowerCase();
        return (data.people || []).find(function (person) {
            return person && String(person.name).trim().toLowerCase() === key;
        }) || null;
    }

    // Resolve a chapter-lead reference against the registry so displayed details
    // (photo, bio, canonical name) come from the single source of truth, with the
    // chapter's own values as a fallback for anyone not yet in the registry.
    function resolvePersonRef(ref, chapter) {
        const registry = personByName(ref && ref.name) || {};
        return {
            name: (ref && ref.name) || registry.name || (chapter && chapter.leadName) || "Chapter Lead",
            title: (ref && ref.title) || registry.title || (chapter && chapter.leadTitle) || "Chapter Lead",
            photo: registry.photo || (ref && ref.photo) || (chapter && chapter.leadPhoto) || "images/logo.avif",
            fallbackPhoto: registry.fallbackPhoto || "images/logo.avif",
            bio: registry.bio || ""
        };
    }

    function chapterLeadPeople(chapter) {
        const refs = Array.isArray(chapter.leadPeople)
            ? chapter.leadPeople.filter(function (person) { return person && person.name; })
            : [];

        if (refs.length) {
            return refs.map(function (ref) { return resolvePersonRef(ref, chapter); });
        }

        return [resolvePersonRef({
            name: chapter.leadName,
            title: chapter.leadTitle,
            photo: chapter.leadPhoto
        }, chapter)];
    }

    function chapterLeadAvatarMarkup(chapter, modifierClass) {
        const people = chapterLeadPeople(chapter);
        const label = people.length > 1 ? `${chapter.leadName} portraits` : `${people[0].name} portrait`;
        return `
            <div class="chapter-lead-avatars${modifierClass ? ` ${escapeHTML(modifierClass)}` : ""}" aria-label="${escapeHTML(label)}">
                ${people.map(function (person) {
                    return personPhotoMarkup(person.name, person.photo || chapter.leadPhoto, "chapter-lead-photo");
                }).join("")}
            </div>
        `;
    }

    function chapterLeadPeopleText(chapter) {
        return chapterLeadPeople(chapter).map(function (person) {
            return person.name;
        }).join(" / ");
    }

    // True only when a chapter names a real lead. New chapters (no roster yet) leave leadPeople empty
    // and set no leadName, so the directory card's "Led by" block hides instead of showing the
    // "Chapter Lead" placeholder resolvePersonRef() would otherwise fabricate.
    function chapterHasLead(chapter) {
        const named = Array.isArray(chapter.leadPeople)
            ? chapter.leadPeople.some(function (person) { return person && person.name; })
            : false;
        return named || !!(chapter.leadName && String(chapter.leadName).trim());
    }

    function activeChapters() {
        return (data.chapters || []).filter(function (chapter) {
            return chapter.status === "Active";
        });
    }

    function pipelineChapters() {
        return (data.chapters || []).filter(function (chapter) {
            return chapter.status !== "Active";
        });
    }

    function chaptersNavItem() {
        return navItems.find(function (item) { return item.label === "Chapters"; });
    }

    // The <li>s inside the Chapters dropdown — the ONE part of the navbar that depends on Firestore
    // data. Kept out of renderNavigation so the post-fetch pass can re-render just this list
    // (refreshChaptersDropdown) instead of rebuilding the whole bar.
    function chaptersDropdownItemsMarkup(directoryHref, page) {
        // On touch devices the "Chapters" toggle only opens/closes the menu (it never
        // navigates), so the directory needs its own entry inside the dropdown.
        const allLink = `<li><a href="${escapeHTML(safeUrl(directoryHref))}" class="dropdown-link dropdown-link--all${page === directoryHref ? " active" : ""}">All Chapters</a></li>`;
        const chapterLinks = (data.chapters || []).map(function (chapter) {
            const localHref = chapter.pageHref || `chapter-${chapter.id}.html`;
            const href = chapterPublicHref(chapter);
            const isActive = page === localHref;
            return `<li><a href="${escapeHTML(safeUrl(href))}" class="dropdown-link${isActive ? " active" : ""}">${escapeHTML(chapter.name)}</a></li>`;
        }).join("");
        return allLink + chapterLinks;
    }

    // What is currently painted inside the dropdown, so the post-fetch refresh can no-op when the
    // seed (or the localStorage snapshot) already matched live Firestore.
    var chaptersDropdownPainted = "";

    // renderChrome paints the navbar from the seed/snapshot before the Firestore fetch resolves, so
    // the live chapter list can arrive later. Replace ONLY the dropdown's <li>s: the
    // .dropdown-toggle — which owns dataset.dropdownBound and every hover/focus/click handler
    // initNavDropdowns bound to it — is left untouched, so NOTHING re-binds. Do NOT call
    // initNavDropdowns() again: a re-render of the toggle would clear its bound flag and let it add
    // a second document-level click listener closing over a detached dropdown.
    function refreshChaptersDropdown() {
        const menus = document.querySelectorAll(".nav-item.dropdown .dropdown-menu");
        if (!menus.length) return;
        const item = chaptersNavItem();
        const markup = chaptersDropdownItemsMarkup(item ? item.href : "chapters.html", currentPageName());
        if (markup === chaptersDropdownPainted) return;
        chaptersDropdownPainted = markup;
        menus.forEach(function (menu) {
            menu.innerHTML = markup;
        });
    }

    function renderNavigation() {
        const page = currentPageName();
        const menus = document.querySelectorAll(".nav-menu");
        if (!menus.length) return;

        function chaptersDropdownMarkup(item) {
            chaptersDropdownPainted = chaptersDropdownItemsMarkup(item.href, page);
            const isActive = page === item.href || page.indexOf("chapter-") === 0;
            return `
                <li class="nav-item dropdown">
                    <a href="${escapeHTML(safeUrl(item.href))}" class="nav-link dropdown-toggle${isActive ? " active" : ""}" aria-haspopup="true" aria-expanded="false">
                        ${escapeHTML(item.label)} <span class="dropdown-caret" aria-hidden="true">▾</span>
                    </a>
                    <ul class="dropdown-menu" aria-label="Chapter pages">
                        ${chaptersDropdownPainted}
                    </ul>
                </li>
            `;
        }

        const items = navItems.map(function (item) {
            if (item.label === "Chapters") return chaptersDropdownMarkup(item);
            const matches = item.match || [item.href];
            const isActive = matches.includes(page);
            return `<li><a href="${escapeHTML(safeUrl(item.href))}" class="nav-link${isActive ? " active" : ""}">${escapeHTML(item.label)}</a></li>`;
        }).join("");

        const donateItem = `<li><a href="${escapeHTML(safeUrl(donateHubUrl))}" class="btn-donate">Donate</a></li>`;
        menus.forEach(function (menu) {
            menu.innerHTML = items + donateItem;
        });
    }

    function initNavDropdowns() {
        const touchLike = window.matchMedia && window.matchMedia("(hover: none), (pointer: coarse)").matches;
        const dropdowns = document.querySelectorAll(".nav-item.dropdown");
        if (!dropdowns.length) return;

        dropdowns.forEach(function (dropdown) {
            const toggle = dropdown.querySelector(".dropdown-toggle");
            if (!toggle) return;
            if (toggle.dataset.dropdownBound) return;
            toggle.dataset.dropdownBound = "true";

            function setExpanded(isOpen) {
                dropdown.classList.toggle("dropdown-open", isOpen);
                toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
            }

            if (touchLike) {
                toggle.addEventListener("click", function (event) {
                    // On touch devices, first tap opens the menu (links are inside the dropdown).
                    event.preventDefault();
                    const isOpen = dropdown.classList.contains("dropdown-open");
                    // Close others.
                    dropdowns.forEach(function (other) {
                        if (other !== dropdown) {
                            const otherToggle = other.querySelector(".dropdown-toggle");
                            other.classList.remove("dropdown-open");
                            if (otherToggle) otherToggle.setAttribute("aria-expanded", "false");
                        }
                    });
                    setExpanded(!isOpen);
                });

                document.addEventListener("click", function (event) {
                    if (dropdown.contains(event.target)) return;
                    setExpanded(false);
                });
            } else {
                // Keep aria-expanded roughly in sync for keyboard/mouse.
                dropdown.addEventListener("mouseenter", function () { setExpanded(true); });
                dropdown.addEventListener("mouseleave", function () { setExpanded(false); });
                toggle.addEventListener("focus", function () { setExpanded(true); });
                // Close when keyboard focus leaves the whole dropdown — without this the
                // menu stayed painted open (stale aria-expanded) after tabbing through it.
                dropdown.addEventListener("focusout", function (event) {
                    if (dropdown.contains(event.relatedTarget)) return;
                    setExpanded(false);
                });
            }
        });
    }

    // Monochrome inline-SVG glyphs (inherit currentColor) — replaces the old full-colour raster logos.
    const SOCIAL_ICONS = {
        instagram: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg>',
        linkedin: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.49 2.49 0 1 1-.02 4.98 2.49 2.49 0 0 1 .02-4.98zM3 9.4h4V21H3zM9.6 9.4h3.83v1.58h.05c.53-.95 1.84-1.95 3.78-1.95 4.04 0 4.79 2.6 4.79 5.98V21h-4v-5.28c0-1.26-.02-2.88-1.8-2.88-1.8 0-2.07 1.37-2.07 2.79V21h-3.98z"/></svg>'
    };

    // The footer's only data-driven values (everything else in it is hardcoded above/below).
    function footerDataSignature() {
        const social = data.socialLinks || {};
        return [contactEmail, social.instagram, social.linkedin].join("|");
    }
    var footerPaintedSignature = "";

    // Same story as refreshChaptersDropdown: the footer is painted from the seed/snapshot before the
    // fetch resolves. renderFooter binds no listeners (pure innerHTML), so re-running it is safe —
    // but only do it when a value actually changed, so the common case repaints nothing.
    function refreshFooter() {
        if (footerDataSignature() === footerPaintedSignature) return;
        renderFooter();
    }

    function renderFooter() {
        const footerContainer = document.querySelector(".footer .container");
        if (!footerContainer) return;
        footerPaintedSignature = footerDataSignature();
        // Guarded like footerDataSignature() already does: this runs inside renderChrome() at parse
        // time, so a Firestore content doc without socialLinks would throw HERE and abort the rest
        // of the chrome — syncDonateLinks, ensureSkipLink, initMobileNavigation AND initNavOverlay —
        // leaving a dead hamburger and a permanently solid bar on every hero page.
        const social = data.socialLinks || {};

        const quickLinks = [
            ["Home", "index.html"],
            ["About", "about.html"],
            ["Impact", "impact.html"],
            ["Initiatives", "ongoing-initiatives.html"],
            ["Team", "team.html"],
            ["Chapters", "chapters.html"],
            ["Admin", "admin.html"]
        ];

        const programLinks = [
            ["Start a Chapter", "chapters.html#start-chapter"],
            ["Volunteer", "contact.html"]
        ];

        footerContainer.innerHTML = `
            <div class="footer-content">
                <div class="footer-section">
                    <div class="footer-logo">
                        <img src="images/logo.avif" alt="Bytes for Better Lives logo" loading="lazy">
                        <h3>Bytes for Better Lives</h3>
                    </div>
                    <p>A South Florida student-led nonprofit bridging the digital divide for seniors and children through service, education, donations, and community outreach.</p>
                </div>
                <div class="footer-section">
                    <h3>Quick Links</h3>
                    ${quickLinks.map(function (link) {
                        return `<a href="${link[1]}">${link[0]}</a>`;
                    }).join("")}
                </div>
                <div class="footer-section">
                    <h3>Programs</h3>
                    ${programLinks.map(function (link) {
                        return `<a href="${link[1]}">${link[0]}</a>`;
                    }).join("")}
                    <a href="${escapeHTML(safeUrl(donateHubUrl))}">Donate</a>
                </div>
                <div class="footer-section">
                    <h3>Contact</h3>
                    <a href="${escapeHTML(safeUrl("mailto:" + contactEmail))}">${escapeHTML(contactEmail)}</a>
                    <div class="social-links">
                        <a class="social-link" href="${escapeHTML(safeUrl(social.instagram))}" target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram">${SOCIAL_ICONS.instagram}</a>
                        <a class="social-link" href="${escapeHTML(safeUrl(social.linkedin))}" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn">${SOCIAL_ICONS.linkedin}</a>
                    </div>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; ${new Date().getFullYear()} Bytes for Better Lives Corporation. A 501(c)(3) nonprofit. EIN 42-2241292.</p>
            </div>
        `;
    }

    // GLOBAL RULE: never render an empty section — when a data-driven grid has nothing to
    // show, hide its whole <section> (no bare headings over empty grids).
    function hideSectionWhenEmpty(selector) {
        const root = document.querySelector(selector);
        if (!root) return;
        const section = root.closest("section.section");
        if (section) section.style.display = root.children.length ? "" : "none";
    }

    function renderHomePage() {
        // renderHomeStats() / renderWhatWeDo() are NOT here any more — they read no data, so they
        // paint at parse time from renderStaticBody(). Everything below needs live content.
        // Homepage preview shows the board of directors (members flagged person.execBoard).
        renderOfficerGrid("#executive-board-preview", (data.execBoard || []).map(withDisplayTitle), true);
        renderChapterPreview();
        renderGalleryPreview();
        hideSectionWhenEmpty("#executive-board-preview");
        hideSectionWhenEmpty("#chapters-preview-grid");
        hideSectionWhenEmpty("#gallery-preview-grid");
    }

    function renderHomeStats() {
        const root = document.querySelector("#home-impact-stats");
        if (!root) return;

        const stats = [
            { raw: 8450, prefix: "$", suffix: "", label: "Fundraised", note: "for technology access and outreach", decimals: 0 },
            { raw: 2350, prefix: "", suffix: "+", label: "Donations Amassed", note: "games, devices, and supplies", decimals: 0 },
            { raw: 1500, prefix: "", suffix: "+", label: "Students Reached", note: "through education and drives", decimals: 0 },
            { raw: 3500, prefix: "", suffix: "+", label: "Seniors Helped", note: "with tech help and safety lessons", decimals: 0 },
            { raw: 11, prefix: "", suffix: "", label: "Chapters", note: "active and launching chapter network", decimals: 0 }
        ];

        root.innerHTML = `
            <div class="container">
                <div class="stats-grid">
                    ${stats.map(function (stat) {
                        return `
                            <article class="stat-card">
                                <div class="stat-number animated-counter" data-target="${stat.raw}" data-prefix="${stat.prefix}" data-suffix="${stat.suffix}" data-decimals="${stat.decimals}">0</div>
                                <div class="stat-label">${escapeHTML(stat.label)}</div>
                                <p class="stat-note">${escapeHTML(stat.note)}</p>
                            </article>
                        `;
                    }).join("")}
                </div>
            </div>
        `;
    }

    function renderWhatWeDo() {
        const root = document.querySelector("#what-we-do-grid");
        if (!root) return;

        // Four numbered pillars, copy verbatim from the user's changes doc (2026-09-15).
        // The numerals ARE meaningful order here, unlike the retired 01-05 program numerals —
        // they read as a sequence: get devices in hands, teach their use, back the schooling
        // around them, then hand the work to a new student-led chapter.
        // Photos: images/programs/<slug>-{580,1160}.{avif,jpg}, all 4:3 (580x435 / 1160x870).
        // Data-free by design — this renders inside the first paint (renderStaticBody).
        const sizes = "(max-width: 700px) calc(100vw - 40px), (max-width: 1220px) calc(50vw - 32px), 578px";
        const services = [
            {
                step: "01",
                title: "Provide Access",
                text: "We donate devices to underserved communities, giving students and families the tools they need to learn and connect.",
                photo: "provide-access",
                alt: "Three volunteers holding donated iPads at the front desk of His House Children’s Home"
            },
            {
                step: "02",
                title: "Teach Digital Literacy",
                text: "We teach people of all ages to use technology safely and effectively — from seniors learning new devices to foster children navigating the digital world.",
                photo: "teach-digital-literacy",
                alt: "A volunteer presents a “Why Digital Literacy Matters” lesson on a classroom screen"
            },
            {
                step: "03",
                title: "Support Education",
                text: "We provide school supplies and educational resources to underserved students, helping them succeed in school and build the foundation for greater access to technology.",
                photo: "support-education",
                alt: "Volunteers and children holding donated drawing books and games in a Boys & Girls Club gym"
            },
            {
                step: "04",
                title: "Mobilize Community",
                text: "We establish student-led chapters in communities and neighborhoods, expanding our reach and empowering more young people to bridge the digital divide.",
                photo: "mobilize-community",
                alt: "Chapter members gathered behind a Bytes for Better Lives banner"
            }
        ];

        root.innerHTML = services.map(function (service) {
            const slug = escapeHTML(service.photo);
            const sizesAttr = escapeHTML(sizes);
            return `
                <article class="service-card service-card--photo">
                    <figure class="service-media">
                        <picture>
                            <source type="image/avif" srcset="images/programs/${slug}-580.avif 580w, images/programs/${slug}-1160.avif 1160w" sizes="${sizesAttr}">
                            <img src="images/programs/${slug}-1160.jpg" srcset="images/programs/${slug}-580.jpg 580w, images/programs/${slug}-1160.jpg 1160w" sizes="${sizesAttr}" width="1160" height="870" loading="lazy" decoding="async" data-no-fallback="1" alt="${escapeHTML(service.alt)}">
                        </picture>
                    </figure>
                    <div class="service-body">
                        <span class="service-step" aria-hidden="true">${escapeHTML(service.step)}</span>
                        <h3>${escapeHTML(service.title)}</h3>
                        <p>${escapeHTML(service.text)}</p>
                    </div>
                </article>
            `;
        }).join("");
    }

    function officerCard(officer, compact) {
        const detailLine = officer.detail ? `<p class="officer-detail">${escapeHTML(officer.detail)}</p>` : "";
        const bioLine = officer.bio
            ? `<p class="officer-bio${compact ? " officer-bio-compact" : ""}">${escapeHTML(officer.bio)}</p>`
            : "";
        return `
            <article class="officer-card">
                <div class="portrait-frame">
                    ${personPhotoMarkup(officer.name, officer.photo, "")}
                </div>
                <div>
                    <h3>${escapeHTML(officer.name)}</h3>
                    <p class="officer-title">${escapeHTML(officer.title)}</p>
                    ${detailLine}
                </div>
                ${bioLine}
            </article>
        `;
    }

    // Compact roster chip (avatar + name + title) for volunteer/general members.
    function personChipMarkup(p) {
        return `
            <div class="roster-chip">
                <span class="roster-chip-avatar">${personPhotoMarkup(p.name, p.photo || "", "")}</span>
                <span class="roster-chip-meta">
                    <strong>${escapeHTML(p.name)}</strong>
                    ${p.title ? `<span>${escapeHTML(p.title)}</span>` : ""}
                </span>
            </div>
        `;
    }

    function renderOfficerGrid(selector, officers, compact) {
        const root = document.querySelector(selector);
        if (!root) return;
        root.innerHTML = (officers || []).map(function (officer) {
            return officerCard(officer, compact);
        }).join("");
    }

    function chapterNameById(id) {
        const c = (data.chapters || []).find(function (ch) { return ch && ch.id === id; });
        return c ? c.name : "";
    }

    // Public-facing display title. Executive-board members show their board title; everyone else
    // shows "Title ⋅ Chapter Name" when they belong to a chapter.
    function memberDisplayTitle(person) {
        if (!person) return "";
        if (person.execBoard) return person.execTitle || person.title || "";
        const base = person.title || "";
        const chName = person.chapter ? chapterNameById(person.chapter) : "";
        if (base && chName) return base + " ⋅ " + chName;
        return base || chName;
    }

    // Public-facing bio. Board members show their separate executive bio (falling back to the
    // regular bio if none); everyone else shows their regular bio.
    function memberDisplayBio(person) {
        if (!person) return "";
        if (person.execBoard) return person.execBio || person.bio || "";
        return person.bio || "";
    }

    // Clone a registry person with its public display title + bio applied (for renderOfficerGrid).
    function withDisplayTitle(person) {
        return Object.assign({}, person, {
            title: memberDisplayTitle(person),
            bio: memberDisplayBio(person)
        });
    }

    function renderChapterPreview() {
        const root = document.querySelector("#chapters-preview-grid");
        if (!root) return;
        root.innerHTML = (data.chapters || []).slice(0, 3).map(chapterDirectoryCardMarkup).join("");
    }

    function renderChapterDirectoryPage() {
        const root = document.querySelector("#chapters-directory-grid");
        if (!root) return;
        root.innerHTML = (data.chapters || []).map(chapterDirectoryCardMarkup).join("");
        hideSectionWhenEmpty("#chapters-directory-grid");
    }

    // Pin positions for the chapters-page + home maps, as PERCENTAGES of the map frame (left%, top%).
    // These are PROJECTED from each place's real lat/lng — not eyeballed. See the "Map-projection
    // note" in CLAUDE.md for the two calibrated models:
    //   • florida-roads.svg (and the inset florida-se-roads.svg) = Albers conic — n 0.60283700,
    //     C 1.35122133, lng0 -96, X = 479.96 + 1264.138·ρ·sin θ, Y = -1332.38 + 1264.138·ρ·cos θ.
    //     Those two files are GENERATED from public-domain geodata with that exact projection
    //     (tools/maps/build.py), so real roads, coastline and bays line up with these pins.
    //   • world.svg = a hand-drawn pseudocylindrical outline; North-American pins use a local affine
    //     fit (x = 432.1872 + 0.7217·lat + 2.6924·lng, y = 360.4426 - 3.5132·lat + 0.1962·lng).
    // Chapters carry no geo data, so positions live here (like the hardcoded `stats`/`FOUNDERS`); a
    // chapter id with no entry simply gets no pin, and each pin's name/status/href still resolve live
    // from data.chapters. World pins collapse the SE-Florida chapters into one "Florida" marker.
    // The SE-Florida chapters are only ~40 mi apart, so on the Florida map their dots correctly sit
    // close together on the SE coast — labels float LEFT (inland) to stay legible.
    // dy = vertical label offset (px): the SE-coast dots sit within ~7% of each other, so their
    // labels are staggered into an evenly spaced inland column instead of overlapping.
    // dx = extra horizontal push (px) away from the dot: it keeps the five stacked SE labels in a
    // column that ends WEST of the dot cluster, so no pill ever sits on a neighbour's dot.
    const FLORIDA_MAP_PINS = [
        { id: "gainesville", x: 63.2, y: 23.4 },
        { id: "coral-springs", x: 92.2, y: 67.6, side: "left", dy: -26, dx: 4 },
        { id: "ahs", x: 92.1, y: 69.9, side: "left", dy: -14, dx: 8 },
        { id: "cypress", x: 91.2, y: 70.8, side: "left", dy: 4 },
        { id: "doral", x: 92.2, y: 74.2, side: "left", dy: 11, dx: 4 },
        { id: "miami", x: 94.1, y: 74.5, side: "left", dy: 32, dx: 16 }
    ];
    // The four North-American dots sit within ~75px of each other on a 570px frame while their
    // labels are 70-90px wide, so the labels are fanned vertically instead of all floating inland:
    // Los Angeles rises (with a leader line, since its lift is longer than the pill), New York sits
    // on its dot's line and Virginia drops below. Virginia floating LEFT used to bury the Los
    // Angeles dot under its pill — the dot was unclickable and the pill read as its label.
    const WORLD_MAP_PINS = [
        { id: "ahs", label: "Florida", x: 24.5, y: 39.7, side: "left", dy: 7 }, // projected from the FL centroid (27.9,-81.7) so the aggregate dot sits wholly on the peninsula
        { id: "los-angeles", label: "Los Angeles", x: 14.6, y: 35.1, dy: -34 }, // west edge: label floats right (side:left clipped "Los Angeles" off the frame's left edge) and rises clear of the New York / Virginia pills its 86px pill would otherwise reach
        { id: "new-york", label: "New York", x: 27.6, y: 32.7, dy: -2 },
        { id: "virginia", label: "Virginia", x: 26.8, y: 34.9, dy: 14 },
        { id: "russia", label: "Russia", x: 57.2, y: 25.6 },
        { id: "turkey", label: "Turkey", x: 55.5, y: 34.2 }
    ];
    // Home "Our Reach" map only: countries where BFBL outreach/donation work has reached, NOT
    // chapters — so they carry no chapter id, but they DO carry an href to the page that documents
    // the work, which makes them real links (hover = clickable). Country centroids projected with the
    // same world.svg model (Haiti 18.97,-72.29 · Peru -9.19,-75.02 · India 20.59,78.96).
    const WORLD_OUTREACH_PINS = [
        { label: "Haiti", x: 26.5, y: 45.1, cls: "pin-outreach", href: "impact.html#donations", title: "Haiti — games donated via House of New Vision and Hope" },
        { label: "Peru", x: 25.4, y: 59.4, cls: "pin-outreach", href: "ongoing-initiatives.html", title: "Peru — school fundraiser (AHS chapter)" },
        // pin-edge-right: the dot lands ~90% across the world-reach crop, so on narrow frames the
        // right-floating label clips off the edge — the class flips it inland ≤640px (CSS).
        { label: "India", x: 70.8, y: 44.4, cls: "pin-outreach pin-edge-right", href: "ongoing-initiatives.html", title: "India — Tamil Nadu school bathroom fundraiser (Cypress Bay)" }
    ];

    // --- Home "South Florida" inset (images/maps/florida-se-roads.svg) ---------------------------
    // The inset is its own generated map (tools/maps/build.py) drawn at viewBox FLORIDA_SE_CROP —
    // the same ~7× zoom into the same Albers plane as the state map, so a place lands at the same
    // spot on both. Every stroke is divided by 176/24 there, which is exactly how much more zoomed
    // in it is. Inset percentages come STRAIGHT from the Albers projection (see the model above),
    // remapped to the crop box — NOT converted from the rounded full-map %s, which would multiply
    // their rounding error by 176/24:
    //   x% = (X - crop.x) / crop.w · 100 ,  y% = (Y - crop.y) / crop.h · 100
    const FLORIDA_SE_CROP = { x: 780, y: 526.5, w: 24, h: 26 };
    const FLORIDA_VIEWBOX = { x: 630, y: 435, w: 176, h: 152 };
    const FLORIDA_SE_CHAPTER_PINS = [
        { id: "coral-springs", x: 51.4, y: 43.4, dy: -4 },
        { id: "ahs", x: 50.6, y: 56.5, side: "left", dx: 12, dy: -9 },
        { id: "cypress", x: 44.0, y: 62.1, side: "left", dy: 20 },
        { id: "doral", x: 51.1, y: 82.0, side: "left" },
        { id: "miami", x: 65.2, y: 83.7, dy: 4 }
    ];
    // Places the chapters actually serve — senior residences, shelters, hospitals and children's
    // homes. Not chapters (no id), but every one links to the page documenting that work.
    // "Hollywood" is deliberately ONE marker: Five Star Premier and Joe DiMaggio are 1.6 km apart,
    // so at any zoom this map can carry their dots overlap into a single blob and the upper pill
    // covered the lower dot's click target. One pill naming both is honest and stays clickable.
    const FLORIDA_IMPACT_PINS = [
        { label: "Palomino Gardens", x: 51.6, y: 12.8, cls: "pin-outreach", href: "impact.html#seniors", title: "Palomino Gardens — one-on-one senior tech help" },
        { label: "Plantation visits", x: 53.8, y: 53.7, cls: "pin-outreach", side: "left", dy: -24, href: "impact.html#seniors", title: "Plantation — recurring senior visits" },
        // Projected from the charity's REGISTERED address (1021 NW 6th St, Fort Lauderdale); the
        // event venue itself is unconfirmed, so this marks the organization, not the celebration.
        { label: "Mamma’s Curry", x: 62.9, y: 53.7, cls: "pin-outreach", dy: -24, href: "impact.html#kids", title: "Mamma’s Curry Christmas celebration — 100+ games donated" },
        { label: "Broward Health", x: 64.6, y: 55.8, cls: "pin-outreach", href: "impact.html#kids", title: "Broward Health Medical Center — pediatric patient visit" },
        { label: "Palace at Weston", x: 46.7, y: 61.5, cls: "pin-outreach", side: "left", dx: 12, dy: -3, href: "impact.html#seniors", title: "The Palace at Weston — digital-safety workshops" },
        { label: "Hollywood", x: 62.8, y: 62.6, cls: "pin-outreach", dy: 4, href: "impact.html#donations", title: "Hollywood — Five Star Premier Residences senior tech support and Joe DiMaggio Children’s Hospital game donations" },
        { label: "His House", x: 55.5, y: 69.7, cls: "pin-outreach", side: "left", dy: 14, href: "impact.html#donations", title: "His House Children’s Home — 70+ games, 15+ iPads" },
        { label: "Lotus House", x: 64.5, y: 82.5, cls: "pin-outreach", dy: -14, href: "past-events.html", title: "Lotus House Shelter — digital-safety & financial-literacy event" },
        { label: "Nicklaus", x: 57.3, y: 87.6, cls: "pin-outreach", side: "left", dy: 6, href: "impact.html#donations", title: "Nicklaus Children’s Hospital — board games donated" }
    ];
    // The inset is a ~7× zoom of a silhouette with no interior geography, so on its own it reads as
    // a plain green rectangle. A small full-state locator in the corner — the crop outlined on the
    // familiar Florida shape — says WHERE the zoom is. Decorative: aria-hidden, inert, no hover.
    function floridaLocatorMarkup() {
        const c = FLORIDA_SE_CROP, f = FLORIDA_VIEWBOX;
        const pct = function (a, b) { return Math.round(a / b * 10000) / 100; };
        const box = `left:${pct(c.x - f.x, f.w)}%;top:${pct(c.y - f.y, f.h)}%;width:${pct(c.w, f.w)}%;height:${pct(c.h, f.h)}%`;
        return `
            <span class="map-locator" aria-hidden="true">
                <img src="images/maps/florida.svg" alt="" width="176" height="152">
                <span class="map-locator-box" style="${box}"></span>
            </span>`;
    }
    // --- Home "Our Reach" world map crop (images/maps/world-reach.svg) ---------------------------
    // world-reach.svg is world.svg with the viewBox cropped to "79 78 659 335" — the pin spread
    // (western North America → India, northern Russia → Peru) — so the pins fill the frame instead
    // of floating in empty ocean. WORLD_MAP_PINS/WORLD_OUTREACH_PINS keep FULL-map %s (chapters.html
    // renders them as-is); the home renderer remaps each pin into the crop, so no second pin table.
    const WORLD_REACH_CROP = { x: 79, y: 78, w: 659, h: 335 };
    function worldReachPin(pin) {
        // Full-map % → world.svg viewBox units (×9.5 / ×6.2, viewBox 950×620) → % of the crop box.
        return Object.assign({}, pin, {
            x: Math.round((pin.x * 9.5 - WORLD_REACH_CROP.x) / WORLD_REACH_CROP.w * 10000) / 100,
            y: Math.round((pin.y * 6.2 - WORLD_REACH_CROP.y) / WORLD_REACH_CROP.h * 10000) / 100
        });
    }

    // Chapter-hero locator map: Florida chapters show the Florida outline (so the dot %s line up with
    // FLORIDA_MAP_PINS — keep the two tables in LOCKSTEP); everyone else shows their OWN state/country
    // outline. Dots are PROJECTED from each city's real lat/lng — FL via the Albers fit above, NY/VA/CA
    // equirectangular over the shape's bounding box. russia.svg/turkey.svg are CROPS of world.svg, so
    // their dots are that chapter's WORLD_MAP_PINS point in world.svg units (x%·9.5, y%·6.2) remapped
    // into the crop viewBox — the same city then lands in the same place on both maps. Each SVG fills
    // the box, so left:X%/top:Y% == X%/Y% of the map; `aspect` matches the SVG viewBox.
    function chapterLocatorConfig(id) {
        const FL = { gainesville: [63.2, 23.4], "coral-springs": [92.2, 67.6], ahs: [92.1, 69.9], cypress: [91.2, 70.8], miami: [94.1, 74.5], doral: [92.2, 74.2] };
        if (FL[id]) return { map: "images/maps/florida.svg", x: FL[id][0], y: FL[id][1], aspect: "176 / 152" };
        const R = {
            "los-angeles": { map: "images/maps/california.svg", x: 59.0, y: 80.8, aspect: "0.859" },
            "new-york": { map: "images/maps/new-york.svg", x: 70.7, y: 89.9, aspect: "1.279" },
            "virginia": { map: "images/maps/virginia.svg", x: 87.5, y: 83.4, aspect: "1.679" },
            "russia":   { map: "images/maps/russia.svg",   x: 11.6, y: 70.2, aspect: "1.714" },
            "turkey":   { map: "images/maps/turkey.svg",   x: 19.1, y: 24.0, aspect: "2.091" }
        };
        return R[id] || null;
    }

    function chapterById(id) {
        return (Array.isArray(data.chapters) ? data.chapters : []).find(function (c) {
            return c && c.id === id;
        }) || null;
    }

    function mapPinMarkup(pin, forceStatus) {
        const labelDy = typeof pin.dy === "number" && pin.dy !== 0 ? `--label-dy:${pin.dy}px;` : "";
        const labelDx = typeof pin.dx === "number" && pin.dx !== 0 ? `--label-dx:${7 + pin.dx}px;` : "";
        // A label pushed further than its own pill height reads as belonging to nothing, so it gets
        // a hairline leader back to its dot (Los Angeles on the world maps).
        const dy = typeof pin.dy === "number" ? pin.dy : 0;
        const lead = Math.abs(dy) >= 20
            ? `<span class="geo-pin-lead${dy > 0 ? " geo-pin-lead--down" : ""}" style="--label-lead:${Math.abs(dy) - 8}px"></span>`
            : "";
        const pos = `left:${pin.x}%;top:${pin.y}%;${labelDy}${labelDx}`;
        const sideCls = pin.side === "left" ? " geo-pin--left" : "";
        // Optional label suffix that HIDES on small screens (long labels near the map edge clip there).
        const note = pin.labelNote ? `<span class="geo-pin-label-note">${escapeHTML(pin.labelNote)}</span>` : "";
        // No id → a NON-chapter pin (outreach country / Florida service site). With an href it is a
        // real link and gets the normal hover treatment; without one it renders as an inert
        // .geo-pin--static span, since hover feedback must only ever mean "clickable".
        if (!pin.id) {
            const body = `${lead}
                <span class="geo-pin-dot"></span>
                <span class="geo-pin-label">${escapeHTML(pin.label || "")}${note}</span>`;
            const cls = `geo-pin ${escapeHTML(pin.cls || "")}${sideCls}`;
            if (!pin.href) return `<span class="${cls} geo-pin--static" style="${pos}">${body}</span>`;
            return `
            <a class="${cls}" style="${pos}"
               href="${escapeHTML(safeUrl(pin.href))}" title="${escapeHTML(pin.title || pin.label || "")}">${body}</a>`;
        }
        const chapter = chapterById(pin.id);
        if (!chapter) return "";
        const href = pin.href || chapterPublicHref(chapter);
        const realStatus = (chapter.status && String(chapter.status).trim()) || "Active";
        // forceStatus recolours the DOT only (home map: all chapter pins green to match its legend);
        // the tooltip below keeps the chapter's real status so it never claims a false one.
        // typeof guard: Array#map passes the INDEX as the 2nd arg, so `.map(mapPinMarkup)` stays safe.
        const status = (typeof forceStatus === "string" && forceStatus) || realStatus;
        const label = pin.label || String(chapter.name || "").replace(/\s*Chapter$/i, "");
        const pinCls = statusClass(status).replace("status-", "pin-") + sideCls;
        const title = pin.title || `${chapter.name} — ${realStatus}`;
        return `
            <a class="geo-pin ${pinCls}" style="${pos}"
               href="${escapeHTML(safeUrl(href))}" title="${escapeHTML(title)}">${lead}
                <span class="geo-pin-dot"></span>
                <span class="geo-pin-label">${escapeHTML(label)}${note}</span>
            </a>`;
    }

    // Every chapter pin on the HOME maps is forced GREEN to match the two-item legend there
    // (green = chapters, red = outreach); status colouring stays a chapters-page concern.
    function greenChapterPins(pins) {
        return pins.map(function (pin) { return mapPinMarkup(pin, "Active"); }).join("");
    }

    function renderChapterMaps() {
        const florida = document.querySelector("#map-florida");
        const world = document.querySelector("#map-world");
        const homeWorld = document.querySelector("#map-world-home");
        const homeFloridaSe = document.querySelector("#map-florida-se");
        if (!florida && !world && !homeWorld && !homeFloridaSe) return;
        if (florida) florida.insertAdjacentHTML("beforeend", FLORIDA_MAP_PINS.map(mapPinMarkup).join(""));
        if (world) world.insertAdjacentHTML("beforeend", WORLD_MAP_PINS.map(mapPinMarkup).join(""));
        if (homeFloridaSe) {
            homeFloridaSe.insertAdjacentHTML("beforeend",
                floridaLocatorMarkup() + greenChapterPins(FLORIDA_SE_CHAPTER_PINS) + FLORIDA_IMPACT_PINS.map(function (pin) {
                    return mapPinMarkup(pin);
                }).join(""));
        }
        if (homeWorld) {
            // Every pin is remapped into the world-reach.svg crop (worldReachPin, a fresh copy per
            // pin). The Florida pin aggregates the FL cluster (live count from FLORIDA_MAP_PINS) and
            // links to the directory rather than one chapter's page.
            const flCount = FLORIDA_MAP_PINS.length;
            const chapterPins = greenChapterPins(WORLD_MAP_PINS.map(function (pin) {
                const p = worldReachPin(pin);
                return p.id === "ahs"
                    ? Object.assign(p, {
                        labelNote: ` · ${flCount} chapters`,
                        href: "chapters.html",
                        title: `Florida — ${flCount} chapters`
                    })
                    : p;
            }));
            const outreachPins = WORLD_OUTREACH_PINS.map(function (pin) {
                return mapPinMarkup(worldReachPin(pin));
            }).join("");
            homeWorld.insertAdjacentHTML("beforeend", chapterPins + outreachPins);
        }
    }

    function chapterDirectoryCardMarkup(chapter) {
        const pageHref = chapterPublicHref(chapter);
        const featureCls = isExecutiveChapter(chapter) ? " chapter-card--feature" : "";
        // Chapters without a named lead yet (brand-new) skip the "Led by" block entirely.
        const leadBlock = chapterHasLead(chapter)
            ? `
                <div class="chapter-lead">
                    ${chapterLeadAvatarMarkup(chapter)}
                    <div>
                        <span class="chapter-lead-eyebrow">Led by</span>
                        <strong>${escapeHTML(chapterLeadPeopleText(chapter))}</strong>
                    </div>
                </div>`
            : "";
        return `
            <a class="chapter-card${featureCls}" href="${escapeHTML(safeUrl(pageHref))}" aria-label="View ${escapeHTML(chapter.name)}">
                <div class="chapter-card-header">
                    <div>
                        <h3>${escapeHTML(chapter.name)}</h3>
                        <p>${escapeHTML(chapter.location)}</p>
                    </div>
                    ${chapterStatusBadgeMarkup(chapter)}
                </div>${leadBlock}
                <p class="chapter-card-desc">${escapeHTML(chapter.description)}</p>
                <span class="chapter-card-go" aria-hidden="true">View chapter →</span>
            </a>
        `;
    }

    // "Support this Chapter" CTA: use the chapter's own fundraiser link if it has one,
    // otherwise fall back to the site-wide donate hub.
    function chapterSupportUrl(chapter) {
        const fundraisers = Array.isArray(data.fundraisers) ? data.fundraisers : [];
        const chapterFundraiser = fundraisers.find(function (item) {
            return item && item.chapterId === chapter.id && item.url && String(item.url).trim() && String(item.url).trim() !== "#";
        });
        return (chapterFundraiser && String(chapterFundraiser.url).trim()) || donateHubUrl;
    }

    // Human-readable label for a member category (role) id, from data.categories when available.
    function categoryLabel(id) {
        const cats = Array.isArray(data.categories) ? data.categories : [];
        const found = cats.find(function (c) { return c && c.id === id; });
        if (found) return found.label || found.id;
        const defaults = { founder: "Founders", leadership: "Leadership", design: "Design", volunteer: "Volunteers" };
        if (defaults[id]) return defaults[id];
        return id ? id.charAt(0).toUpperCase() + id.slice(1) : "Members";
    }

    // Render members assigned to this chapter (person.chapter === chapter.id), grouped by their
    // category (roles[0]), into #chapter-members.
    function renderChapterMembersByCategory(chapter) {
        const root = document.querySelector("#chapter-members");
        if (!root) return;

        const people = Array.isArray(data.people) ? data.people : [];
        const members = people.filter(function (p) { return p && p.chapter === chapter.id; });

        if (!members.length) {
            root.innerHTML = `<p class="lead-text">Member roster coming soon.</p>`;
            return;
        }

        const order = Array.isArray(data.categories)
            ? data.categories.map(function (c) { return c && c.id; })
            : [];
        const groups = {};
        members.forEach(function (p) {
            const cat = (Array.isArray(p.roles) && p.roles[0]) ? p.roles[0] : "member";
            (groups[cat] = groups[cat] || []).push(p);
        });

        const catIds = Object.keys(groups).sort(function (a, b) {
            const ia = order.indexOf(a);
            const ib = order.indexOf(b);
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        });

        root.innerHTML = catIds.map(function (cat) {
            // Leadership-type categories render as full cards (focal); volunteers/general members
            // render as compact chips so the page reads as a hierarchy, not a wall of discs.
            const asChips = (cat === "volunteer" || cat === "member" || cat === "general");
            let body;
            if (asChips) {
                body = `<div class="roster-chips">${groups[cat].map(personChipMarkup).join("")}</div>`;
            } else {
                const cards = groups[cat].map(function (p) {
                    return officerCard({
                        name: p.name,
                        // On a chapter page we're already in that chapter's context, so show the plain
                        // title only — never "Title ⋅ Chapter Name" or the org executive title.
                        title: p.title || "",
                        detail: p.detail || "",
                        photo: p.photo || "images/logo.avif",
                        bio: p.bio || ""
                    }, false);
                }).join("");
                body = `<div class="officer-grid officer-grid-dense mt-2">${cards}</div>`;
            }
            return `
                <h3 class="team-subsection-title">${escapeHTML(categoryLabel(cat))}</h3>
                ${body}
            `;
        }).join("");
    }

    function renderChapterProfilePage() {
        const chapterId = (document.body && document.body.dataset ? document.body.dataset.chapterId : "") || "";
        if (!chapterId) return;
        // Inert runtime hook: kept as a handle for per-page CSS/JS, but nothing targets it today
        // (chapter profiles get their green accent from the base :root, not from this class).
        document.body.classList.add("page-chapter");

        ensureChapterProfileLayout();

        const chapter = (data.chapters || []).find(function (item) {
            return item && item.id === chapterId;
        });

        if (!chapter) {
            const missing = document.querySelector("#chapter-not-found");
            if (missing) missing.style.display = "block";
            markChapterMainReady();
            return;
        }

        const titleEl = document.querySelector("#chapter-page-title");
        if (titleEl) titleEl.textContent = chapter.name;

        // Each chapter hero uses its OWN first highlight photo + a faint monogram, so chapter pages
        // stop sharing one identical hero. NO shared-banner fallback: a chapter without a real photo
        // gets the photo-less editorial field below (.chapter-hero already paints that field's
        // ground, see --hero-img in styles.css).
        const heroEl = document.querySelector(".chapter-hero");
        const firstPhoto = chapter.photos && chapter.photos[0] ? chapter.photos[0] : "";
        if (heroEl) {
            if (firstPhoto && hasRealPhoto(firstPhoto)) {
                heroEl.classList.remove("chapter-hero--editorial");
                heroEl.style.setProperty("--hero-img", `url("${firstPhoto}")`);
                const heroPos = chapter.id === "cypress"
                    ? "center 68%"
                    : (chapter.heroPos ? String(chapter.heroPos) : "");
                if (heroPos) {
                    heroEl.style.setProperty("--hero-pos", heroPos);
                    heroEl.style.backgroundPosition = heroPos;
                }
            } else {
                // No real chapter photo → don't fall back to the shared banner (its printed wordmark
                // bleeds through the light chapter-hero wash). Use a photo-less accent colour-field;
                // the locator map below still carries the chapter's identity.
                heroEl.classList.add("chapter-hero--editorial");
            }
        }
        const markEl = document.querySelector("#chapter-hero-mark");
        if (markEl) {
            const loc = chapterLocatorConfig(chapter.id);
            if (loc) {
                // Faint locator MAP (Florida for FL chapters, the world map otherwise) + a dot at the
                // chapter's location, replacing the old letter monogram.
                markEl.className = "chapter-hero-mark chapter-hero-locator";
                markEl.style.setProperty("--locator-aspect", loc.aspect);
                markEl.innerHTML =
                    `<span class="hero-locator-map" style="background-image:url('${escapeHTML(loc.map)}');"></span>` +
                    `<span class="hero-locator-dot" style="left:${loc.x}%;top:${loc.y}%;"></span>`;
            } else {
                markEl.className = "chapter-hero-mark";
                const words = String(chapter.name || "").replace(/chapter/ig, "").trim().split(/\s+/).filter(Boolean);
                const mono = (words.length > 1 ? words.map(function (w) { return w.charAt(0); }).join("") : (words[0] || "")).slice(0, 3);
                markEl.textContent = mono.toUpperCase();
            }
        }

        const subtitleEl = document.querySelector("#chapter-page-subtitle");
        if (subtitleEl) {
            const statusDetail = chapterStatusDetail(chapter);
            subtitleEl.textContent = statusDetail
                ? `${chapter.location} \u2022 ${statusDetail}`
                : chapter.location;
        }

        const descriptionEl = document.querySelector("#chapter-page-description");
        if (descriptionEl) descriptionEl.textContent = chapter.leadBio || chapter.description || "";

        const actionsEl = document.querySelector("#chapter-page-actions");
        if (actionsEl) {
            const supportUrl = chapterSupportUrl(chapter);
            const supportAttrs = supportUrl === donateHubUrl ? "" : ' target="_blank" rel="noopener noreferrer"';
            const actions = [
                `<a href="${escapeHTML(safeUrl(supportUrl))}"${supportAttrs} class="btn btn-primary">Support this Chapter</a>`
            ];
            if (chapter.joinUrl) {
                // Quiet supporting action so a single primary CTA ("Support this Chapter") leads the hero.
                actions.push(`<a href="${escapeHTML(safeUrl(chapter.joinUrl))}" target="_blank" rel="noopener noreferrer" class="btn btn-quiet">Get Involved</a>`);
            }
            if (chapter.instagram) {
                actions.push(`<a href="${escapeHTML(safeUrl(chapter.instagram))}" target="_blank" rel="noopener noreferrer" class="btn btn-quiet">Instagram</a>`);
            }
            if (chapter.contactEmail) {
                actions.push(`<a href="${escapeHTML(safeUrl("mailto:" + chapter.contactEmail))}" class="btn btn-quiet">Email the Chapter</a>`);
            }
            actionsEl.innerHTML = actions.join("");
        }

        // Current initiatives — this chapter's own, shown as the first section (hidden when none).
        const initiativesSection = document.querySelector("#chapter-initiatives-section");
        const initiativesGrid = document.querySelector("#chapter-initiatives-grid");
        if (initiativesSection && initiativesGrid) {
            const inits = (Array.isArray(chapter.initiatives) ? chapter.initiatives : []).filter(function (it) {
                return it && (it.title || it.description);
            });
            initiativesGrid.innerHTML = inits.map(function (it) {
                return initiativeCardMarkup(it, chapter, { hideChapter: true });
            }).join("");
            initiativesSection.style.display = inits.length ? "" : "none";
        }

        // Per-chapter impact stats — only rendered when the chapter has any.
        const statsSection = document.querySelector("#chapter-stats-section");
        const statsEl = document.querySelector("#chapter-stats");
        if (statsSection && statsEl) {
            const stats = (Array.isArray(chapter.stats) ? chapter.stats : []).filter(function (s) {
                return s && (s.value || s.label);
            });
            if (stats.length) {
                statsEl.innerHTML = stats.map(function (s) {
                    return `<div class="chapter-stat"><span class="chapter-stat-value">${escapeHTML(s.value || "")}</span><span class="chapter-stat-label">${escapeHTML(s.label || "")}</span></div>`;
                }).join("");
                statsSection.style.display = "";
            } else {
                statsSection.style.display = "none";
            }
        }

        renderChapterMembersByCategory(chapter);

        const photoGrid = document.querySelector("#chapter-photo-grid");
        const highlightsSection = document.querySelector("#chapter-highlights-section");
        if (photoGrid) {
            const photos = (Array.isArray(chapter.photos) ? chapter.photos : []).filter(Boolean);
            photoGrid.innerHTML = photos.map(function (photo, index) {
                return imageMarkup(photo, `${chapter.name} photo ${index + 1}`, "", "images/logo.avif");
            }).join("");
            // Global rule: don't show a section with nothing inside — hide highlights if no photos.
            if (highlightsSection) highlightsSection.style.display = photos.length ? "" : "none";
        }

        // Community partners — only rendered when the chapter lists any.
        const partnersSection = document.querySelector("#chapter-partners-section");
        const partnersEl = document.querySelector("#chapter-partners");
        if (partnersSection && partnersEl) {
            const partners = (Array.isArray(chapter.partners) ? chapter.partners : []).filter(Boolean);
            if (partners.length) {
                partnersEl.innerHTML = partners.map(function (p) {
                    return `<div class="chapter-partner">${escapeHTML(p)}</div>`;
                }).join("");
                partnersSection.style.display = "";
            } else {
                partnersSection.style.display = "none";
            }
        }

        // Closing "Get involved" band — always shown once the chapter resolves, so thin pages
        // (no initiatives/photos yet) still end with a beat instead of trailing off after a
        // lone members card. Never empty: the support URL always resolves (chapter fundraiser
        // or the site-wide donate link).
        const ctaSection = document.querySelector("#chapter-cta-section");
        if (ctaSection) {
            const ctaTitle = document.querySelector("#chapter-cta-title");
            if (ctaTitle) ctaTitle.textContent = `Get involved with the ${chapter.name.replace(/\s*Chapter$/i, "")} chapter.`;
            const ctaActions = document.querySelector("#chapter-cta-actions");
            if (ctaActions) {
                const supportUrl = chapterSupportUrl(chapter);
                const supportAttrs = supportUrl === donateHubUrl ? "" : ' target="_blank" rel="noopener noreferrer"';
                const ctas = [
                    `<a href="${escapeHTML(safeUrl(supportUrl))}"${supportAttrs} class="btn btn-primary">Support this Chapter</a>`
                ];
                if (chapter.contactEmail) {
                    ctas.push(`<a href="${escapeHTML(safeUrl("mailto:" + chapter.contactEmail))}" class="btn btn-secondary">Email the Chapter</a>`);
                } else {
                    ctas.push(`<a href="contact.html" class="btn btn-secondary">Contact Us</a>`);
                }
                if (chapter.joinUrl) {
                    ctas.push(`<a href="${escapeHTML(safeUrl(chapter.joinUrl))}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">Join the Chapter</a>`);
                }
                ctaActions.innerHTML = ctas.join("");
            }
            ctaSection.style.display = "";
        }

        markChapterMainReady();
    }

    // The parse-time <main> (see ensureChapterProfileLayout) exists long before its content does, so
    // styles.css floors it at 100vh until this flag lands — same only-ever-undershoot doctrine as
    // #home-impact-stats. Called from BOTH exits of renderChapterProfilePage: the success path and
    // the "chapter not found" branch, so a not-found card is never stranded on a viewport-tall box.
    function markChapterMainReady() {
        const main = document.querySelector("body[data-chapter-id] main");
        if (main) main.setAttribute("data-chapter-ready", "");
    }

    function ensureChapterProfileLayout() {
        // Chapter profile pages are intentionally lightweight shells.
        // If the expected containers aren't present, inject the chapter layout so older pages still render.
        //
        // Called at PARSE TIME now (see boot() at the end of this IIFE) as well as from
        // renderChapterProfilePage — the markup below is a pure static template that reads no data,
        // and injecting it late meant a chapter navigation painted one blank cream viewport (the
        // 100vh reservation in styles.css) before the dark hero slammed in. So it must be a no-op
        // on every non-chapter page:
        if (!document.body || !document.body.dataset || !document.body.dataset.chapterId) return;
        if (document.querySelector("#chapter-page-title")) return;

        const footer = document.querySelector(".footer");
        const main = document.createElement("main");
        main.innerHTML = `
            <section class="hero chapter-hero">
                <span class="chapter-hero-mark" id="chapter-hero-mark" aria-hidden="true"></span>
                <div class="hero-content">
                    <p class="eyebrow">Chapter</p>
                    <h1 id="chapter-page-title">Chapter</h1>
                    <p class="hero-subtitle" id="chapter-page-subtitle"></p>
                    <p class="hero-subtitle" id="chapter-page-description"></p>
                    <div class="hero-actions" id="chapter-page-actions"></div>
                </div>
            </section>

            <section class="section" id="chapter-initiatives-section" style="display: none;">
                <div class="container">
                    <div class="section-header">
                        <p class="section-kicker">Initiatives</p>
                        <h2 class="section-title">Current initiatives</h2>
                        <p class="section-description">What this chapter is running right now.</p>
                    </div>
                    <div class="cards-grid" id="chapter-initiatives-grid" aria-label="Current initiatives"></div>
                </div>
            </section>

            <section class="section" id="chapter-stats-section" style="display: none;">
                <div class="container">
                    <div class="chapter-stats-row" id="chapter-stats" aria-label="Chapter impact"></div>
                </div>
            </section>

            <section class="section">
                <div class="container">
                    <div id="chapter-not-found" class="impact-card" style="display: none;">
                        <h2>Chapter not found</h2>
                        <p class="lead-text">We could not find this chapter. Please return to the chapters directory.</p>
                        <div class="btn-row mt-2">
                            <a href="chapters.html" class="btn btn-primary">All Chapters</a>
                        </div>
                    </div>

                    <div class="section-header">
                        <p class="section-kicker">Members</p>
                        <h2 class="section-title">Chapter members</h2>
                        <p class="section-description">The students leading and volunteering with this chapter.</p>
                    </div>
                    <div id="chapter-members"></div>
                </div>
            </section>

            <section class="section surface-band" id="chapter-highlights-section" style="display: none;">
                <div class="container">
                    <div class="section-header">
                        <p class="section-kicker">Gallery</p>
                        <h2 class="section-title">Chapter highlights</h2>
                        <p class="section-description">A few moments from chapter events and community outreach.</p>
                    </div>
                    <div class="chapter-photo-grid" id="chapter-photo-grid" aria-label="Chapter photos"></div>
                </div>
            </section>

            <section class="section" id="chapter-partners-section" style="display: none;">
                <div class="container">
                    <div class="section-header">
                        <p class="section-kicker">Partners</p>
                        <h2 class="section-title">Community partners</h2>
                        <p class="section-description">Organizations this chapter works with to serve the community.</p>
                    </div>
                    <div class="chapter-partners-grid" id="chapter-partners" aria-label="Community partners"></div>
                </div>
            </section>

            <section class="section band--ink" id="chapter-cta-section" style="display: none;">
                <div class="container">
                    <div class="split-section">
                        <div class="section-header">
                            <p class="section-kicker">Get Involved</p>
                            <h2 class="section-title" id="chapter-cta-title">Get involved with this chapter.</h2>
                            <p class="section-description">Volunteer at a service day, propose a partnership, or support a drive — every bit helps this chapter serve its community.</p>
                        </div>
                        <div class="impact-card">
                            <h3>Ready to help?</h3>
                            <p>Reach out and the chapter&rsquo;s student leaders will get back to you.</p>
                            <div class="btn-row mt-2" id="chapter-cta-actions"></div>
                        </div>
                    </div>
                </div>
            </section>
        `;

        if (footer && footer.parentNode) {
            footer.parentNode.insertBefore(main, footer);
        } else {
            document.body.appendChild(main);
        }

        // The chapter hero only exists now, so the overlay navbar can finally observe it — but
        // ONLY when the chrome is already up. boot() calls this before renderChrome() (the hero has
        // to exist before renderChrome's own initNavOverlay measures it), and observing a navbar
        // that has no links yet is dead work that also breaks the documented "exactly two call
        // sites". On that path renderChrome's call, a moment later, is the one that counts.
        if (chromeRendered) initNavOverlay();
    }

    function renderGalleryPreview() {
        const root = document.querySelector("#gallery-preview-grid");
        if (!root) return;
        root.innerHTML = (data.gallery || []).slice(0, 3).map(storyCardMarkup).join("");
    }

    function renderInitiativesPage() {
        const fundraiserGrid = document.querySelector("#fundraiser-grid");
        if (!fundraiserGrid) return;

        const fundraisers = Array.isArray(data.fundraisers) ? data.fundraisers : [];
        fundraiserGrid.innerHTML = fundraisers.map(fundraiserCardMarkup).join("");
        const fundraisersSection = document.querySelector("#fundraisers-section");
        if (fundraisersSection) fundraisersSection.style.display = fundraisers.length ? "" : "none";

        // Current drives — optional section, hidden when there are none.
        const drivesGrid = document.querySelector("#drives-grid");
        const drivesSection = document.querySelector("#drives-section");
        if (drivesGrid) {
            const drives = Array.isArray(data.drives) ? data.drives : [];
            drivesGrid.innerHTML = drives.map(driveCardMarkup).join("");
            if (drivesSection) drivesSection.style.display = drives.length ? "" : "none";
        }

        // Current initiatives — aggregated from every chapter's `initiatives` (pulled from the clubs).
        // An initiative whose title matches a fundraiser above is skipped here: the fundraiser card
        // already presents the same project with a Donate CTA, and showing both read as a mistake.
        // (Chapter profile pages still show it — no fundraiser list there.)
        const fundraiserTitles = new Set(fundraisers.map(function (f) {
            return String((f && f.title) || "").trim().toLowerCase();
        }).filter(Boolean));
        const initiativesGrid = document.querySelector("#current-initiatives-grid");
        const initiativesSection = document.querySelector("#current-initiatives-section");
        if (initiativesGrid) {
            const cards = [];
            (Array.isArray(data.chapters) ? data.chapters : []).forEach(function (ch) {
                (Array.isArray(ch.initiatives) ? ch.initiatives : []).forEach(function (it) {
                    if (!it || (!it.title && !it.description)) return;
                    if (fundraiserTitles.has(String(it.title || "").trim().toLowerCase())) return;
                    cards.push(initiativeCardMarkup(it, ch));
                });
            });
            initiativesGrid.innerHTML = cards.join("");
            if (initiativesSection) initiativesSection.style.display = cards.length ? "" : "none";
        }
    }

    function initiativeFmtDate(d) {
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || "");
        if (!m) return "";
        var dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        return isNaN(dt) ? "" : dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    }
    function initiativeFmtTime(t) {
        var m = /^(\d{1,2}):(\d{2})$/.exec(t || "");
        if (!m) return "";
        var h = Number(m[1]); var ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
        return h + ":" + m[2] + " " + ap;
    }
    function initiativeWhen(it) {
        var sd = initiativeFmtDate(it.startDate), ed = initiativeFmtDate(it.endDate);
        var datePart = (sd && ed && it.startDate !== it.endDate) ? (sd + " – " + ed) : (sd || ed || "");
        var st = initiativeFmtTime(it.startTime), et = initiativeFmtTime(it.endTime);
        var timePart = (st && et) ? (st + " – " + et) : (st || et || "");
        return datePart && timePart ? (datePart + " · " + timePart) : (datePart || timePart || "");
    }

    function initiativeCardMarkup(it, chapter, opts) {
        opts = opts || {};
        const hideChapter = !!opts.hideChapter; // on a chapter's own page the club tag/link is redundant
        const url = (it.url || "").trim();
        const hasUrl = url && url !== "#" && url.toLowerCase() !== "tbd";
        const chHref = (chapter && chapter.pageHref) || ("chapter-" + (chapter && chapter.id) + ".html");
        const cta = hasUrl
            ? `<a class="btn btn-primary" href="${escapeHTML(safeUrl(url))}" target="_blank" rel="noopener noreferrer">Learn More</a>`
            : "";
        const viewChapter = (!hideChapter && chapter && chHref)
            ? `<a class="btn btn-quiet" href="${escapeHTML(safeUrl(chHref))}">View Chapter</a>` : "";
        const when = initiativeWhen(it);
        const media = hasRealPhoto(it.image)
            ? `<div class="card-media"><img class="clickable-image" src="${escapeHTML(it.image)}" alt="${escapeHTML((it.title || "Initiative") + " flyer")}" loading="lazy" decoding="async" data-fallback="images/logo.avif"></div>`
            : "";
        const btnRow = (cta || viewChapter) ? `<div class="btn-row">${cta}${viewChapter}</div>` : "";
        return `
            <article class="card">
                ${media}
                <div class="card-content">
                    ${hideChapter ? "" : `<span class="drive-status">${escapeHTML((chapter && chapter.name) || "Chapter")}</span>`}
                    ${it.recurring ? `<span class="initiative-tag">↻ Recurring</span>` : ""}
                    <h3 class="card-title">${escapeHTML(it.title || "")}</h3>
                    ${when ? `<p class="initiative-when">${escapeHTML(when)}</p>` : ""}
                    ${it.description ? `<p class="card-description">${escapeHTML(it.description)}</p>` : ""}
                    ${btnRow}
                </div>
            </article>
        `;
    }

    function driveCardMarkup(drive) {
        const url = (drive && drive.url ? String(drive.url) : "").trim();
        const hasUrl = url && url !== "#" && url.toLowerCase() !== "tbd";
        // A drive is contributed to either by donating (external link) or by reaching out to drop off items.
        const cta = hasUrl
            ? `<a class="btn btn-primary" href="${escapeHTML(safeUrl(url))}" target="_blank" rel="noopener noreferrer">Donate</a>`
            : `<a class="btn btn-primary" href="contact.html">Get Involved</a>`;
        const status = drive && drive.status ? `<span class="drive-status">${escapeHTML(drive.status)}</span>` : "";
        return `
            <article class="card">
                <div class="card-media">
                    ${imageMarkup(drive.image, drive.alt || drive.title, "clickable-image", "images/logo.avif")}
                </div>
                <div class="card-content">
                    ${status}
                    <h3 class="card-title">${escapeHTML(drive.title)}</h3>
                    ${drive.by ? `<p style="margin: 0; color: var(--ink-soft); font-weight: 800;">Led by ${escapeHTML(drive.by)}</p>` : ""}
                    ${drive.description ? `<p class="card-description">${escapeHTML(drive.description)}</p>` : ""}
                    <div class="btn-row">
                        ${cta}
                        ${drive.chapterHref ? `<a class="btn btn-quiet" href="${escapeHTML(safeUrl(drive.chapterHref))}">View Chapter</a>` : ""}
                    </div>
                </div>
            </article>
        `;
    }

    function fundraiserCardMarkup(fundraiser) {
        const url = (fundraiser && fundraiser.url ? String(fundraiser.url) : "").trim();
        const hasUrl = url && url !== "#" && url.toLowerCase() !== "tbd";
        // No specific GoFundMe yet → fall back to the org's donate hub instead of a dead,
        // permanently-disabled "Coming Soon" button.
        const donate = donateHubUrl;
        const cta = hasUrl
            ? `<a class="btn btn-primary" href="${escapeHTML(safeUrl(url))}" target="_blank" rel="noopener noreferrer">Donate</a>`
            : `<a class="btn btn-primary" href="${escapeHTML(safeUrl(donate))}">Donate</a>`;

        return `
            <article class="card">
                <div class="card-media">
                    ${imageMarkup(fundraiser.image, fundraiser.alt || fundraiser.title, "clickable-image", "images/logo.avif")}
                </div>
                <div class="card-content">
                    <h3 class="card-title">${escapeHTML(fundraiser.title)}</h3>
                    ${fundraiser.by ? `<p style="margin: 0; color: var(--ink-soft); font-weight: 800;">Led by ${escapeHTML(fundraiser.by)}</p>` : ""}
                    ${fundraiser.description ? `<p class="card-description">${escapeHTML(fundraiser.description)}</p>` : ""}
                    <div class="btn-row">
                        ${cta}
                        ${fundraiser.chapterHref ? `<a class="btn btn-quiet" href="${escapeHTML(safeUrl(fundraiser.chapterHref))}">View Chapter</a>` : ""}
                    </div>
                </div>
            </article>
        `;
    }

    // One Team-page "Chapter leadership" block per chapter, listing ALL of that chapter's
    // leadership-role members (person.chapter === id AND roles includes "leadership").
    function chapterLeadershipBlockMarkup(chapter) {
        const leaders = (data.people || []).filter(function (p) {
            return p && p.chapter === chapter.id
                && Array.isArray(p.roles) && p.roles.indexOf("leadership") !== -1;
        });
        if (!leaders.length) return "";
        const peopleHtml = leaders.map(function (p) {
            return `
                <div class="chapter-leader">
                    ${personPhotoMarkup(p.name, p.photo, "chapter-leader-photo")}
                    <div class="chapter-leader-info">
                        <strong>${escapeHTML(p.name)}</strong>
                        <span>${escapeHTML(p.title || "Chapter Lead")}</span>
                    </div>
                </div>`;
        }).join("");
        const href = chapter.pageHref || ("chapter-" + chapter.id + ".html");
        return `
            <a class="chapter-leadership-card" href="${escapeHTML(safeUrl(href))}">
                <div class="chapter-leadership-head">
                    <h3>${escapeHTML(chapter.name)}</h3>
                    ${chapter.location ? `<p>${escapeHTML(chapter.location)}</p>` : ""}
                </div>
                <div class="chapter-leadership-people">${peopleHtml}</div>
            </a>`;
    }

    function renderTeamPage() {
        const foundersRoot = document.querySelector("#team-founders-grid");
        const execRoot = document.querySelector("#team-executive-grid");
        const designRoot = document.querySelector("#team-design-grid");
        const clubRoot = document.querySelector("#team-club-officers-grid");
        const chapterRoot = document.querySelector("#team-chapter-leaders-grid");
        const volunteerRoot = document.querySelector("#team-volunteers-grid");

        if (!foundersRoot && !execRoot && !clubRoot && !chapterRoot && !volunteerRoot) return;

        if (foundersRoot) {
            renderOfficerGrid("#team-founders-grid", data.founders || [], false);
        }

        if (execRoot) {
            // Board of Directors: ONLY members flagged person.execBoard in the admin.
            // This section always shows each member's executive bio (falling back to regular bio).
            const execBoard = (data.execBoard || []).map(function (p) {
                return Object.assign({}, p, {
                    title: memberDisplayTitle(p),
                    bio: p.execBio || p.bio || ""
                });
            });
            renderOfficerGrid("#team-executive-grid", execBoard, false);
        }

        if (designRoot) {
            // Design is now merged into the board of directors grid above; leave any
            // standalone design grid empty.
            renderOfficerGrid("#team-design-grid", [], false);
        }

        if (clubRoot) {
            renderOfficerGrid("#team-club-officers-grid", (data.officers || []).slice(3).map(withDisplayTitle), false);
        }

        if (chapterRoot) {
            // One block per chapter (AHS included), each listing ALL of that chapter's leadership members.
            chapterRoot.innerHTML = (data.chapters || [])
                .filter(function (chapter) { return chapter; })
                .map(chapterLeadershipBlockMarkup)
                .join("");
        }

        if (volunteerRoot) {
            const volunteers = Array.isArray(data.volunteers) ? data.volunteers : [];
            // Volunteers render as compact chips (not full bio cards) so the section reads as a
            // roster, not a fourth identical card grid.
            volunteerRoot.classList.remove("people-grid");
            volunteerRoot.classList.add("roster-chips");
            volunteerRoot.innerHTML = volunteers.map(function (volunteer) {
                return personChipMarkup({
                    name: volunteer.name,
                    title: memberDisplayTitle(volunteer) || "Volunteer",
                    photo: volunteer.photo || ""
                });
            }).join("");

            const emptyState = document.querySelector("#team-volunteers-empty");
            if (emptyState) {
                emptyState.style.display = volunteers.length ? "none" : "block";
            }
        }
    }

    function storyCardMarkup(story) {
        return `
            <article class="story-card" role="button" tabindex="0" aria-pressed="false">
                <div class="story-card-inner">
                    <div class="story-face story-front">
                        ${imageMarkup(story.image, story.alt || story.title, "", "images/logo.avif")}
                        <span class="story-overlay-label">Tap to view story</span>
                    </div>
                    <div class="story-face story-back">
                        <span class="story-category">${escapeHTML(story.category)}</span>
                        <h3>${escapeHTML(story.title)}</h3>
                        <p>${escapeHTML(story.description)}</p>
                        <dl>
                            <div><dt>Date</dt><dd>${escapeHTML(story.date)}</dd></div>
                            <div><dt>Location</dt><dd>${escapeHTML(story.location)}</dd></div>
                            <div><dt>Related Chapter</dt><dd>${escapeHTML(story.relatedChapter)}</dd></div>
                        </dl>
                        <span class="tap-copy">Tap again to return to photo</span>
                    </div>
                </div>
            </article>
        `;
    }

    function initStoryCards() {
        document.addEventListener("click", function (event) {
            const card = event.target.closest(".story-card");
            if (!card) return;
            toggleStoryCard(card);
        });

        document.addEventListener("keydown", function (event) {
            const card = event.target.closest(".story-card");
            if (card && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                toggleStoryCard(card);
                return;
            }

            if (event.key !== "Escape") return;
            document.querySelectorAll(".story-card.is-flipped").forEach(function (card) {
                card.classList.remove("is-flipped");
                card.setAttribute("aria-pressed", "false");
                syncStoryCardHeight(card, false);
            });
        });
    }

    function syncStoryCardHeight(card, flipped) {
        // Faces are position:absolute, so the card keeps a fixed photo height by default. When
        // flipped to the story text, grow the card to fit that text instead of clipping/scrolling.
        const back = card.querySelector(".story-back");
        if (flipped && back) {
            // +2px guards against sub-pixel rounding clipping the last line.
            card.style.height = (back.scrollHeight + 2) + "px";
        } else {
            card.style.height = "";
        }
    }

    function toggleStoryCard(card) {
        const flipped = card.classList.toggle("is-flipped");
        card.setAttribute("aria-pressed", flipped ? "true" : "false");
        syncStoryCardHeight(card, flipped);
    }

    // Page-level a11y basics injected once per page (DRY across every static shell since the site is
    // fully JS-driven): a skip link and an id on <main>.
    // theme-color is NOT injected here any more — it is a STATIC <meta name="theme-color"
    // content="#FCFAF5"> in every page's <head>. Injecting it took ~250ms, long enough for mobile
    // browser chrome to paint its default colour and then visibly recolour on every navigation.
    // Idempotent: main.id is set before the skip-link bail-out, so callers may run this twice (once
    // from renderChrome, once after a chapter page injects its <main>).
    function ensureSkipLink() {
        const main = document.querySelector("main");
        if (main && !main.id) main.id = "main-content";
        if (document.querySelector(".skip-link")) return;
        const link = document.createElement("a");
        link.className = "skip-link";
        link.href = "#" + (main && main.id ? main.id : "main-content");
        link.textContent = "Skip to main content";
        document.body.insertBefore(link, document.body.firstChild);
    }

    function initMobileNavigation() {
        const hamburger = document.querySelector(".hamburger");
        const navMenu = document.querySelector(".nav-menu");
        if (!hamburger || !navMenu) return;
        // The click listener below has no other guard, so a second call would toggle the drawer
        // twice per click (open, instantly close). Flag the BUTTON, not .nav-menu: the menu owns the
        // delegated drawer-close listener, which must be free to rebind when refreshChaptersDropdown
        // replaces the dropdown <li>s.
        if (hamburger.dataset.mobileNavBound) return;
        hamburger.dataset.mobileNavBound = "true";

        hamburger.setAttribute("aria-label", "Open navigation menu");
        hamburger.setAttribute("aria-expanded", "false");

        hamburger.addEventListener("click", function () {
            const isOpen = navMenu.classList.toggle("active");
            hamburger.classList.toggle("active", isOpen);
            hamburger.setAttribute("aria-expanded", isOpen ? "true" : "false");
            document.body.classList.toggle("nav-open", isOpen);
        });

        // Closing the drawer on link clicks is DELEGATED to the menu itself rather than bound per
        // <a>: refreshChaptersDropdown() replaces the dropdown's <li>s after the Firestore fetch
        // lands, which would silently drop per-link handlers and leave the drawer open when a
        // chapter link is tapped. (Re-running initMobileNavigation instead is not an option — it
        // would double-bind the hamburger.)
        navMenu.addEventListener("click", function (event) {
            const link = event.target instanceof Element ? event.target.closest("a") : null;
            if (!link || !navMenu.contains(link)) return;
            navMenu.classList.remove("active");
            hamburger.classList.remove("active");
            hamburger.setAttribute("aria-expanded", "false");
            document.body.classList.remove("nav-open");
        });
    }

    // HERO PAGES: on any page carrying the static body class "nav-overlay" the navbar sits fixed
    // over the page's opening hero and goes transparent while that hero is behind it
    // (body.nav-overlay CSS), turning solid again the moment the hero scrolls past — paper-coloured
    // links would be unreadable on the light page body. The SOLID bar is the CSS default and
    // .is-over-hero is what this adds, so a blocked script (or a renderer that threw before this
    // ran) leaves a readable navbar rather than an invisible one. Gated on body.nav-overlay + the
    // page's first hero, so every other page (admin, design system, test harnesses) keeps the plain
    // sticky navbar and this is a no-op there.
    // Safe to call repeatedly: it tears down the previous observer first (navOverlayObserver is
    // declared at the top of this IIFE — see the note there). Called at parse time from
    // renderChrome() (so the bar reads transparent from the first paint, without waiting on the
    // Firestore fetch that gates initRender) and once more from ensureChapterProfileLayout() when it
    // injects a chapter hero.
    //
    // body.nav-overlay CROSS-FADES the bar between solid and transparent, which must NOT run for the
    // initial state: any first paint landing before this executes shows the solid default and would
    // then visibly fade to transparent. So the transition is CSS-gated on body.nav-ready, removed
    // here while the state is applied and restored one frame later — every call, because the
    // chapter-profile re-call flips the bar solid→transparent long after first paint too.
    var navReadyGeneration = 0;
    function enableNavTransitions(recheck) {
        const generation = ++navReadyGeneration;
        const raf = window.requestAnimationFrame
            ? window.requestAnimationFrame.bind(window)
            : function (fn) { return setTimeout(fn, 16); };
        // TWO frames, not one: the state applied above has to be recalculated and painted with
        // transitions still OFF first. Adding the class in the SAME frame would fold both changes
        // into one style recalculation, and the browser animates whenever the after-change style
        // has a transition — which is the fade this exists to suppress.
        raf(function () {
            if (generation !== navReadyGeneration) return; // superseded by a later call
            // LAST CHANCE to correct the state, and it MUST happen in this frame — not the next one
            // beside `nav-ready`. The browser applies a fragment scroll (impact.html#seniors) and its
            // own scroll restoration AFTER this script runs, so the geometry read in initNavOverlay
            // was taken at y=0 and is stale by now; the IntersectionObserver's own correction lands
            // later still, i.e. after nav-ready has armed the 220ms cross-fade, which paints as
            // paper links fading over cream. Correcting here, with transitions still off, makes it a
            // snap. (Measured: doing this in the SAME callback as the class add still animated —
            // the after-change style already carried the transition.)
            if (typeof recheck === "function") recheck();
            raf(function () {
                if (generation !== navReadyGeneration) return;
                document.body.classList.add("nav-ready");
            });
        });
    }

    function initNavOverlay() {
        // Handshake with the inline first-paint snippet in every hero page's <body> (it applies
        // .is-over-hero before this file has even downloaded, then drops it again on `load` unless
        // this flag says the real observer took over).
        window.__bfblNavOverlayReady = true;
        const navbar = document.querySelector(".navbar");
        if (!navbar || !document.body.classList.contains("nav-overlay")) return;
        document.body.classList.remove("nav-ready");
        // First hero in document order: .home-hero (home), .hero-editorial (interior pages) or
        // .chapter-hero (chapter profiles — injected later by ensureChapterProfileLayout, which
        // calls this again once the hero exists).
        const hero = document.querySelector(".home-hero, .hero-editorial, .chapter-hero");
        if (navOverlayObserver) {
            navOverlayObserver.disconnect();
            navOverlayObserver = null;
        }
        // No hero to sit over, or no IntersectionObserver (very old browsers): leave the bar solid.
        if (!hero || !("IntersectionObserver" in window)) {
            navbar.classList.remove("is-over-hero");
            enableNavTransitions();
            return;
        }

        // Initial state from GEOMETRY, mirroring the observer's own rootMargin condition below
        // (hero still crossing the band under the fixed bar). Adding .is-over-hero unconditionally
        // was wrong for any load that is ALREADY scrolled when this runs — a mid-page reload, a
        // back-restore — where the bar painted transparent over light content until the observer's
        // first callback corrected it (a visible flash, or a 220ms cross-fade once nav-ready has
        // landed). Matching the observer makes its first callback a no-op.
        // An anchor deep-link (impact.html#seniors) is the same problem one step later: Chrome runs
        // the fragment scroll AFTER this script, from y=0, so this read says "over the hero" and is
        // stale a moment later. html{scroll-behavior:smooth} is gone (it animated that jump with the
        // bar still paper-on-paper), and enableNavTransitions() re-runs this test in the frame
        // before it arms the cross-fade, so the correction snaps instead of fading.
        const navH = navbar.offsetHeight || 76;
        const heroRect = hero.getBoundingClientRect();
        navbar.classList.toggle("is-over-hero", heroRect.bottom > navH);
        navOverlayObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                navbar.classList.toggle("is-over-hero", entry.isIntersecting);
            });
        }, { rootMargin: "-" + navH + "px 0px 0px 0px", threshold: 0 });

        navOverlayObserver.observe(hero);
        enableNavTransitions(function () {
            navbar.classList.toggle("is-over-hero", hero.getBoundingClientRect().bottom > navH);
        });
    }

    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
            anchor.addEventListener("click", function (event) {
                const href = anchor.getAttribute("href");
                if (!href || href === "#") return; // safeUrl() fallback links — nothing to scroll to
                let target = null;
                try { target = document.querySelector(href); } catch (err) { return; }
                if (!target) return;
                event.preventDefault();
                target.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
                // Keep the URL in sync so anchors deep-link and :target styles apply.
                if (window.history && history.pushState) history.pushState(null, "", href);
                // Move keyboard focus with the visual jump — without this the skip link
                // scrolled but left focus in the navbar, defeating its purpose.
                if (target.tabIndex < 0 && !target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
                target.focus({ preventScroll: true });
            });
        });
    }

    function initRevealEffects() {
        const targets = document.querySelectorAll(".service-card, .officer-card, .chapter-card, .leader-card, .story-card, .card, .team-member, .feature-box");
        if (!("IntersectionObserver" in window)) return;
        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("reveal-in");
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });

        targets.forEach(function (target) {
            const rect = target.getBoundingClientRect();
            const inViewport = rect.top < (window.innerHeight - 24) && rect.bottom > 24;
            // ABOVE the viewport counts as already seen: this pass can run after the reader has
            // already scrolled (a cold load, a mid-page reload, a back-restore), and marking
            // something behind them .reveal-ready means it animates in only if they scroll back UP,
            // which reads as a glitch rather than an entrance. `height > 0` excludes a display:none
            // element, whose all-zero rect would otherwise look like "scrolled past".
            const scrolledPast = rect.height > 0 && rect.bottom <= 24;
            if (inViewport || scrolledPast) {
                target.classList.add("reveal-in");
                return;
            }

            target.classList.add("reveal-ready");
            observer.observe(target);
        });
    }

    function initImageFallbacks(root) {
        const scope = root || document;
        scope.querySelectorAll("img").forEach(function (img) {
            // Lazy ONLY below the fold. Hydrated markup lands after first paint, so stamping
            // loading="lazy" on an in-viewport <img> (member photos, gallery tiles, the top of a
            // chapter page) deferred it a second time and made the images visibly pop in one beat
            // after their cards.
            if (!img.hasAttribute("loading") && img.getBoundingClientRect().top >= window.innerHeight) {
                img.setAttribute("loading", "lazy");
            }
            if (img.dataset.fallbackReady) return;
            img.dataset.fallbackReady = "true";

            // OPT-OUT (data-no-fallback): content photos that must degrade to their own
            // container instead of a placeholder — the home program tiles, whose .service-media
            // frame already paints a soft mint box at the right 4:3 size. They have no initials
            // to fall back to, and swapping in logo.avif (or the padded contain-fit below) would
            // read as a broken tile rather than a photo that simply hasn't shipped yet.
            if (img.dataset.noFallback) return;

            // (Story cards keep the uniform CSS 4:3 aspect — cards previously adopted each
            // photo's natural ratio, which made the Photo Stories row read ragged: a short
            // landscape sandwiched between two tall portraits. object-fit:cover crops instead.)

            function handleError() {
                const current = img.getAttribute("src") || "";
                const normalized = normalizeLegacyImagePath(current);
                if (!img.dataset.normalizedTried && normalized && normalized !== current) {
                    img.dataset.normalizedTried = "true";
                    img.src = normalized;
                    return;
                }

                if (img.dataset.initialsFallback) {
                    const span = document.createElement("span");
                    const cls = img.getAttribute("class");
                    span.className = cls ? `avatar-initials ${cls}` : "avatar-initials";
                    span.setAttribute("role", "img");
                    const name = img.dataset.name || "";
                    span.setAttribute("aria-label", name || "Member");
                    span.textContent = personInitials(name);
                    if (img.parentNode) img.parentNode.replaceChild(span, img);
                    return;
                }

                const fallback = img.dataset.fallback || "images/logo.avif";
                if (!img.dataset.fallbackTried && current !== fallback) {
                    img.dataset.fallbackTried = "true";
                    img.src = fallback;
                    return;
                }

                img.style.objectFit = "contain";
                img.style.padding = "12px";
                img.style.background = "var(--surface)";
            }

            img.addEventListener("error", handleError);
            // Catch images that already failed before this listener was attached (data-driven
            // avatars render async after Firestore loads, so an error can fire before init runs).
            // `complete && naturalWidth===0` = a finished-but-broken image → trigger the fallback now.
            if (img.getAttribute("src") && img.complete && img.naturalWidth === 0) handleError();
        });
    }

    function normalizeLegacyImagePath(src) {
        if (!src || /^(https?:|data:|blob:)/i.test(src)) return src;
        if (!src.includes("images/") && !src.includes("/images/")) return src;
        try {
            return decodeURI(src).replace(/\\/g, "/").toLowerCase();
        } catch (error) {
            return src.replace(/%20/gi, " ").toLowerCase();
        }
    }

    function initCarousels() {
        document.querySelectorAll(".carousel-container").forEach(function (carousel) {
            const slides = Array.from(carousel.querySelectorAll(".carousel-slide"));
            const prevBtn = carousel.querySelector(".carousel-arrow.prev");
            const nextBtn = carousel.querySelector(".carousel-arrow.next");
            const dotsContainer = carousel.querySelector(".carousel-dots");
            if (!slides.length) return;

            let currentSlide = 0;
            slides.forEach(function (slide, index) {
                slide.classList.toggle("active", index === 0);
            });

            if (dotsContainer && !dotsContainer.children.length && slides.length > 1) {
                slides.forEach(function (_, index) {
                    const dot = document.createElement("button");
                    dot.type = "button";
                    dot.className = "carousel-dot" + (index === 0 ? " active" : "");
                    dot.setAttribute("aria-label", `Go to slide ${index + 1}`);
                    dot.addEventListener("click", function () {
                        showSlide(index);
                    });
                    dotsContainer.appendChild(dot);
                });
            }

            function showSlide(index) {
                slides.forEach(function (slide) {
                    slide.classList.remove("active");
                    const video = slide.querySelector("video");
                    if (video) video.pause();
                });
                currentSlide = (index + slides.length) % slides.length;
                slides[currentSlide].classList.add("active");
                if (dotsContainer) {
                    dotsContainer.querySelectorAll(".carousel-dot").forEach(function (dot, dotIndex) {
                        dot.classList.toggle("active", dotIndex === currentSlide);
                    });
                }
            }

            if (slides.length <= 1) {
                if (prevBtn) prevBtn.style.display = "none";
                if (nextBtn) nextBtn.style.display = "none";
                return;
            }

            if (prevBtn) prevBtn.addEventListener("click", function () { showSlide(currentSlide - 1); });
            if (nextBtn) nextBtn.addEventListener("click", function () { showSlide(currentSlide + 1); });
        });
    }

    function initLightbox() {
        if (!document.querySelector(".lightbox")) {
            document.body.insertAdjacentHTML("beforeend", `
                <div class="lightbox" role="dialog" aria-modal="true" aria-label="Image viewer">
                    <button class="lightbox-close" type="button" aria-label="Close image viewer">
                        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </button>
                    <div class="lightbox-content">
                        <button class="lightbox-nav lightbox-prev" type="button" aria-label="Previous image">
                            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </button>
                        <button class="lightbox-nav lightbox-next" type="button" aria-label="Next image">
                            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </button>
                    </div>
                    <div class="lightbox-info">
                        <span class="lightbox-caption"></span>
                        <span class="lightbox-counter"></span>
                    </div>
                </div>
            `);
        }

        const lightbox = document.querySelector(".lightbox");
        const lightboxContent = lightbox.querySelector(".lightbox-content");
        const closeButton = lightbox.querySelector(".lightbox-close");
        const prevButton = lightbox.querySelector(".lightbox-prev");
        const nextButton = lightbox.querySelector(".lightbox-next");
        const counter = lightbox.querySelector(".lightbox-counter");
        const caption = lightbox.querySelector(".lightbox-caption");
        let galleryItems = [];
        let currentIndex = 0;
        let lastFocused = null;

        function openLightboxFrom(media) {
            const group = media.closest(".carousel-container, [data-lightbox-group]");
            galleryItems = group ? Array.from(group.querySelectorAll(".clickable-image")) : [media];
            currentIndex = Math.max(0, galleryItems.indexOf(media));
            lastFocused = document.activeElement;
            showLightbox();
            closeButton.focus();
        }

        document.querySelectorAll(".clickable-image").forEach(function (media) {
            if (media.dataset.lightboxBound) return;
            // Videos keep their native controls inline — the click/role=button hijack made
            // taps on play/pause open the lightbox instead. (They stay reachable through a
            // group's prev/next navigation, where the lightbox renders them with controls.)
            if (media.tagName === "VIDEO") return;
            media.dataset.lightboxBound = "true";
            // Make the bare <img> tile a real keyboard-operable control (matches the flip-card pattern).
            if (!media.hasAttribute("role")) media.setAttribute("role", "button");
            if (!media.hasAttribute("tabindex")) media.setAttribute("tabindex", "0");
            if (!media.getAttribute("aria-label")) media.setAttribute("aria-label", "Enlarge image" + (media.alt ? ": " + media.alt : ""));
            media.addEventListener("click", function (event) {
                event.stopPropagation();
                openLightboxFrom(media);
            });
            media.addEventListener("keydown", function (event) {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault(); // stop Space from scrolling the page
                openLightboxFrom(media);
            });
        });

        function showLightbox() {
            const item = galleryItems[currentIndex];
            if (!item) return;

            lightboxContent.querySelectorAll("img, video").forEach(function (node) {
                node.remove();
            });

            if (item.tagName === "VIDEO") {
                const video = document.createElement("video");
                const source = item.querySelector("source");
                video.src = item.currentSrc || (source && source.src) || item.src;
                video.controls = true;
                video.autoplay = true;
                lightboxContent.insertBefore(video, nextButton);
            } else {
                const image = document.createElement("img");
                image.src = item.currentSrc || item.src;
                image.alt = item.alt || "Gallery image";
                image.dataset.fallback = item.dataset.fallback || "images/logo.avif";
                lightboxContent.insertBefore(image, nextButton);
                initImageFallbacks(lightboxContent);
            }

            counter.textContent = `${currentIndex + 1} / ${galleryItems.length}`;
            if (caption) {
                // Show the capture date + location of the enlarged photo (from the tile's data-*).
                var bits = [];
                if (item.dataset && item.dataset.taken) bits.push(item.dataset.taken);
                if (item.dataset && item.dataset.location) bits.push(item.dataset.location);
                caption.textContent = bits.join(" · ");
            }
            prevButton.style.display = galleryItems.length > 1 ? "inline-flex" : "none";
            nextButton.style.display = galleryItems.length > 1 ? "inline-flex" : "none";
            lightbox.classList.add("active");
            document.body.classList.add("modal-open");
        }

        function closeLightbox() {
            lightbox.classList.remove("active");
            document.body.classList.remove("modal-open");
            const video = lightbox.querySelector("video");
            if (video) video.pause();
            // Return focus to the tile that opened the lightbox.
            if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
            lastFocused = null;
        }

        function nextImage() {
            currentIndex = (currentIndex + 1) % galleryItems.length;
            showLightbox();
        }

        function prevImage() {
            currentIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
            showLightbox();
        }

        closeButton.addEventListener("click", closeLightbox);
        nextButton.addEventListener("click", nextImage);
        prevButton.addEventListener("click", prevImage);
        lightbox.addEventListener("click", function (event) {
            if (event.target === lightbox) closeLightbox();
        });
        document.addEventListener("keydown", function (event) {
            if (!lightbox.classList.contains("active")) return;
            if (event.key === "Escape") closeLightbox();
            if (event.key === "ArrowRight" && galleryItems.length > 1) nextImage();
            if (event.key === "ArrowLeft" && galleryItems.length > 1) prevImage();
            if (event.key === "Tab") {
                // Trap Tab within the dialog's visible controls (prev/next are hidden for single items).
                const focusables = [closeButton, prevButton, nextButton].filter(function (b) { return b.offsetParent !== null; });
                if (!focusables.length) return;
                const firstF = focusables[0];
                const lastF = focusables[focusables.length - 1];
                if (event.shiftKey && document.activeElement === firstF) { lastF.focus(); event.preventDefault(); }
                else if (!event.shiftKey && document.activeElement === lastF) { firstF.focus(); event.preventDefault(); }
            }
        });
    }

    // "Ways to give" hub (donate.html): renders one tile per payment method into #donate-methods.
    // Methods are hardcoded here (like `stats`/FOUNDERS) — they're not part of the Firestore model.
    // GoFundMe, Zelle, and PayPal are live.
    function renderDonatePage() {
        var root = document.getElementById("donate-methods");
        if (!root) return;
        root.innerHTML = donateMethods().map(donateMethodMarkup).join("");
    }

    function donateMethods() {
        return [
            {
                id: "gofundme", name: "GoFundMe", tag: "Card · Apple Pay · Google Pay",
                blurb: "Give securely online and help us reach the goal — every gift shows on our public fundraiser.",
                type: "link", url: peruFundraiserUrl, cta: "Donate on GoFundMe"
            },
            {
                id: "zelle", name: "Zelle", tag: "Bank-to-bank · zero fees",
                blurb: "Scan the QR code to send straight from your banking app with no processing fees.",
                type: "qr", qr: "images/donate/zelle-qr.png", pending: false,
                alt: "Zelle QR code to donate to Bytes for Better Lives"
            },
            {
                id: "paypal", name: "PayPal", tag: "PayPal balance or any card",
                blurb: "Scan the QR code to give through PayPal.",
                type: "qr", qr: "images/donate/paypal-qr.png", pending: false,
                alt: "PayPal QR code to pay Inna Tkachenko"
            }
        ];
    }

    function donateQrGlyph() {
        // Decorative stand-in for a real QR while a method is pending.
        return '<svg viewBox="0 0 48 48" width="52" height="52" aria-hidden="true" focusable="false" fill="currentColor">' +
            '<path d="M6 6h14v14H6V6zm3 3v8h8V9H9zm3 3h2v2h-2v-2zM28 6h14v14H28V6zm3 3v8h8V9h-8zm3 3h2v2h-2v-2zM6 28h14v14H6V28zm3 3v8h8v-8H9zm3 3h2v2h-2v-2zM28 28h4v4h-4v-4zm6 0h4v4h-4v-4zm4 4h4v4h-4v-4zm-10 0h4v4h-4v-4zm0 6h4v4h-4v-4zm6 0h4v4h-4v-4zm4 0h4v4h-4v-4z"/>' +
            '</svg>';
    }

    function donateMethodMarkup(m) {
        var pending = !!m.pending;
        var typeClass = m.type ? " donate-method--" + m.type : "";
        var foot;
        if (m.type === "qr") {
            var qrAlt = m.alt || (m.name ? m.name + " QR code" : "Donation QR code");
            if (pending || !m.qr) {
                foot = '<div class="donate-qr donate-qr--placeholder">' + donateQrGlyph() + '</div>' +
                    '<p class="donate-method-note">We’ll add the QR code here soon.</p>';
            } else {
                foot = '<div class="donate-qr"><img src="' + escapeHTML(m.qr) + '" alt="' + escapeHTML(qrAlt) + '" loading="lazy"></div>';
            }
        } else {
            if (pending || !m.url) {
                foot = '<span class="donate-method-cta is-pending" role="text">Coming soon</span>';
            } else {
                foot = '<a class="btn btn-donate donate-method-cta" href="' + escapeHTML(safeUrl(m.url)) + '" target="_blank" rel="noopener noreferrer">' + escapeHTML(m.cta || "Donate") + '</a>';
            }
        }
        return '<article class="card donate-method' + typeClass + (pending ? " donate-method--pending" : "") + '">' +
            '<div class="donate-method-head">' +
                '<h3 class="donate-method-name">' + escapeHTML(m.name) + '</h3>' +
                (pending ? '<span class="donate-method-badge">Coming soon</span>' : "") +
            '</div>' +
            (m.tag ? '<p class="donate-method-tag">' + escapeHTML(m.tag) + '</p>' : "") +
            (m.blurb ? '<p class="donate-method-blurb">' + escapeHTML(m.blurb) + '</p>' : "") +
            '<div class="donate-method-foot">' + foot + '</div>' +
        '</article>';
    }

    function initCounters() {
        if (!("IntersectionObserver" in window)) return;
        const counters = document.querySelectorAll('.animated-counter');
        if (!counters.length) return;

        const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const formatCache = new Map();
        function formatValue(value, decimals) {
            const key = String(decimals);
            let formatter = formatCache.get(key);
            if (!formatter) {
                formatter = new Intl.NumberFormat("en-US", {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals
                });
                formatCache.set(key, formatter);
            }
            return formatter.format(value);
        }

        function settle(el) {
            const target = parseFloat(el.getAttribute("data-target")) || 0;
            const decimals = parseInt(el.getAttribute("data-decimals"), 10) || 0;
            el.dataset.animated = "true";
            el.textContent = (el.getAttribute("data-prefix") || "") +
                formatValue(target, decimals) + (el.getAttribute("data-suffix") || "");
        }

        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) {
                    // ABOVE the viewport: the reader is already past the band (a mid-page reload, a
                    // back-restore), and this observer only ever fires again on scroll-back — so
                    // show the real number rather than leaving a literal 0 behind them. The test
                    // belongs HERE, not at attach time: this runs from renderStaticBody() at parse
                    // time, before Chrome applies the fragment scroll / scroll restoration, so
                    // scrollY is still 0 then and nothing is ever "past" yet.
                    const past = entry.target;
                    if (!past.dataset.animated && entry.boundingClientRect.height > 0 &&
                        entry.boundingClientRect.bottom <= 0) {
                        settle(past);
                        observer.unobserve(past);
                    }
                    return;
                }
                const el = entry.target;
                if (el.dataset.animated) return;
                el.dataset.animated = "true";
                observer.unobserve(el);

                const target = parseFloat(el.getAttribute('data-target')) || 0;
                const prefix = el.getAttribute('data-prefix') || "";
                const suffix = el.getAttribute('data-suffix') || "";
                const decimals = parseInt(el.getAttribute('data-decimals'), 10) || 0;

                // Respect reduced-motion: skip the count-up and show the final value immediately.
                if (reduceMotion) {
                    el.textContent = prefix + formatValue(target, decimals) + suffix;
                    return;
                }

                const duration = 2000;
                const startTime = performance.now();

                function update(currentTime) {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const easeOut = 1 - Math.pow(1 - progress, 3);
                    const current = target * easeOut;

                    el.textContent = prefix + formatValue(current, decimals) + suffix;

                    if (progress < 1) {
                        requestAnimationFrame(update);
                    } else {
                        el.textContent = prefix + formatValue(target, decimals) + suffix;
                    }
                }
                requestAnimationFrame(update);
            });
        }, { threshold: 0.1 });

        counters.forEach(function (counter) {
            observer.observe(counter);
        });
    }

    // EVERYTHING THAT CAN PAINT IN THE FIRST FRAME, synchronously at parse time: script.js is a
    // plain end-of-<body> script, so the navbar, the footer container, every content container and
    // any static hero are already in the DOM here. Anything left to initRender (gated on the
    // Firestore fetch, up to 3s) paints one beat AFTER the page — which is the flash.
    //
    // ⚠️ boot() MUST STAY THE LAST STATEMENT IN THIS IIFE, and renderChrome() must be called
    // EXACTLY ONCE, inside it. Function declarations hoist, but the module-level `const`s do NOT:
    // calling any of this higher up put SOCIAL_ICONS (and, via initRender, the map-pin tables) in
    // the temporal dead zone, so renderFooter threw, the whole IIFE aborted mid-way and every later
    // const stayed permanently uninitialised.
    //
    // Order inside boot() is load-bearing:
    //   1. ensureChapterProfileLayout() — chapter stubs only (it bails on a missing
    //      data-chapter-id), and ONLY on a warm start. They ship as navbar + footer, so their whole
    //      <main> — hero included — used to arrive behind the Firestore wait, showing a solid bar
    //      over one blank cream viewport. The template reads no data, so it can run here; and the
    //      hero must exist BEFORE renderChrome() for initNavOverlay() to find it on the first pass.
    //      ⚠️ Gated on the SAME warm-start flag as step 4 on purpose: the template ships a
    //      placeholder headline and an empty subtitle/description/actions, so injecting it on a
    //      COLD start put a visibly wrong hero on screen and then re-laid it out when Firestore
    //      landed (measured 0.44-0.49 CLS on chapter pages, against ~0 for the reserved-blank
    //      path). Warm, step 4 fills it in this same tick, so nothing is ever seen unfilled.
    //   2. renderChrome() — needs the navbar filled before initNavOverlay measures offsetHeight.
    //   3. renderStaticBody() — hardcoded arrays, no data needed, so it always runs here.
    //   4. renderBodyOnce() — only on a warm start, where the live content is already in
    //      window.BFBL_DATA. See its own comment for why it is never allowed to run twice.
    function boot() {
        // Warm start only — see renderBodyOnce(). Cold starts keep the pre-existing path: the
        // reserved viewport (styles.css), then layout + content together once the fetch lands.
        var warm = !!window.BFBL_DATA_SYNC;
        if (warm) ensureChapterProfileLayout();
        renderChrome();
        renderStaticBody();
        if (warm) renderBodyOnce();
    }
    boot();
})();

let emailModalTrigger = null;

window.openEmailModal = function() {
    const modal = document.getElementById("email-modal");
    if (!modal) return;
    emailModalTrigger = document.activeElement;
    modal.classList.add("active");
    document.body.classList.add("modal-open");
    const first = document.getElementById("sender-email");
    if (first) first.focus();
};

window.closeEmailModal = function() {
    const modal = document.getElementById("email-modal");
    if (!modal) return;
    modal.classList.remove("active");
    document.body.classList.remove("modal-open");
    // Restore focus to whatever opened the dialog.
    if (emailModalTrigger && typeof emailModalTrigger.focus === "function") emailModalTrigger.focus();
    emailModalTrigger = null;
};

// Escape and backdrop click close the email modal; Tab is trapped inside it while open
// (bound once, like the lightbox).
document.addEventListener("keydown", function (e) {
    const m = document.getElementById("email-modal");
    if (!m || !m.classList.contains("active")) return;
    if (e.key === "Escape") {
        window.closeEmailModal();
        return;
    }
    if (e.key !== "Tab") return;
    const focusables = Array.from(m.querySelectorAll(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
    )).filter(function (el) { return el.offsetParent !== null && !el.disabled && el.tabIndex >= 0; });
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && (document.activeElement === first || !m.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !m.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
    }
});
document.addEventListener("click", function (e) {
    const m = document.getElementById("email-modal");
    if (m && m.classList.contains("active") && e.target === m) window.closeEmailModal();
});

const EMAIL_FORM_COOLDOWN_MS = 60 * 1000; // 1 message/min/browser — basic anti-spam throttle
const EMAIL_MESSAGE_MAX = 4000;

window.submitEmailForm = async function(event) {
    event.preventDefault();
    const btn = document.getElementById("submit-email-btn");
    const originalBtnLabel = btn.textContent; // each page keeps its own label ("Send Message"/"Send Email")
    const status = document.getElementById("email-status");
    const email = document.getElementById("sender-email").value;
    const message = document.getElementById("sender-message").value;
    // Honeypot: a hidden field real users never see. Bots fill it → silently drop (pretend success).
    const honeypotEl = document.getElementById("company-website");
    if (honeypotEl && honeypotEl.value) {
        status.style.color = "var(--green-dark)";
        status.textContent = "Email sent successfully! We will get back to you soon.";
        document.getElementById("email-form").reset();
        setTimeout(closeEmailModal, 3000);
        return;
    }

    // Client-side rate limit (defense-in-depth; the real server-side limit should live at the relay).
    try {
        const last = Number(localStorage.getItem("bfblEmailFormLast") || 0);
        const wait = EMAIL_FORM_COOLDOWN_MS - (Date.now() - last);
        if (last && wait > 0) {
            status.style.color = "var(--danger)";
            status.textContent = "Please wait " + Math.ceil(wait / 1000) + "s before sending another message.";
            return;
        }
    } catch (e) { /* localStorage blocked — skip throttle */ }

    if (message && message.length > EMAIL_MESSAGE_MAX) {
        status.style.color = "var(--danger)";
        status.textContent = "Message is too long (max " + EMAIL_MESSAGE_MAX + " characters).";
        return;
    }

    btn.disabled = true;
    btn.textContent = "Sending…";
    status.textContent = "";

    try {
        const response = await fetch("https://formsubmit.co/ajax/bytesforbetterlives@gmail.com", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                _subject: "New Chapter Interest Form Submission",
                _template: "table",
                _honey: honeypotEl ? honeypotEl.value : "", // server-side honeypot at FormSubmit
                email: email,
                message: (message || "").slice(0, EMAIL_MESSAGE_MAX)
            })
        });

        if (response.ok) {
            try { localStorage.setItem("bfblEmailFormLast", String(Date.now())); } catch (e) { /* ignore */ }
            status.style.color = "var(--green-dark)";
            status.textContent = "Email sent successfully! We will get back to you soon.";
            document.getElementById("email-form").reset();
            setTimeout(closeEmailModal, 3000);
        } else {
            const errorText = await response.text();
            throw new Error(errorText);
        }
    } catch (error) {
        console.error(error);
        status.style.color = "var(--danger)";
        status.textContent = "Failed to send email. Please try again or email us directly.";
    } finally {
        btn.disabled = false;
        btn.textContent = originalBtnLabel;
    }
};
