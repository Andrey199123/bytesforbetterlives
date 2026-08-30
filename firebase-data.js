// firebase-data.js — public read layer for the live site.
//
// Reads the shared content doc (site/content) AND the per-chapter docs (chapterContent/*) from
// Firestore via the public REST API (no SDK/login; security rules allow public reads), then merges
// them into window.BFBL_DATA so script.js renders one combined dataset. Falls back to data.js if
// Firestore is empty/unreachable. Loaded BEFORE script.js on each page.
//
// Repeat visits are served from a localStorage SNAPSHOT of the last good LIVE read (what Firestore
// itself returned that load — not the merged window.BFBL_DATA view, or a deleted field would live on), so
// BFBL_DATA_READY resolves synchronously and the navbar/footer/content paint on script.js's FIRST
// pass instead of ~250ms later (the tab-switch flash). The live fetch still runs in the background
// on every load; it refreshes the snapshot for the NEXT navigation and deliberately does not
// re-render the current view.

(function () {
    var PROJECT = "project-686d62b7-14f5-43c7-acc";
    var BASE = "https://firestore.googleapis.com/v1/projects/" + PROJECT + "/databases/(default)/documents";
    // ?prettyPrint=false — the REST API indents its JSON by default, which is ~2.7x the bytes for
    // the same decoded payload (measured 871KB -> 327KB raw on site/content). Same host, so the CSP
    // allowlist is unaffected, and the decoded shape is identical: no SNAPSHOT_VERSION bump.
    var CONTENT_URL = BASE + "/site/content?prettyPrint=false";
    var CHAPTERS_URL = BASE + "/chapterContent?prettyPrint=false";
    var TIMEOUT_MS = 3000; // don't block rendering on a slow/offline network

    var SNAPSHOT_VERSION = 1;          // bump whenever the stored shape changes (key follows it)
    var SNAPSHOT_KEY = "bfbl:data:v" + SNAPSHOT_VERSION;
    var SNAPSHOT_MAX_AGE_MS = 10 * 60 * 1000;
    // The only galleryImages fields anything public reads (tile markup + the location/date
    // bucketing in script.js). The ingested `exif` blobs are 68% of the whole dataset and nothing
    // reads them, so they never go into the snapshot.
    var GALLERY_SNAPSHOT_FIELDS = ["src", "alt", "takenAt", "locationName", "gps"];

    // Convert Firestore REST typed values into plain JS.
    function decode(v) {
        if (v == null) return null;
        if ("stringValue" in v) return v.stringValue;
        if ("integerValue" in v) return Number(v.integerValue);
        if ("doubleValue" in v) return Number(v.doubleValue);
        if ("booleanValue" in v) return v.booleanValue;
        if ("nullValue" in v) return null;
        if ("timestampValue" in v) return v.timestampValue;
        if ("mapValue" in v) return decodeFields(v.mapValue.fields || {});
        if ("arrayValue" in v) return (v.arrayValue.values || []).map(decode);
        return null;
    }
    function decodeFields(fields) {
        var out = {};
        Object.keys(fields).forEach(function (k) { out[k] = decode(fields[k]); });
        return out;
    }

    function personKey(person) {
        var name = person && person.name ? String(person.name).trim().toLowerCase() : "";
        if (!name) return "";
        var chapter = person && person.chapter ? String(person.chapter).trim().toLowerCase() : "";
        return chapter + "|" + name;
    }

    function dedupePeople(list) {
        var byKey = {};
        var order = [];
        (list || []).forEach(function (person) {
            if (!person) return;
            var key = personKey(person);
            if (!key) return;
            if (Object.prototype.hasOwnProperty.call(byKey, key)) {
                var existingIndex = order.indexOf(key);
                if (existingIndex !== -1) {
                    order.splice(existingIndex, 1);
                }
            }
            order.push(key);
            byKey[key] = person;
        });
        return order.map(function (key) { return byKey[key]; });
    }

    function fetchChapterDocs() {
        return fetch(CHAPTERS_URL)
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (json) {
                var docs = (json && json.documents) || [];
                return docs.map(function (d) {
                    var f = decodeFields(d.fields || {});
                    return { id: d.name.split("/").pop(), page: f.page || {}, members: Array.isArray(f.members) ? f.members : [] };
                });
            })
            .catch(function () { return []; });
    }

    // ---- localStorage snapshot -------------------------------------------------------------
    // Every path below is try/catch'd: localStorage can be missing, blocked (private mode, cookies
    // off) or full, and any failure must degrade to exactly the old behaviour — await the fetch.

    function snapshotEnabled() {
        try {
            if (!window.localStorage) return false;
            // admin.html is the one admin page that loads this file, and its chapter picker awaits
            // BFBL_DATA_READY. A picker must never be up to 10 minutes stale, so admin paths keep
            // the live-fetch behaviour. (Same /admin skip the analytics injectors use.)
            return !/admin/.test(String(location.pathname || "").toLowerCase());
        } catch (err) {
            return false;
        }
    }

    function trimGalleryImages(list) {
        return list.map(function (item) {
            if (!item || typeof item !== "object") return item; // legacy bare path strings
            var slim = {};
            GALLERY_SNAPSHOT_FIELDS.forEach(function (key) {
                if (item[key] != null) slim[key] = item[key];
            });
            return slim;
        });
    }

    function snapshotPayload(fresh) {
        var payload = Object.assign({}, fresh);
        if (Array.isArray(payload.galleryImages)) payload.galleryImages = trimGalleryImages(payload.galleryImages);
        return payload;
    }

    function readSnapshot() {
        try {
            var raw = window.localStorage.getItem(SNAPSHOT_KEY);
            if (!raw) return null;
            var snap = JSON.parse(raw);
            if (!snap || snap.v !== SNAPSHOT_VERSION || !snap.t || !snap.d || typeof snap.d !== "object") return null;
            var age = Date.now() - snap.t;
            if (age < 0 || age > SNAPSHOT_MAX_AGE_MS) return null; // stale, or the clock moved
            return snap.d;
        } catch (err) {
            return null;
        }
    }

    // `fresh` is the freshly DECODED Firestore output only — never window.BFBL_DATA, which on a warm
    // start is snapshot ⊕ fresh keys. Persisting that merged view would carry a field deleted from
    // Firestore forward and re-stamp it with a new timestamp on every load, so the 10-minute TTL
    // could never expire it.
    function writeSnapshot(fresh) {
        if (!snapshotEnabled()) return;
        // Deferred: stringifying + storing the whole dataset must never sit in the resolve path
        // script.js is awaiting.
        setTimeout(function () {
            var serialized;
            try {
                serialized = JSON.stringify({ v: SNAPSHOT_VERSION, t: Date.now(), d: snapshotPayload(fresh) });
            } catch (err) {
                return;
            }
            try {
                window.localStorage.setItem(SNAPSHOT_KEY, serialized);
            } catch (err) {
                // Full/blocked: drop any stale copy (which frees the quota) and try once more.
                try {
                    window.localStorage.removeItem(SNAPSHOT_KEY);
                    window.localStorage.setItem(SNAPSHOT_KEY, serialized);
                } catch (ignored) {
                    // No snapshot this time — the next load simply awaits the fetch, as before.
                }
            }
        }, 0);
    }

    function fetchAll() {
        return Promise.all([
            fetch(CONTENT_URL).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
            fetchChapterDocs()
        ]).then(function (res) {
            var json = res[0];
            var chapterDocs = res[1] || [];
            var live = false; // proof BOTH reads came back — the gate on persisting a snapshot
            // Base of the people merge below. NEVER window.BFBL_DATA.people: on a warm start that
            // is the SNAPSHOT's already-merged roster, so a deleted/renamed member would survive
            // the merge (last-wins, no purge) and get re-persisted with a fresh timestamp — a ghost
            // the 10-minute TTL can never expire. The base is Firestore's unassigned people when it
            // has any, else the data.js seed captured before the snapshot was installed.
            var basePeople = SEED_PEOPLE;
            window.BFBL_DATA = window.BFBL_DATA || {};
            // Everything decoded from THIS read, collected separately from the live view. What gets
            // persisted is this object, not window.BFBL_DATA — see writeSnapshot().
            var fresh = {};

            if (json && json.fields) {
                live = chapterDocs.length > 0;
                var content = decodeFields(json.fields);
                ["people", "chapters", "gallery", "galleryImages", "categories", "titles", "fundraisers", "drives", "contactEmail", "donateUrl", "socialLinks"]
                    .forEach(function (key) {
                        if (content[key] != null) {
                            // Keep the local seed roster when Firestore's people array is empty.
                            // That lets the site still show chapter officers / members without
                            // requiring Firestore writes for every new person.
                            if (key === "people" && Array.isArray(content[key])) {
                                if (content[key].length === 0) return;
                                basePeople = content[key];
                            }
                            window.BFBL_DATA[key] = content[key];
                            fresh[key] = content[key];
                        }
                    });
            }

            // Merge the per-chapter docs over the shared registry.
            if (chapterDocs.length) {
                var registry = Array.isArray(window.BFBL_DATA.chapters) ? window.BFBL_DATA.chapters : [];
                var byId = {};
                chapterDocs.forEach(function (cd) { byId[cd.id] = cd; });
                var mergedChapters = registry.map(function (c) {
                    return byId[c.id] ? Object.assign({}, c, byId[c.id].page) : c;
                });
                chapterDocs.forEach(function (cd) {
                    if (!registry.some(function (c) { return c.id === cd.id; })) {
                        mergedChapters.push(Object.assign({ id: cd.id }, cd.page));
                    }
                });
                window.BFBL_DATA.chapters = mergedChapters;
                fresh.chapters = mergedChapters;

                // people = shared (unassigned) + every chapter doc's members.
                // A member's chapter is defined by WHICH chapter doc they live in, so we re-stamp
                // chapter = cd.id here. This neutralizes a chapter admin forging a member's `chapter`
                // field to make it show on a DIFFERENT chapter's public page (display spoofing).
                var sitePeople = Array.isArray(basePeople) ? basePeople.slice() : [];
                chapterDocs.forEach(function (cd) {
                    (cd.members || []).forEach(function (m) {
                        sitePeople.push(Object.assign({}, m, { chapter: cd.id }));
                    });
                });
                window.BFBL_DATA.people = dedupePeople(sitePeople);
                fresh.people = window.BFBL_DATA.people;
            }

            // Persist only a genuinely live read. An offline/blocked load would otherwise store the
            // pure data.js seed as "fresh" and serve it for the next 10 minutes.
            if (live) writeSnapshot(fresh);
        }).catch(function () { /* offline / blocked → keep data.js */ });
    }

    // The data.js seed roster, captured BEFORE the snapshot overwrites it. fetchAll() merges chapter
    // members onto this, never onto the installed snapshot — see basePeople there.
    var SEED_PEOPLE = (window.BFBL_DATA && Array.isArray(window.BFBL_DATA.people)) ? window.BFBL_DATA.people.slice() : [];

    var snapshot = snapshotEnabled() ? readSnapshot() : null;
    if (snapshot) {
        // Warm start: install the last good merged dataset over the data.js seed synchronously,
        // before script.js parses, so its very first render already has live content.
        window.BFBL_DATA = Object.assign({}, window.BFBL_DATA || {}, snapshot);
        // Signal that the LIVE content is already in window.BFBL_DATA, synchronously, right now.
        // script.js renders the whole body at parse time when this is set, so a page switch paints
        // its content in the FIRST frame instead of one beat later; without it script.js keeps the
        // old behaviour and waits for the fetch (the data.js seed cannot answer "is this section
        // empty?" honestly, and hide-then-reveal is a worse artifact than the wait).
        window.BFBL_DATA_SYNC = true;
    }

    // Always refresh in the background, snapshot or not. fetchAll() ends in a .catch, so it never
    // rejects. When it lands it replaces whole keys on window.BFBL_DATA — script.js has already
    // copied them into its own `data` object by then, so nothing on screen changes; the point of
    // the late landing is the fresher snapshot it writes for the NEXT navigation.
    var pending = fetchAll();

    // script.js awaits this before its first render. Resolves immediately on a warm start,
    // otherwise on load OR timeout — never hangs.
    window.BFBL_DATA_READY = snapshot
        ? Promise.resolve()
        : Promise.race([pending, new Promise(function (resolve) { setTimeout(resolve, TIMEOUT_MS); })]);
})();
