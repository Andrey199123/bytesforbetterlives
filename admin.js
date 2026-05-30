// admin.js — Firebase-backed content editor for Bytes for Better Lives.
// Loaded as a module by admin.html. Edits auto-save to Firestore (no Save button).

import { firebaseReady, auth, db, storage, ADMIN_EMAILS } from "./firebase.js";

const CDN = "https://www.gstatic.com/firebasejs/10.12.0";
const $ = (id) => document.getElementById(id);
// Each tab now lives on its own page (*-admin.html) sharing this script, so an element may be
// absent on the current page — bind listeners only when the element exists.
const on = (id, type, handler) => { const el = $(id); if (el) el.addEventListener(type, handler); };
const messageEl = $("admin-message");
const loginBox = $("login-box");
const panel = $("admin-panel");
const actions = $("admin-actions");

// Founders are hardcoded in script.js (never editable), so there is no "Founder" category here.
const DEFAULT_CATEGORIES = [
    { id: "leadership", label: "Leadership" },
    { id: "design", label: "Design" },
    { id: "volunteer", label: "Volunteer" }
];

function showMessage(text, isError) {
    messageEl.style.display = "block";
    messageEl.style.color = isError ? "#b00020" : "";
    messageEl.textContent = text;
}

if (!firebaseReady) {
    showMessage("Firebase isn't configured yet — paste your firebaseConfig into firebase.js, then reload.", true);
} else {
    const [{ onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut },
           { doc, getDoc, setDoc, getDocs, collection, deleteDoc },
           { ref, uploadBytes, getDownloadURL }] = await Promise.all([
        import(`${CDN}/firebase-auth.js`),
        import(`${CDN}/firebase-firestore.js`),
        import(`${CDN}/firebase-storage.js`)
    ]);

    const contentRef = doc(db, "site", "content");
    const chapterRef = function (cid) { return doc(db, "chapterContent", cid); };

    // Merged working state (render code is unchanged; only load + save are doc-aware).
    let people = [];          // merged: site.people (unassigned) + every chapterContent[*].members
    let galleryImages = [];
    let chapters = [];        // merged: site registry overlaid with chapterContent[*].page
    let categories = [];
    let titles = [];
    let chapterAdmins = {};   // email -> chapterId (approved chapter admins)
    let siteUnassigned = [];  // site.people (members with no chapter)
    let chapterDocs = {};     // cid -> { page:{}, members:[] } (the chapterContent docs)
    let chapterDocCids = [];  // chapter ids that have a chapterContent doc (for orphan cleanup)
    // Chapter-admin scope: when set, this admin may ONLY read/write chapterContent/<SCOPE_CID>.
    let SCOPE_CID = null;
    const IS_CHAPTER_ADMIN_PAGE = !!document.getElementById("chapter-admin-root");

    function isFullAdmin(email) {
        if (!email) return false;
        if (!ADMIN_EMAILS.length) return true; // rules still enforce server-side
        return ADMIN_EMAILS.indexOf(email) !== -1;
    }

    // ---- Auto-save (debounced; routed to the correct document) ----
    const saveTimers = {};
    function setStatus(text, isError) {
        const el = $("autosave-status");
        if (!el) return;
        el.textContent = text;
        el.style.color = isError ? "#b00020" : "var(--ink-soft)";
    }
    function scheduleSave(key, writeFn) {
        setStatus("Saving…");
        clearTimeout(saveTimers[key]);
        saveTimers[key] = setTimeout(async function () {
            try { await writeFn(); setStatus("All changes saved ✓"); }
            catch (err) { setStatus("Save failed: " + (err.message || err), true); }
        }, 600);
    }
    // Existing render code calls autosave("people"|"chapters"|<siteField>, value); route each.
    function autosave(field, value) {
        if (field === "people") return savePeople();
        if (field === "chapters") return saveChapters();
        // shared site fields (categories, titles, galleryImages, chapterAdmins, gallery, …)
        scheduleSave("site:" + field, function () {
            return setDoc(contentRef, { [field]: value, updatedAt: Date.now() }, { merge: true });
        });
    }

    // Partition merged `people` back into the per-chapter docs (+ site.people for unassigned) and save.
    function savePeople() {
        const byChapter = {};
        const unassigned = [];
        people.forEach(function (p) {
            if (p && p.chapter) (byChapter[p.chapter] = byChapter[p.chapter] || []).push(p);
            else unassigned.push(p);
        });
        if (SCOPE_CID) {
            // Chapter admin: may ONLY write their own chapter doc's members.
            ensureChapterDoc(SCOPE_CID).members = byChapter[SCOPE_CID] || [];
            return scheduleSave("chapter:" + SCOPE_CID + ":members", function () {
                return setDoc(chapterRef(SCOPE_CID), { members: chapterDocs[SCOPE_CID].members }, { merge: true });
            });
        }
        // Full admin: write unassigned to site, and each chapter's members to its doc.
        siteUnassigned = unassigned;
        scheduleSave("site:people", function () {
            return setDoc(contentRef, { people: siteUnassigned, updatedAt: Date.now() }, { merge: true });
        });
        const cids = {};
        Object.keys(byChapter).forEach(function (c) { cids[c] = true; });
        chapterDocCids.forEach(function (c) { cids[c] = true; });
        Object.keys(cids).forEach(function (cid) {
            ensureChapterDoc(cid).members = byChapter[cid] || [];
            scheduleSave("chapter:" + cid + ":members", function () {
                return setDoc(chapterRef(cid), { members: chapterDocs[cid].members }, { merge: true });
            });
        });
    }

    // Write each chapter's editable page to its doc + the registry to site; delete orphan chapter docs.
    function saveChapters() {
        if (SCOPE_CID) {
            const c = chapters.find(function (x) { return x && x.id === SCOPE_CID; });
            if (!c) return;
            ensureChapterDoc(SCOPE_CID).page = chapterPageFields(c);
            return scheduleSave("chapter:" + SCOPE_CID + ":page", function () {
                return setDoc(chapterRef(SCOPE_CID), { page: chapterDocs[SCOPE_CID].page }, { merge: true });
            });
        }
        const registry = chapters.map(function (c) { return { id: c.id, pageHref: c.pageHref || ("chapter-" + c.id + ".html") }; });
        scheduleSave("site:chapters", function () {
            return setDoc(contentRef, { chapters: registry, updatedAt: Date.now() }, { merge: true });
        });
        const liveIds = {};
        chapters.forEach(function (c) {
            liveIds[c.id] = true;
            ensureChapterDoc(c.id).page = chapterPageFields(c);
            scheduleSave("chapter:" + c.id + ":page", function () {
                return setDoc(chapterRef(c.id), { page: chapterDocs[c.id].page }, { merge: true });
            });
        });
        // Remove chapterContent docs for chapters that no longer exist.
        chapterDocCids.filter(function (cid) { return !liveIds[cid]; }).forEach(function (cid) {
            delete chapterDocs[cid];
            scheduleSave("chapter:" + cid + ":delete", function () { return deleteDoc(chapterRef(cid)); });
        });
        chapterDocCids = Object.keys(chapterDocs);
    }

    function ensureChapterDoc(cid) {
        if (!chapterDocs[cid]) { chapterDocs[cid] = { page: {}, members: [] }; chapterDocCids = Object.keys(chapterDocs); }
        return chapterDocs[cid];
    }
    function chapterPageFields(c) {
        const page = Object.assign({}, c);
        delete page.id; // id stays in the registry
        return page;
    }

    // ---- Upload helpers ----
    // Storage rules reject files >= 10 MB or non-image content types with a generic
    // "storage/unauthorized" error, so guard up front for a clear message and always send an
    // explicit image content type (some browsers leave file.type blank).
    const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
    function tooBig(file) {
        if (file.size >= MAX_UPLOAD_BYTES) {
            setStatus('Upload failed: "' + file.name + '" is ' + (file.size / 1048576).toFixed(1) + ' MB — the limit is 10 MB. Please compress or resize it first.', true);
            return true;
        }
        return false;
    }
    function uploadMeta(file) { return { contentType: file.type || "image/jpeg" }; }

    // Raster images only — must mirror the allowlist in storage.rules. SVG is intentionally excluded
    // because it can carry active script (stored-XSS risk if ever opened directly from Storage).
    const RASTER_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/avif"];
    function isRasterImage(file) {
        const t = (file && file.type || "").toLowerCase();
        if (!t) return /\.(png|jpe?g|gif|webp|avif)$/i.test((file && file.name) || ""); // some browsers leave type blank
        return RASTER_IMAGE_TYPES.indexOf(t) !== -1;
    }
    function notRasterImage(file) {
        if (!isRasterImage(file)) {
            setStatus('Upload failed: "' + (file && file.name) + '" must be a PNG, JPEG, GIF, WebP, or AVIF image (SVG and other formats are not allowed).', true);
            return true;
        }
        return false;
    }

    // ---- Auth ----
    function showSignedOut() {
        messageEl.style.display = "none";
        loginBox.style.display = "block";
        panel.style.display = "none";
        actions.style.display = "none";
    }
    // In-page tabs (chapter-admin.html: Page / Members). No-op where there's no tab bar.
    document.querySelectorAll("[data-admin-tab]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var target = btn.dataset.adminTab;
            document.querySelectorAll("[data-admin-tab]").forEach(function (b) { b.classList.toggle("active", b === btn); });
            document.querySelectorAll("[data-tab-panel]").forEach(function (p) { p.classList.toggle("active", p.dataset.tabPanel === target); });
        });
    });

    onAuthStateChanged(auth, async function (user) {
        if (!user) { showSignedOut(); return; }

        if (isFullAdmin(user.email)) {
            // Full ("executive") admin — edits everything.
            if (IS_CHAPTER_ADMIN_PAGE) {
                // Reached the scoped editor for one chapter — from a per-chapter page
                // (chapter-<id>-admin.html, which sets body[data-admin-chapter]) or via ?c=<id>.
                // Edit that one chapter; without a chapter hint, send them to the full admin home.
                var pick = new URLSearchParams(location.search).get("c")
                    || (document.body && document.body.dataset ? document.body.dataset.adminChapter : "");
                if (pick) { SCOPE_CID = pick; }
                else { location.replace("members-admin.html"); return; }
            }
            messageEl.style.display = "none";
            loginBox.style.display = "none";
            panel.style.display = "block";
            actions.style.display = "flex";
            $("admin-who").textContent = user.email + (SCOPE_CID ? " · editing " + SCOPE_CID : "");
            loadContent();
            return;
        }

        // Not a full admin → maybe an approved CHAPTER admin. Read the (public) map to find out.
        let cid = "";
        try {
            const snap = await getDoc(contentRef);
            const map = (snap.exists() && snap.data().chapterAdmins) || {};
            cid = map[user.email] || "";
        } catch (e) { /* fall through to no-access */ }

        if (cid) {
            SCOPE_CID = cid;
            // Send a chapter admin to their own per-chapter editor page.
            if (!IS_CHAPTER_ADMIN_PAGE) { location.replace("chapter-" + cid + "-admin.html"); return; }
            messageEl.style.display = "none";
            loginBox.style.display = "none";
            panel.style.display = "block";
            actions.style.display = "flex";
            $("admin-who").textContent = user.email + " · chapter admin";
            loadContent();
            return;
        }

        showMessage("Account " + user.email + " is not an admin.", true);
        loginBox.style.display = "block";
        panel.style.display = "none";
        actions.style.display = "none";
    });

    on("google-signin", "click", async function () {
        const errEl = $("login-error");
        if (errEl) errEl.style.display = "none";
        try {
            await signInWithPopup(auth, new GoogleAuthProvider());
        } catch (err) {
            if (errEl) { errEl.style.display = "block"; errEl.textContent = err.message || String(err); }
        }
    });
    on("sign-out", "click", function () { signOut(auth); });

    // Tabs are now per-page links (members-admin.html, gallery-admin.html, …); each page loads this
    // script and renders only the section it contains (every render*() guards for its own element).

    // ---- Load live content from Firestore (site/content + per-chapter docs, merged) ----
    async function loadContent() {
        let d = {};
        try {
            const snap = await getDoc(contentRef);
            d = snap.exists() ? snap.data() : {};
            chapterDocs = {};
            const cc = await getDocs(collection(db, "chapterContent"));
            cc.forEach(function (docSnap) {
                const data = docSnap.data() || {};
                chapterDocs[docSnap.id] = { page: data.page || {}, members: Array.isArray(data.members) ? data.members : [] };
            });
        } catch (err) {
            setStatus("Could not read Firestore: " + (err.message || err), true);
        }
        chapterDocCids = Object.keys(chapterDocs);

        galleryImages = Array.isArray(d.galleryImages) ? d.galleryImages : [];
        categories = (Array.isArray(d.categories) && d.categories.length) ? d.categories : DEFAULT_CATEGORIES.slice();
        titles = Array.isArray(d.titles) ? d.titles.slice() : [];
        chapterAdmins = (d.chapterAdmins && typeof d.chapterAdmins === "object") ? d.chapterAdmins : {};
        siteUnassigned = Array.isArray(d.people) ? d.people : [];

        // Merge chapters: registry overlaid with each chapter doc's page.
        const registry = Array.isArray(d.chapters) ? d.chapters : [];
        chapters = registry.map(function (c) {
            const cd = chapterDocs[c.id];
            return cd && cd.page ? Object.assign({}, c, cd.page) : Object.assign({}, c);
        });

        // Merge people: site unassigned + every chapter doc's members. A member's chapter is defined
        // by which doc they live in, so re-stamp chapter = cid (mirrors firebase-data.js; neutralizes
        // a forged `chapter` field and self-heals on the next save).
        people = siteUnassigned.slice();
        Object.keys(chapterDocs).forEach(function (cid) {
            (chapterDocs[cid].members || []).forEach(function (m) { people.push(Object.assign({}, m, { chapter: cid })); });
        });

        // Chapter-admin scope: keep only their chapter + its members in the working view.
        if (SCOPE_CID) {
            chapters = chapters.filter(function (c) { return c && c.id === SCOPE_CID; });
            people = people.filter(function (p) { return p && p.chapter === SCOPE_CID; });
        }

        if (window.BFBL_DATA) {
            window.BFBL_DATA.chapters = chapters;
            window.BFBL_DATA.categories = categories;
            window.BFBL_DATA.titles = titles;
        }

        migrateTitles();
        renderPeople();
        renderGallery();
        renderChaptersBoard();
        renderChapterPages();
        renderStructure();
        renderChapterAdmins();
        renderScopedHeader();
    }

    function renderScopedHeader() {
        const el = $("chapter-admin-title");
        if (!el) return;
        const c = chapters[0];
        el.textContent = c ? ("Editing: " + (c.name || SCOPE_CID)) : "Chapter";
    }

    // Full-admin only: manage the approved chapter-admin list (email -> chapterId).
    function renderChapterAdmins() {
        const root = $("structure-chapter-admins");
        if (!root) return;
        const sel = $("new-chapter-admin-chapter");
        if (sel) sel.innerHTML = chapters.map(function (c) {
            return '<option value="' + escapeAttr(c.id) + '">' + escapeHtml(c.name || c.id) + '</option>';
        }).join("");
        const emails = Object.keys(chapterAdmins);
        root.innerHTML = emails.length ? emails.map(function (email) {
            const cid = chapterAdmins[email];
            const ch = chapters.find(function (c) { return c && c.id === cid; });
            return '<div style="display:flex; align-items:center; gap:0.5rem; padding:0.4rem 0.6rem; border:1px solid var(--line); border-radius:8px;">'
                + '<span style="flex:1; overflow-wrap:anywhere; font-weight:700;">' + escapeHtml(email) + ' → ' + escapeHtml(ch ? (ch.name || cid) : cid) + '</span>'
                + '<button class="btn btn-secondary" type="button" data-ca-remove="' + escapeAttr(email) + '" style="padding:0.15rem 0.55rem;">Remove</button></div>';
        }).join("") : '<p style="color:var(--ink-soft); margin:0;">No chapter admins yet.</p>';
        root.querySelectorAll("[data-ca-remove]").forEach(function (b) {
            b.addEventListener("click", function () {
                delete chapterAdmins[b.dataset.caRemove];
                renderChapterAdmins();
                autosave("chapterAdmins", chapterAdmins);
            });
        });
    }

    on("add-chapter-admin", "click", function () {
        const emailInput = $("new-chapter-admin-email");
        const chapterSel = $("new-chapter-admin-chapter");
        const email = ((emailInput && emailInput.value) || "").trim().toLowerCase();
        const cid = (chapterSel && chapterSel.value) || "";
        if (!email || !cid) return;
        chapterAdmins[email] = cid;
        if (emailInput) emailInput.value = "";
        renderChapterAdmins();
        autosave("chapterAdmins", chapterAdmins);
    });

    // Converting the member "Title" into a dropdown must not drop anyone's existing written title:
    // fold every distinct free-text title currently on a member into the `titles` options list.
    function migrateTitles() {
        let changed = false;
        people.forEach(function (p) {
            const t = (p && p.title ? String(p.title) : "").trim();
            if (t && titles.indexOf(t) === -1) { titles.push(t); changed = true; }
        });
        if (window.BFBL_DATA) window.BFBL_DATA.titles = titles;
        if (changed && !SCOPE_CID) autosave("titles", titles); // chapter admins can't edit the shared list
    }

    // ---- Members ----
    function renderPeople() {
        const editor = $("people-editor");
        if (!editor) return;
        const countEl = $("people-count");
        if (countEl) countEl.textContent = people.length;
        editor.innerHTML = "";
        people.forEach(function (person, index) {
            const card = document.createElement("div");
            card.className = "admin-card";
            card.innerHTML = `
                <div style="display:flex; gap:0.6rem; align-items:center;">
                    ${avatarHTML(person, 48)}
                    <strong style="flex:1; overflow-wrap:anywhere;">${escapeHtml(person.name || "(new member)")}</strong>
                    <button class="btn btn-secondary" type="button" data-remove="${index}" style="padding:0.2rem 0.6rem;">Remove</button>
                </div>
                <label>Name <input data-field="name" data-i="${index}" value="${escapeAttr(person.name || "")}"></label>
                <label>Title <select data-field="title" data-i="${index}">${titleOptions(person.title)}</select></label>
                <label>Category <select data-field="roles" data-i="${index}">${categoryOptions((person.roles || [])[0])}</select></label>
                ${SCOPE_CID ? "" : `<label>Chapter <select data-field="chapter" data-i="${index}">${chapterOptions(person.chapter)}</select></label>`}
                ${SCOPE_CID ? "" : `<label style="display:flex; flex-direction:row; align-items:center; gap:0.45rem; color:var(--ink);">
                    <input type="checkbox" data-execcheck="${index}" ${person.execBoard ? "checked" : ""} style="width:auto; margin:0;"> Board of Directors
                </label>`}
                ${(!SCOPE_CID && person.execBoard) ? `<label>Board of Directors title <input data-field="execTitle" data-i="${index}" value="${escapeAttr(person.execTitle || "")}"></label>` : ""}
                ${(!SCOPE_CID && person.execBoard) ? `<label>Board of Directors bio <textarea data-field="execBio" data-i="${index}" rows="2">${escapeHtml(person.execBio || "")}</textarea></label>` : ""}
                <label>Bio <textarea data-field="bio" data-i="${index}" rows="2">${escapeHtml(person.bio || "")}</textarea></label>
                <label>Photo path <input data-field="photo" data-i="${index}" value="${escapeAttr(person.photo || "")}"></label>
                <div class="upload-dropzone upload-dropzone-sm" data-photozone="${index}">
                    <span>Drop or click to upload photo</span>
                    <input type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/avif" data-upload="${index}" style="display:none;">
                </div>
            `;
            editor.appendChild(card);
        });

        editor.querySelectorAll("[data-field]").forEach(function (input) {
            input.addEventListener("input", function () {
                const i = Number(input.dataset.i);
                const field = input.dataset.field;
                if (field === "roles") {
                    people[i].roles = input.value.split(",").map((s) => s.trim()).filter(Boolean);
                } else {
                    people[i][field] = input.value;
                }
                autosave("people", people);
            });
        });
        editor.querySelectorAll("[data-remove]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                people.splice(Number(btn.dataset.remove), 1);
                renderPeople();
                autosave("people", people);
            });
        });
        // Board of Directors checkbox — toggling it (here or on the Chapters board) flips the same
        // person.execBoard flag; checking it reveals the separate "Board of Directors title" field.
        editor.querySelectorAll("[data-execcheck]").forEach(function (cb) {
            cb.addEventListener("change", function () {
                const i = Number(cb.dataset.execcheck);
                if (!people[i]) return;
                if (cb.checked) people[i].execBoard = true;
                else delete people[i].execBoard; // keep execTitle so re-checking restores it
                renderPeople();
                renderChaptersBoard();
                autosave("people", people);
            });
        });
        editor.querySelectorAll("[data-upload]").forEach(function (input) {
            input.addEventListener("change", function () {
                uploadMemberPhoto(Number(input.dataset.upload), input.files && input.files[0]);
                input.value = "";
            });
        });
        // Clickable + drag-and-drop photo dropzone per member.
        editor.querySelectorAll("[data-photozone]").forEach(function (zone) {
            const input = zone.querySelector("input[type=file]");
            zone.addEventListener("click", function (e) {
                if (e.target.tagName === "INPUT") return;
                if (input) input.click();
            });
            zone.addEventListener("dragover", function (e) { e.preventDefault(); zone.classList.add("dragover"); });
            zone.addEventListener("dragleave", function () { zone.classList.remove("dragover"); });
            zone.addEventListener("drop", function (e) {
                e.preventDefault();
                zone.classList.remove("dragover");
                const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
                uploadMemberPhoto(Number(zone.dataset.photozone), f);
            });
        });
    }

    async function uploadMemberPhoto(i, file) {
        if (!people[i] || !file) return;
        if (tooBig(file)) return;
        if (notRasterImage(file)) return;
        setStatus("Uploading photo…");
        try {
            const safe = (people[i].name || "member").toLowerCase().replace(/[^a-z0-9]+/g, "-");
            const storageRef = ref(storage, "people/" + safe + "-" + Date.now() + "-" + file.name);
            await uploadBytes(storageRef, file, uploadMeta(file));
            people[i].photo = await getDownloadURL(storageRef);
            renderPeople();
            autosave("people", people);
        } catch (err) {
            setStatus("Upload failed: " + (err.message || err), true);
        }
    }

    on("add-person", "click", function () {
        const m = { name: "", title: "", photo: "", fallbackPhoto: "images/logo.avif", detail: "", bio: "", roles: ["volunteer"] };
        if (SCOPE_CID) m.chapter = SCOPE_CID; // chapter admins add members into their own chapter
        people.push(m);
        renderPeople();
        autosave("people", people);
    });

    // ---- Gallery photos ----
    function renderGallery() {
        const editor = $("gallery-editor");
        if (!editor) return;
        const countEl = $("gallery-count");
        if (countEl) countEl.textContent = galleryImages.length;
        editor.innerHTML = "";
        galleryImages.forEach(function (im, index) {
            const src = typeof im === "string" ? im : (im && im.src) || "";
            const cell = document.createElement("div");
            cell.style.cssText = "position:relative; border:1px solid var(--line); border-radius:var(--radius-md); overflow:hidden;";
            cell.innerHTML = `
                <img src="${escapeAttr(src)}" data-zoom="${escapeAttr(src)}" alt="" style="width:100%; aspect-ratio:1/1; object-fit:cover; display:block; background:var(--surface); cursor:zoom-in;" onerror="this.src='images/logo.avif'">
                <button class="btn btn-secondary" type="button" data-gremove="${index}" style="position:absolute; top:4px; right:4px; padding:0.1rem 0.5rem; font-size:0.85rem;">✕</button>
            `;
            editor.appendChild(cell);
        });
        editor.querySelectorAll("[data-gremove]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                galleryImages.splice(Number(btn.dataset.gremove), 1);
                renderGallery();
                autosave("galleryImages", galleryImages);
            });
        });
        editor.querySelectorAll("[data-zoom]").forEach(function (img) {
            img.addEventListener("click", function () { openAdminLightbox(img.getAttribute("data-zoom")); });
        });
    }

    // Bulk gallery upload (shared by the "+ Upload photos" button and the drag-and-drop zone).
    // Many photos at once; oversized files are skipped individually (the rest still upload), with
    // a live "Uploading i of N…" counter.
    async function uploadGalleryFiles(fileList) {
        const all = Array.from(fileList || []).filter(function (f) { return f && isRasterImage(f); });
        if (!all.length) return;

        const ok = all.filter(function (f) { return f.size < MAX_UPLOAD_BYTES; });
        const skipped = all.length - ok.length;
        if (!ok.length) {
            setStatus("All " + all.length + " file(s) exceed the 10 MB limit — nothing uploaded.", true);
            return;
        }

        let done = 0, failed = 0;
        for (let i = 0; i < ok.length; i++) {
            const file = ok[i];
            setStatus("Uploading " + (i + 1) + " of " + ok.length + "…");
            try {
                const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
                const storageRef = ref(storage, "gallery/" + Date.now() + "-" + i + "-" + safe);
                await uploadBytes(storageRef, file, uploadMeta(file));
                galleryImages.push({ src: await getDownloadURL(storageRef), alt: file.name.replace(/\.[^.]+$/, "") });
                done++;
                renderGallery();                       // show thumbnails as they land
                autosave("galleryImages", galleryImages); // debounced — persists once at the end
            } catch (err) {
                failed++;
            }
        }

        let msg = "Uploaded " + done + " photo(s)";
        if (skipped) msg += " · skipped " + skipped + " over 10 MB";
        if (failed) msg += " · " + failed + " failed";
        setStatus(msg + (failed ? "" : " ✓"), failed > 0);
    }

    on("gallery-upload", "change", async function () {
        await uploadGalleryFiles(this.files);
        this.value = "";
    });

    // Click-to-choose + drag-and-drop on the gallery dropzone.
    const galleryDropzone = $("gallery-dropzone");
    if (galleryDropzone) {
        galleryDropzone.addEventListener("click", function (e) {
            if (e.target.tagName === "INPUT") return; // avoid recursive click from the hidden input
            const inp = $("gallery-upload");
            if (inp) inp.click();
        });
        ["dragenter", "dragover"].forEach(function (ev) {
            galleryDropzone.addEventListener(ev, function (e) {
                e.preventDefault(); e.stopPropagation();
                galleryDropzone.classList.add("dragover");
            });
        });
        ["dragleave", "dragend"].forEach(function (ev) {
            galleryDropzone.addEventListener(ev, function (e) {
                e.preventDefault(); e.stopPropagation();
                galleryDropzone.classList.remove("dragover");
            });
        });
        galleryDropzone.addEventListener("drop", async function (e) {
            e.preventDefault(); e.stopPropagation();
            galleryDropzone.classList.remove("dragover");
            await uploadGalleryFiles(e.dataTransfer && e.dataTransfer.files);
        });
    }

    // ---- Chapters board (drag & drop) ----
    // Unassigned column: members with no chapter (any category).
    function unassignedZoneMarkup() {
        const chips = [];
        people.forEach(function (p, i) {
            if (!(p.chapter || "")) chips.push(memberChip(p, i));
        });
        return '<div class="tier-zone" data-chapter="">' + chips.join("") + '</div>';
    }

    // A chapter's sub-zones are the member CATEGORIES from the Structure tab. Dropping a member
    // into chapter X's "<Category>" zone sets person.chapter = X and person.roles = [categoryId],
    // which is exactly how the public chapter page groups members (by category).
    function chapterCategoryZoneMarkup(chapterId, catId, catLabel) {
        const chips = [];
        people.forEach(function (p, i) {
            if ((p.chapter || "") !== chapterId) return;
            const pcat = (Array.isArray(p.roles) && p.roles[0]) ? p.roles[0] : "";
            if (pcat === catId) chips.push(memberChip(p, i));
        });
        return '<div class="tier-zone" data-chapter="' + escapeAttr(chapterId) + '" data-cat="' + escapeAttr(catId) + '">'
            + '<div class="tier-label">' + escapeHtml(catLabel) + '</div>'
            + chips.join("") + '</div>';
    }

    // Board of Directors is a separate, NON-exclusive assignment (person.execBoard): a member can be
    // on the board AND still belong to a chapter, so dropping here never touches their chapter/tier.
    function execZoneMarkup() {
        const chips = [];
        people.forEach(function (p, i) {
            if (p && p.execBoard) chips.push(execMemberChip(p, i));
        });
        return '<div class="tier-zone" data-execboard="1">'
            + '<div class="tier-label">Board members</div>'
            + chips.join("") + '</div>';
    }

    function renderChaptersBoard() {
        const board = $("chapters-board");
        if (!board) return;
        const cats = (Array.isArray(categories) && categories.length) ? categories : [];
        let html = '<div class="chapter-col"><h4>Unassigned</h4>' + unassignedZoneMarkup() + '</div>';
        html += '<div class="chapter-col"><h4>Board of Directors</h4>' + execZoneMarkup() + '</div>';
        chapters.forEach(function (c) {
            const zones = cats.map(function (cat) { return chapterCategoryZoneMarkup(c.id, cat.id, cat.label || cat.id); }).join("");
            html += '<div class="chapter-col"><h4>' + escapeHtml(c.name) + '</h4>' + zones + '</div>';
        });
        board.innerHTML = html;

        board.querySelectorAll(".member-chip").forEach(function (chip) {
            chip.addEventListener("dragstart", function (e) {
                e.dataTransfer.setData("text/plain", chip.dataset.idx);
                e.dataTransfer.effectAllowed = "move";
                chip.classList.add("dragging");
            });
            chip.addEventListener("dragend", function () { chip.classList.remove("dragging"); });
        });
        // Editing a chip's role control must not start a drag — disable drag while it's focused.
        function bindNoDrag(ctrl) {
            ctrl.addEventListener("mousedown", function (e) { e.stopPropagation(); });
            ctrl.addEventListener("focus", function () { const c = ctrl.closest(".member-chip"); if (c) c.draggable = false; });
            ctrl.addEventListener("blur", function () { const c = ctrl.closest(".member-chip"); if (c) c.draggable = true; });
        }
        // Title dropdown on each chip → sets the member's title (chip stays in its category zone).
        board.querySelectorAll(".chip-role").forEach(function (sel) {
            bindNoDrag(sel);
            sel.addEventListener("change", function () {
                const i = Number(sel.dataset.roleIdx);
                if (!people[i]) return;
                people[i].title = sel.value;
                autosave("people", people);
            });
        });
        // Typed board-title field on Board of Directors chips → person.execTitle, saved.
        board.querySelectorAll(".chip-exectitle").forEach(function (inp) {
            bindNoDrag(inp);
            inp.addEventListener("input", function () {
                const i = Number(inp.dataset.exectitleIdx);
                if (!people[i]) return;
                people[i].execTitle = inp.value;
                autosave("people", people);
            });
        });
        board.querySelectorAll("[data-exec-remove]").forEach(function (btn) {
            btn.addEventListener("click", function (e) {
                e.stopPropagation();
                const idx = Number(btn.dataset.execRemove);
                if (!people[idx]) return;
                delete people[idx].execBoard;
                renderChaptersBoard();
                autosave("people", people);
            });
        });
        board.querySelectorAll(".tier-zone").forEach(function (zone) {
            zone.addEventListener("dragover", function (e) { e.preventDefault(); zone.classList.add("dragover"); });
            zone.addEventListener("dragleave", function () { zone.classList.remove("dragover"); });
            zone.addEventListener("drop", function (e) {
                e.preventDefault();
                zone.classList.remove("dragover");
                const idx = Number(e.dataTransfer.getData("text/plain"));
                if (Number.isNaN(idx) || !people[idx]) return;
                if (zone.dataset.execboard) {
                    people[idx].execBoard = true; // non-exclusive — leave chapter/category untouched
                } else {
                    people[idx].chapter = zone.dataset.chapter || "";
                    // Dropping into a chapter's category zone sets the member's category (role).
                    if (zone.dataset.cat) people[idx].roles = [zone.dataset.cat];
                    delete people[idx].tier; // legacy tier field retired
                }
                renderChaptersBoard();
                renderPeople(); // category may have changed → refresh the Members editor
                autosave("people", people);
            });
        });
    }

    // ---- Chapter pages (details + highlight photos) ----
    function renderChapterPages() {
        const editor = $("chapter-pages-editor");
        if (!editor) return;
        editor.innerHTML = "";
        if (!chapters.length) {
            editor.innerHTML = '<p style="color:var(--ink-soft);">No chapters yet. Add one in the Structure tab.</p>';
            return;
        }
        chapters.forEach(function (c, index) {
            if (!Array.isArray(c.photos)) c.photos = [];
            const photosHtml = c.photos.map(function (src, pi) {
                return '<div style="position:relative; border:1px solid var(--line); border-radius:8px; overflow:hidden;">'
                    + '<img src="' + escapeAttr(src) + '" alt="" style="width:100%; aspect-ratio:1/1; object-fit:cover; display:block; background:var(--surface);" onerror="this.src=\'images/logo.avif\'">'
                    + '<button class="btn btn-secondary" type="button" data-cphoto-remove="' + index + '" data-cphoto-i="' + pi + '" style="position:absolute; top:4px; right:4px; padding:0.1rem 0.5rem; font-size:0.85rem;">✕</button>'
                    + '</div>';
            }).join("");
            const card = document.createElement("div");
            card.className = "admin-card";
            card.innerHTML = `
                <strong style="font-size:1.05rem;">${escapeHtml(c.name || c.id)}</strong>
                <label>Name <input data-cfield="name" data-i="${index}" value="${escapeAttr(c.name || "")}"></label>
                <label>Location <input data-cfield="location" data-i="${index}" value="${escapeAttr(c.location || "")}"></label>
                <label>Status <input data-cfield="status" data-i="${index}" value="${escapeAttr(c.status || "")}"></label>
                <label>Status tag <input data-cfield="statusTag" data-i="${index}" value="${escapeAttr(c.statusTag || "")}"></label>
                <label>Instagram URL <input data-cfield="instagram" data-i="${index}" value="${escapeAttr(c.instagram || "")}"></label>
                <label>Description <textarea data-cfield="description" data-i="${index}" rows="3">${escapeHtml(c.description || "")}</textarea></label>
                <label>Chapter email <input data-cfield="contactEmail" data-i="${index}" value="${escapeAttr(c.contactEmail || "")}" placeholder="chapter@example.com"></label>
                <label>Get Involved / volunteer link (URL) <input data-cfield="joinUrl" data-i="${index}" value="${escapeAttr(c.joinUrl || "")}" placeholder="https://forms.gle/…"></label>
                <label>Impact stats — one per line as <code>value | label</code> (e.g. <code>320 | Seniors helped</code>) <textarea data-clist="stats" data-i="${index}" rows="4" placeholder="320 | Seniors helped&#10;4 | Schools served&#10;$1,200 | Raised">${escapeHtml((c.stats || []).map(function (s) { return (s && s.value || "") + " | " + (s && s.label || ""); }).join("\n"))}</textarea></label>
                <label>Community partners — one per line <textarea data-clist="partners" data-i="${index}" rows="3" placeholder="Palomino Gardens&#10;Joe DiMaggio Children's Hospital">${escapeHtml((c.partners || []).join("\n"))}</textarea></label>
                <div style="font-weight:700; font-size:0.8rem; color:var(--ink-soft); margin-top:0.4rem;">Chapter highlights (${c.photos.length})</div>
                <div class="gallery-grid-admin">${photosHtml}</div>
                <label class="btn btn-secondary" style="cursor:pointer; justify-self:start;">+ Add highlight photos<input type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/avif" multiple data-cphoto-upload="${index}" style="display:none;"></label>
            `;
            editor.appendChild(card);
        });

        editor.querySelectorAll("[data-cfield]").forEach(function (input) {
            input.addEventListener("input", function () {
                const i = Number(input.dataset.i);
                chapters[i][input.dataset.cfield] = input.value;
                if (window.BFBL_DATA) window.BFBL_DATA.chapters = chapters;
                autosave("chapters", chapters);
            });
        });
        // List fields (stats / partners) — parsed from one-per-line textareas into arrays.
        editor.querySelectorAll("[data-clist]").forEach(function (input) {
            input.addEventListener("input", function () {
                const i = Number(input.dataset.i);
                const kind = input.dataset.clist;
                const lines = input.value.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
                if (kind === "stats") {
                    chapters[i].stats = lines.map(function (l) {
                        const parts = l.split("|");
                        return { value: (parts[0] || "").trim(), label: parts.slice(1).join("|").trim() };
                    });
                } else if (kind === "partners") {
                    chapters[i].partners = lines;
                }
                if (window.BFBL_DATA) window.BFBL_DATA.chapters = chapters;
                autosave("chapters", chapters);
            });
        });
        editor.querySelectorAll("[data-cphoto-remove]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                const ci = Number(btn.dataset.cphotoRemove);
                const pi = Number(btn.dataset.cphotoI);
                if (chapters[ci] && Array.isArray(chapters[ci].photos)) {
                    chapters[ci].photos.splice(pi, 1);
                    renderChapterPages();
                    autosave("chapters", chapters);
                }
            });
        });
        editor.querySelectorAll("[data-cphoto-upload]").forEach(function (input) {
            input.addEventListener("change", async function () {
                const ci = Number(input.dataset.cphotoUpload);
                const files = Array.from(input.files || []);
                if (!files.length || !chapters[ci]) return;
                if (files.some(tooBig)) { input.value = ""; return; }
                if (files.some(notRasterImage)) { input.value = ""; return; }
                setStatus("Uploading " + files.length + " photo(s)…");
                try {
                    if (!Array.isArray(chapters[ci].photos)) chapters[ci].photos = [];
                    for (const file of files) {
                        const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
                        const storageRef = ref(storage, "chapters/" + (chapters[ci].id || "chapter") + "/" + Date.now() + "-" + safe);
                        await uploadBytes(storageRef, file, uploadMeta(file));
                        chapters[ci].photos.push(await getDownloadURL(storageRef));
                    }
                    input.value = "";
                    if (window.BFBL_DATA) window.BFBL_DATA.chapters = chapters;
                    renderChapterPages();
                    autosave("chapters", chapters);
                } catch (err) {
                    setStatus("Upload failed: " + (err.message || err), true);
                }
            });
        });
    }

    // ---- Structure (categories + chapters) ----
    function structRow(value, renameAttr, removeAttr, index) {
        return '<div style="display:flex; align-items:center; gap:0.5rem; padding:0.4rem 0.6rem; border:1px solid var(--line); border-radius:8px;">'
            + '<input ' + renameAttr + '="' + index + '" value="' + escapeAttr(value) + '" style="flex:1; font-weight:700; padding:0.3rem 0.45rem; border:1px solid var(--line); border-radius:6px; font:inherit;">'
            + '<button class="btn btn-secondary" type="button" ' + removeAttr + '="' + index + '" style="padding:0.15rem 0.55rem;">Remove</button></div>';
    }
    function renderStructure() {
        const catRoot = $("structure-categories");
        const chRoot = $("structure-chapters");
        const tRoot = $("structure-titles");
        if (!catRoot || !chRoot) return;
        catRoot.innerHTML = categories.map(function (c, i) { return structRow(c.label || c.id, "data-cat-rename", "data-cat-remove", i); }).join("");
        chRoot.innerHTML = chapters.map(function (c, i) { return structRow(c.name || c.id, "data-ch-rename", "data-ch-remove", i); }).join("");
        if (tRoot) tRoot.innerHTML = titles.map(function (t, i) { return structRow(t, "data-title-rename", "data-title-remove", i); }).join("");
        catRoot.querySelectorAll("[data-cat-rename]").forEach(function (input) {
            input.addEventListener("input", function () {
                const i = Number(input.dataset.catRename);
                if (!categories[i]) return;
                categories[i].label = input.value;
                if (window.BFBL_DATA) window.BFBL_DATA.categories = categories;
                autosave("categories", categories);
            });
        });
        chRoot.querySelectorAll("[data-ch-rename]").forEach(function (input) {
            input.addEventListener("input", function () {
                const i = Number(input.dataset.chRename);
                if (!chapters[i]) return;
                chapters[i].name = input.value;
                if (window.BFBL_DATA) window.BFBL_DATA.chapters = chapters;
                autosave("chapters", chapters);
            });
        });
        catRoot.querySelectorAll("[data-cat-remove]").forEach(function (b) {
            b.addEventListener("click", function () {
                categories.splice(Number(b.dataset.catRemove), 1);
                if (window.BFBL_DATA) window.BFBL_DATA.categories = categories;
                renderStructure(); renderPeople();
                autosave("categories", categories);
            });
        });
        chRoot.querySelectorAll("[data-ch-remove]").forEach(function (b) {
            b.addEventListener("click", function () {
                chapters.splice(Number(b.dataset.chRemove), 1);
                if (window.BFBL_DATA) window.BFBL_DATA.chapters = chapters;
                renderStructure(); renderChaptersBoard(); renderChapterPages(); renderPeople();
                autosave("chapters", chapters);
            });
        });
        if (tRoot) {
            // Title strings are stored directly on each member, so renaming a title propagates to
            // every member who had the old value (keeps their selection intact). Fire on `change`
            // so we can read the old value before replacing it.
            tRoot.querySelectorAll("[data-title-rename]").forEach(function (input) {
                input.addEventListener("change", function () {
                    const i = Number(input.dataset.titleRename);
                    const oldVal = titles[i];
                    const newVal = input.value.trim();
                    if (!newVal || newVal === oldVal) { renderStructure(); return; }
                    titles[i] = newVal;
                    let peopleChanged = false;
                    people.forEach(function (p) { if (p && p.title === oldVal) { p.title = newVal; peopleChanged = true; } });
                    if (window.BFBL_DATA) window.BFBL_DATA.titles = titles;
                    autosave("titles", titles);
                    if (peopleChanged) autosave("people", people);
                    renderStructure(); renderPeople();
                });
            });
            tRoot.querySelectorAll("[data-title-remove]").forEach(function (b) {
                b.addEventListener("click", function () {
                    // Removing a title only takes it out of the options; members who still have it
                    // keep their value (titleOptions re-adds it as a one-off selected option).
                    titles.splice(Number(b.dataset.titleRemove), 1);
                    if (window.BFBL_DATA) window.BFBL_DATA.titles = titles;
                    renderStructure(); renderPeople();
                    autosave("titles", titles);
                });
            });
        }
    }

    on("add-category", "click", function () {
        const input = $("new-category");
        const label = (input.value || "").trim();
        if (!label) return;
        const id = slug(label);
        if (id && !categories.some(function (c) { return c.id === id; })) categories.push({ id: id, label: label });
        input.value = "";
        if (window.BFBL_DATA) window.BFBL_DATA.categories = categories;
        renderStructure(); renderPeople();
        autosave("categories", categories);
    });

    on("add-chapter", "click", function () {
        const input = $("new-chapter");
        const name = (input.value || "").trim();
        if (!name) return;
        const id = slug(name);
        if (id && !chapters.some(function (c) { return c.id === id; })) {
            chapters.push({ id: id, name: name, status: "Launching", description: "", leadPeople: [], photos: [] });
        }
        input.value = "";
        if (window.BFBL_DATA) window.BFBL_DATA.chapters = chapters;
        renderStructure(); renderChaptersBoard(); renderChapterPages(); renderPeople();
        autosave("chapters", chapters);
    });

    on("add-title", "click", function () {
        const input = $("new-title");
        const t = (input.value || "").trim();
        if (!t) return;
        if (titles.indexOf(t) === -1) titles.push(t);
        input.value = "";
        if (window.BFBL_DATA) window.BFBL_DATA.titles = titles;
        renderStructure(); renderPeople();
        autosave("titles", titles);
    });
}

// Minimal image popup for the admin gallery (admin pages don't load script.js's lightbox).
let adminLightbox = null;
function openAdminLightbox(src) {
    if (!adminLightbox) {
        adminLightbox = document.createElement("div");
        adminLightbox.style.cssText = "position:fixed; inset:0; background:rgba(0,0,0,0.85); display:none; align-items:center; justify-content:center; z-index:9999; cursor:zoom-out;";
        adminLightbox.innerHTML = '<img alt="" style="max-width:92vw; max-height:92vh; border-radius:8px; box-shadow:0 10px 40px rgba(0,0,0,.5);">';
        adminLightbox.addEventListener("click", function () { adminLightbox.style.display = "none"; });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && adminLightbox) adminLightbox.style.display = "none";
        });
        document.body.appendChild(adminLightbox);
    }
    adminLightbox.querySelector("img").src = src;
    adminLightbox.style.display = "flex";
}

function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>]/g, function (c) {
        return c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;";
    });
}
function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, "&quot;");
}
// A real photo, or initials on the brand color when a member has no picture (the universal placeholder).
function hasRealPhoto(photo) {
    return !!photo && !/logo\.avif(\?|#|$)/i.test(photo);
}
function personInitials(name) {
    var parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
function avatarHTML(person, size) {
    var s = size + "px";
    if (hasRealPhoto(person.photo)) {
        return '<img src="' + escapeAttr(person.photo) + '" alt="" style="width:' + s + ';height:' + s + ';border-radius:50%;object-fit:cover;background:var(--surface);flex:0 0 auto;">';
    }
    return '<span class="avatar-initials" style="width:' + s + ';height:' + s + ';font-size:' + Math.round(size * 0.4) + 'px;flex:0 0 auto;">' + escapeHtml(personInitials(person.name)) + '</span>';
}
// Member chip: avatar + name on top, with the member's role under it as an editable TITLE
// dropdown (from the Structure titles list; changing it sets person.title and saves to the DB).
function memberChip(person, index) {
    return '<div class="member-chip" draggable="true" data-idx="' + index + '">'
        + '<div class="chip-top">' + avatarHTML(person, 24)
        + '<span style="flex:1; overflow-wrap:anywhere;">' + escapeHtml(person.name || "(unnamed)") + '</span></div>'
        + '<select class="chip-role" data-role-idx="' + index + '">' + titleOptions(person.title) + '</select>'
        + '</div>';
}
// Board of Directors chip: ✕ to remove from the board (non-exclusive), plus a TYPED role field for
// their board title (person.execTitle) instead of a category dropdown.
function execMemberChip(person, index) {
    return '<div class="member-chip" draggable="true" data-idx="' + index + '">'
        + '<div class="chip-top">' + avatarHTML(person, 24)
        + '<span style="flex:1; overflow-wrap:anywhere;">' + escapeHtml(person.name || "(unnamed)") + '</span>'
        + '<button type="button" data-exec-remove="' + index + '" title="Remove from board" style="border:none; background:none; cursor:pointer; font-weight:800; color:var(--ink-soft); padding:0 0.2rem; line-height:1;">✕</button></div>'
        + '<input class="chip-exectitle" data-exectitle-idx="' + index + '" value="' + escapeAttr(person.execTitle || "") + '" placeholder="Board title">'
        + '</div>';
}
function slug(s) {
    return String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function categoryOptions(selected) {
    var cats = (window.BFBL_DATA && window.BFBL_DATA.categories && window.BFBL_DATA.categories.length) ? window.BFBL_DATA.categories : DEFAULT_CATEGORIES;
    var sel = selected || (cats[0] && cats[0].id);
    return cats.map(function (c) {
        return '<option value="' + escapeAttr(c.id) + '"' + (c.id === sel ? " selected" : "") + ">" + escapeHtml(c.label || c.id) + "</option>";
    }).join("");
}
function chapterOptions(selected) {
    var chapters = (window.BFBL_DATA && window.BFBL_DATA.chapters) || [];
    var opts = '<option value="">— none —</option>';
    chapters.forEach(function (c) {
        var sel = (c.id === selected) ? " selected" : "";
        opts += '<option value="' + escapeAttr(c.id) + '"' + sel + '>' + escapeHtml(c.name) + '</option>';
    });
    return opts;
}
function titleOptions(selected) {
    var list = (window.BFBL_DATA && Array.isArray(window.BFBL_DATA.titles)) ? window.BFBL_DATA.titles : [];
    var sel = selected ? String(selected) : "";
    var opts = '<option value="">— no title —</option>';
    // Preserve a member's title even if it isn't in the list yet (e.g. removed from options).
    if (sel && list.indexOf(sel) === -1) {
        opts += '<option value="' + escapeAttr(sel) + '" selected>' + escapeHtml(sel) + '</option>';
    }
    list.forEach(function (t) {
        opts += '<option value="' + escapeAttr(t) + '"' + (t === sel ? " selected" : "") + ">" + escapeHtml(t) + "</option>";
    });
    return opts;
}
