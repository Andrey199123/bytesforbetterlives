// firebase-data.js — public read layer for the live site.
//
// Reads the shared content doc (site/content) AND the per-chapter docs (chapterContent/*) from
// Firestore via the public REST API (no SDK/login; security rules allow public reads), then merges
// them into window.BFBL_DATA so script.js renders one combined dataset. Falls back to data.js if
// Firestore is empty/unreachable. Loaded BEFORE script.js on each page.

(function () {
    var PROJECT = "project-686d62b7-14f5-43c7-acc";
    var BASE = "https://firestore.googleapis.com/v1/projects/" + PROJECT + "/databases/(default)/documents";
    var CONTENT_URL = BASE + "/site/content";
    var CHAPTERS_URL = BASE + "/chapterContent";
    var TIMEOUT_MS = 3000; // don't block rendering on a slow/offline network

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

    function fetchAll() {
        return Promise.all([
            fetch(CONTENT_URL).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
            fetchChapterDocs()
        ]).then(function (res) {
            var json = res[0];
            var chapterDocs = res[1] || [];
            window.BFBL_DATA = window.BFBL_DATA || {};

            if (json && json.fields) {
                var content = decodeFields(json.fields);
                ["people", "chapters", "gallery", "galleryImages", "categories", "titles", "fundraisers", "contactEmail", "donateUrl", "socialLinks"]
                    .forEach(function (key) {
                        if (content[key] != null) window.BFBL_DATA[key] = content[key];
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

                // people = shared (unassigned) + every chapter doc's members.
                // A member's chapter is defined by WHICH chapter doc they live in, so we re-stamp
                // chapter = cd.id here. This neutralizes a chapter admin forging a member's `chapter`
                // field to make it show on a DIFFERENT chapter's public page (display spoofing).
                var sitePeople = Array.isArray(window.BFBL_DATA.people) ? window.BFBL_DATA.people.slice() : [];
                chapterDocs.forEach(function (cd) {
                    (cd.members || []).forEach(function (m) {
                        sitePeople.push(Object.assign({}, m, { chapter: cd.id }));
                    });
                });
                window.BFBL_DATA.people = sitePeople;
            }
        }).catch(function () { /* offline / blocked → keep data.js */ });
    }

    var timeout = new Promise(function (resolve) { setTimeout(resolve, TIMEOUT_MS); });
    // script.js awaits this before its first render. Resolves on load OR timeout — never hangs.
    window.BFBL_DATA_READY = Promise.race([fetchAll(), timeout]);
})();
