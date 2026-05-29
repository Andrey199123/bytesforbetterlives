// firebase-data.js — public read layer for the live site.
//
// Reads the live content document (site/content) from Firestore via its public REST API —
// no SDK or login needed, because the security rules allow public reads. It merges the result
// into window.BFBL_DATA so script.js renders with it, and falls back to the local data.js if
// Firestore is empty or unreachable. Loaded BEFORE script.js on each page.

(function () {
    var PROJECT = "project-686d62b7-14f5-43c7-acc";
    var URL = "https://firestore.googleapis.com/v1/projects/" + PROJECT + "/databases/(default)/documents/site/content";
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

    function fetchContent() {
        return fetch(URL)
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (json) {
                if (!json || !json.fields) return; // not seeded / denied → keep data.js
                var content = decodeFields(json.fields);
                window.BFBL_DATA = window.BFBL_DATA || {};
                ["people", "chapters", "gallery", "galleryImages", "fundraisers", "contactEmail", "donateUrl", "socialLinks"]
                    .forEach(function (key) {
                        if (content[key] != null) window.BFBL_DATA[key] = content[key];
                    });
            })
            .catch(function () { /* offline / blocked → keep data.js */ });
    }

    var timeout = new Promise(function (resolve) { setTimeout(resolve, TIMEOUT_MS); });
    // script.js awaits this before its first render. Resolves on load OR timeout — never hangs.
    window.BFBL_DATA_READY = Promise.race([fetchContent(), timeout]);
})();
