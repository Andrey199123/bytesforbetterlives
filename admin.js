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
           { doc, getDoc, setDoc },
           { ref, uploadBytes, getDownloadURL }] = await Promise.all([
        import(`${CDN}/firebase-auth.js`),
        import(`${CDN}/firebase-firestore.js`),
        import(`${CDN}/firebase-storage.js`)
    ]);

    const contentRef = doc(db, "site", "content");
    const TIERS = [["top", "Leadership"], ["officer", "Officer"], ["volunteer", "Volunteer"]];
    let people = [];
    let galleryImages = [];
    let chapters = [];
    let categories = [];
    let titles = [];

    function isAdmin(user) {
        if (!user) return false;
        if (!ADMIN_EMAILS.length) return true; // rules still enforce server-side
        return ADMIN_EMAILS.indexOf(user.email) !== -1;
    }

    // ---- Auto-save (debounced; no save button) ----
    const saveTimers = {};
    function setStatus(text, isError) {
        const el = $("autosave-status");
        if (!el) return;
        el.textContent = text;
        el.style.color = isError ? "#b00020" : "var(--ink-soft)";
    }
    function autosave(field, value) {
        setStatus("Saving…");
        clearTimeout(saveTimers[field]);
        saveTimers[field] = setTimeout(async function () {
            try {
                await setDoc(contentRef, { [field]: value, updatedAt: Date.now() }, { merge: true });
                setStatus("All changes saved ✓");
            } catch (err) {
                setStatus("Save failed: " + (err.message || err), true);
            }
        }, 600);
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

    // ---- Auth ----
    onAuthStateChanged(auth, function (user) {
        if (user && isAdmin(user)) {
            messageEl.style.display = "none";
            loginBox.style.display = "none";
            panel.style.display = "block";
            actions.style.display = "flex";
            $("admin-who").textContent = user.email;
            loadContent();
        } else if (user) {
            showMessage("Account " + user.email + " is not an admin.", true);
            loginBox.style.display = "block";
            panel.style.display = "none";
            actions.style.display = "none";
        } else {
            messageEl.style.display = "none";
            loginBox.style.display = "block";
            panel.style.display = "none";
            actions.style.display = "none";
        }
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

    // ---- Load live content from Firestore ----
    async function loadContent() {
        try {
            const snap = await getDoc(contentRef);
            const d = snap.exists() ? snap.data() : {};
            people = Array.isArray(d.people) ? d.people : ((window.BFBL_DATA && window.BFBL_DATA.people) || []);
            galleryImages = Array.isArray(d.galleryImages) ? d.galleryImages : ((window.BFBL_DATA && window.BFBL_DATA.galleryImages) || []);
            chapters = Array.isArray(d.chapters) ? d.chapters : ((window.BFBL_DATA && window.BFBL_DATA.chapters) || []);
            categories = (Array.isArray(d.categories) && d.categories.length) ? d.categories : DEFAULT_CATEGORIES.slice();
            titles = Array.isArray(d.titles) ? d.titles.slice() : [];
            if (window.BFBL_DATA) { window.BFBL_DATA.chapters = chapters; window.BFBL_DATA.categories = categories; }
        } catch (err) {
            people = (window.BFBL_DATA && window.BFBL_DATA.people) || [];
            galleryImages = (window.BFBL_DATA && window.BFBL_DATA.galleryImages) || [];
            chapters = (window.BFBL_DATA && window.BFBL_DATA.chapters) || [];
            categories = DEFAULT_CATEGORIES.slice();
            titles = [];
            setStatus("Could not read Firestore: " + (err.message || err), true);
        }
        migrateTitles();
        renderPeople();
        renderGallery();
        renderChaptersBoard();
        renderChapterPages();
        renderStructure();
    }

    // Converting the member "Title" into a dropdown must not drop anyone's existing written title:
    // fold every distinct free-text title currently on a member into the `titles` options list.
    function migrateTitles() {
        let changed = false;
        people.forEach(function (p) {
            const t = (p && p.title ? String(p.title) : "").trim();
            if (t && titles.indexOf(t) === -1) { titles.push(t); changed = true; }
        });
        if (window.BFBL_DATA) window.BFBL_DATA.titles = titles;
        if (changed) autosave("titles", titles);
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
                <label>Chapter <select data-field="chapter" data-i="${index}">${chapterOptions(person.chapter)}</select></label>
                <label style="display:flex; flex-direction:row; align-items:center; gap:0.45rem; color:var(--ink);">
                    <input type="checkbox" data-execcheck="${index}" ${person.execBoard ? "checked" : ""} style="width:auto; margin:0;"> Executive Board
                </label>
                ${person.execBoard ? `<label>Executive Board title <input data-field="execTitle" data-i="${index}" value="${escapeAttr(person.execTitle || "")}"></label>` : ""}
                <label>Bio <textarea data-field="bio" data-i="${index}" rows="2">${escapeHtml(person.bio || "")}</textarea></label>
                <label>Photo path <input data-field="photo" data-i="${index}" value="${escapeAttr(person.photo || "")}"></label>
                <label>Upload photo <input type="file" accept="image/*" data-upload="${index}"></label>
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
        // Executive Board checkbox — toggling it (here or on the Chapters board) flips the same
        // person.execBoard flag; checking it reveals the separate "Executive Board title" field.
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
            input.addEventListener("change", async function () {
                const i = Number(input.dataset.upload);
                const file = input.files && input.files[0];
                if (!file) return;
                if (tooBig(file)) { input.value = ""; return; }
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
            });
        });
    }

    on("add-person", "click", function () {
        people.push({ name: "", title: "", photo: "", fallbackPhoto: "images/logo.avif", detail: "", bio: "", roles: ["volunteer"] });
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
                <img src="${escapeAttr(src)}" alt="" style="width:100%; aspect-ratio:1/1; object-fit:cover; display:block; background:var(--surface);" onerror="this.src='images/logo.avif'">
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
    }

    on("gallery-upload", "change", async function () {
        const files = Array.from(this.files || []);
        if (!files.length) return;
        if (files.some(tooBig)) { this.value = ""; return; }
        setStatus("Uploading " + files.length + " photo(s)…");
        try {
            for (const file of files) {
                const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
                const storageRef = ref(storage, "gallery/" + Date.now() + "-" + safe);
                await uploadBytes(storageRef, file, uploadMeta(file));
                galleryImages.push({ src: await getDownloadURL(storageRef), alt: file.name.replace(/\.[^.]+$/, "") });
            }
            this.value = "";
            renderGallery();
            autosave("galleryImages", galleryImages);
        } catch (err) {
            setStatus("Upload failed: " + (err.message || err), true);
        }
    });

    // ---- Chapters board (drag & drop) ----
    function zoneMarkup(chapterId, tierKey, tierLabel) {
        const chips = [];
        people.forEach(function (p, i) {
            const pc = p.chapter || "";
            const pt = p.tier || "volunteer";
            const match = chapterId === "" ? (pc === "") : (pc === chapterId && pt === tierKey);
            if (match) chips.push(memberChip(p, i));
        });
        return '<div class="tier-zone" data-chapter="' + escapeAttr(chapterId) + '" data-tier="' + escapeAttr(tierKey) + '">'
            + (tierLabel ? '<div class="tier-label">' + escapeHtml(tierLabel) + '</div>' : '')
            + chips.join("") + '</div>';
    }

    // Executive Board is a separate, NON-exclusive assignment (person.execBoard): a member can be
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
        let html = '<div class="chapter-col"><h4>Unassigned</h4>' + zoneMarkup("", "", "No chapter") + '</div>';
        html += '<div class="chapter-col"><h4>Executive Board</h4>' + execZoneMarkup() + '</div>';
        chapters.forEach(function (c) {
            const zones = TIERS.map(function (t) { return zoneMarkup(c.id, t[0], t[1]); }).join("");
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
                    people[idx].execBoard = true; // non-exclusive — leave chapter/tier untouched
                } else {
                    people[idx].chapter = zone.dataset.chapter || "";
                    if (zone.dataset.tier) people[idx].tier = zone.dataset.tier;
                    else delete people[idx].tier;
                }
                renderChaptersBoard();
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
                <div style="font-weight:700; font-size:0.8rem; color:var(--ink-soft); margin-top:0.4rem;">Chapter highlights (${c.photos.length})</div>
                <div class="gallery-grid-admin">${photosHtml}</div>
                <label class="btn btn-secondary" style="cursor:pointer; justify-self:start;">+ Add highlight photos<input type="file" accept="image/*" multiple data-cphoto-upload="${index}" style="display:none;"></label>
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
function memberChip(person, index) {
    return '<div class="member-chip" draggable="true" data-idx="' + index + '">'
        + avatarHTML(person, 24)
        + '<span style="flex:1; overflow-wrap:anywhere;">' + escapeHtml(person.name || "(unnamed)") + '</span></div>';
}
// Like memberChip, but with a ✕ to remove from the Executive Board (since board membership is
// non-exclusive, you can't simply drag them out — this clears person.execBoard).
function execMemberChip(person, index) {
    return '<div class="member-chip" draggable="true" data-idx="' + index + '">'
        + avatarHTML(person, 24)
        + '<span style="flex:1; overflow-wrap:anywhere;">' + escapeHtml(person.name || "(unnamed)") + '</span>'
        + '<button type="button" data-exec-remove="' + index + '" title="Remove from board" style="border:none; background:none; cursor:pointer; font-weight:800; color:var(--ink-soft); padding:0 0.2rem; line-height:1;">✕</button>'
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
