# CLAUDE.md — Bytes for Better Lives (BFBL)

Living context for this repo. Keep it accurate: when the site's structure, conventions, or
state change, update the relevant section here in the same change.

## What this is
Marketing/info website for **Bytes for Better Lives**, a student-led nonprofit in South Florida
that bridges the digital divide for seniors and children (senior tech help, digital-literacy and
online-safety education, donations, and a growing chapter network).

## Tech & how to run
- **Plain static site** — vanilla HTML + CSS + JS, no build step, no framework, no package manager.
- All source files live at the **repo root** (there is no `src/` or `pages/` directory).
- Run locally: `python3 -m http.server 8000`, then open http://localhost:8000/.
- **Hosting = Firebase Hosting** (`firebase.json` + `.firebaserc`, project
  `project-686d62b7-14f5-43c7-acc`). Deploy with **`npx firebase deploy --only hosting`** — this
  uploads the **local files** (manual CLI deploy, NOT auto from git). Live at
  **https://project-686d62b7-14f5-43c7-acc.web.app** (clean URLs: `/about`, `/admin`, …).
  `firebase-tools` is a local devDependency; the CLI auths via the same gcloud ADC (no `firebase login`).
  NOTE: **content** edits (Firestore via admin) are live instantly; **file/code** edits need a redeploy.
  (Vercel may still be connected to GitHub separately, but Firebase is the intended host now.)

## Architecture — content is data-driven
The HTML pages are thin shells with **empty containers** that `script.js` fills at runtime from
`data.js`. Edit data/logic, not the rendered markup.

- **`data.js`** — site content. Top-level keys: `contactEmail`, `donateUrl`, `socialLinks`,
  `fundraisers`, **`people`**, `chapters`, `gallery`.
  - **`people` is the central member registry — the single source of truth for every member.**
    Each person is defined ONCE with `name`, `title`, `photo`, `fallbackPhoto`, `bio`, `detail`,
    `contact`, and a `roles` array (`"leadership"`, `"design"`, `"volunteer"`; a
    person may hold several). Do NOT re-list a person elsewhere — add/remove a role instead.
  - **Founders are HARDCODED**, not data-driven: the `FOUNDERS` const at the top of `script.js`
    is the only source. They are intentionally NOT in `data.people` / Firestore / the admin (they
    never change). `deriveRoles()` always sets `data.founders = FOUNDERS`. To edit founders, edit
    that const. There is no `"founder"` role or category anymore.
  - `script.js` derives `data.officers` (leadership) / `data.design` /
    `data.volunteers` from `data.people` by role at startup, so existing render code is unchanged.
    The homepage "All Members" list and team-page sections all come from `data.people`
    (except Founders, which come from the hardcoded `FOUNDERS`).
  - **Public display title** = `memberDisplayTitle(person)` in `script.js`: exec-board members
    (`person.execBoard`) show their `execTitle`; everyone else shows **"Title ⋅ Chapter Name"** when
    they have a `chapter` (just the title otherwise). Applied across member cards via
    `withDisplayTitle()` / inline in the team, chapter, and homepage member renders.
  - Team page **"Executive Board"** section renders one combined grid: the **first 3**
    `leadership` people (the exec board) plus the `design` people, in a single row (no separate
    "Leadership"/"Design" subheadings). Remaining officers stay
    in the registry + homepage All Members but get no separate team section. Team section order:
    Executive Board → Chapter leadership → Volunteers → **Legacy** (the Founders section, moved to
    the bottom, titled "Legacy", no description). Old "Club Officers" section removed.
  - Members carry a `chapter` (chapter id) and a category (`roles[0]`) set via the admin Chapters
    board. **Public chapter pages list their members grouped by category** (`renderChapterMembersByCategory`,
    headings from `categories`). `firebase-data.js` fetches `categories`/`titles` too, so the public
    category labels/order match the admin. (The old `tier` field is retired.)
  - Chapter pages list *which* people lead each chapter in `chapters[].leadPeople` (by name), but
    each lead's displayed **photo, bio, and canonical name are resolved from `data.people`** via
    `resolvePersonRef()` / `personByName()` in `script.js`. So a person's profile lives only in the
    registry; chapters just reference them. Add any new chapter lead to `data.people` too.
  - Net: every person displayed anywhere (team sections, homepage preview + All Members list,
    chapter-lead cards/avatars) is backed by the single `data.people` registry.
- **`script.js`** — all rendering + behavior:
  - `navItems` array (~line 21) defines the **navbar** links.
  - Impact **stat numbers** (Fundraised / Donations / Students / Seniors / Chapters) are the
    `stats` array (~line 366) — *here, not in data.js*.
  - Renders footer, team (founders/officers/volunteers), gallery, carousels, lightbox, mobile
    hamburger nav, and the chapters directory + profile pages.
  - **Avatars**: `personPhotoMarkup(name, photo, …)` renders a portrait, or the person's initials
    on the brand green (`.avatar-initials`) when there's no real photo. `hasRealPhoto()` treats a
    missing photo *or* the `logo.avif` placeholder as "no photo"; if a real photo 404s,
    `initImageFallbacks` swaps the `<img>` for the initials avatar.
  - **Lightbox**: any `.clickable-image` opens the shared popup. Wrap a set in a
    `.carousel-container` or `[data-lightbox-group]` to enable prev/next across the group
    (the Gallery page uses `data-lightbox-group`).
  - `ensureChapterProfileLayout()` **injects the hero/layout into the lightweight
    `chapter-*.html` stub pages** (which carry only `data-chapter-id`). Edit the chapter template
    here and chapter data in `data.js` — not the stub HTML.
  - **Chapter profile pages have exactly two sections**: (1) **Chapter members** — the people
    assigned to that chapter (`person.chapter === chapter.id`), grouped by their category
    (`roles[0]`, labelled from `data.categories`) via `renderChapterMembersByCategory()`; and
    (2) **Chapter highlights** — the `chapter.photos` grid. The hero has a single **"Support this
    Chapter"** CTA (`chapterSupportUrl()`: the chapter's own fundraiser URL if any, else
    `donateUrl`). The old leadership/fundraisers/organization sections and the All Chapters /
    Volunteer / Instagram hero buttons were removed. Members show "Member roster coming soon."
    until assigned via the admin Chapters board.
- **`styles.css`** — single stylesheet. Colors are **OKLCH custom properties** in `:root`.
- **`images/`** — organized into subfolders (e.g. `images/work with seniors/`, `images/donations/`,
  `images/team/`, `images/ongoing initiatives/`, `images/our impact/`). Note: some folder/file
  names contain spaces.

## Pages (current)
`index.html` (Home), `about.html`, `impact.html`, `ongoing-initiatives.html`, `team.html`,
`chapters.html`, `chapter-{ahs,coral-springs,cypress,gainesville,new-york,russia,turkey}.html`,
`contact.html`, `past-events.html`, `gallery.html` (standalone photo gallery — a grid of all
activity photos; clicking one opens the lightbox).
Admin pages (noindex, not in navbar): `admin.html` (redirect → `members-admin.html`),
`members-admin.html`, `gallery-admin.html`, `chapters-admin.html`, `chapter-pages-admin.html`,
`structure-admin.html` (full admins), and `chapter-admin.html` (scoped chapter-admin editor).

Navbar order: About · Impact · Initiatives · Team · Chapters · Gallery (no "Home" tab). The
"Initiatives" tab is `ongoing-initiatives.html` (display label renamed to "Initiatives"; filename kept).
Chapter display names: AHS = "AHS Chapter" (still labelled the "Founding Chapter" eyebrow on the
chapters directory summary card), `turkey` = "Turkey Chapter" (Instagram handle `bfbl_turkiye` kept).

- **`impact.html` is consolidated**: it holds the former "work with seniors", "work with kids",
  "donations", "partners", and "gallery" content as in-page sections with anchors
  `#seniors`, `#kids`, `#donations`, `#partners`, `#gallery`.
- ⚠️ **Do NOT recreate** `donations.html`, `work-with-seniors.html`, `work-with-kids.html`, or
  `our-impact.html` — they were intentionally removed and merged into `impact.html`.
- `test-image-loading.html`, `test-preservation.html`, `test-preservation.js`,
  `test-image-paths.js` are leftover image-path test harnesses from an earlier fix effort
  (not part of the live site; possibly stale).

## Design / branding
- **Signature brand color = "SY Glacier Mint" `#B4D3AD`** (`--green`; shades `--green-dark: #4F7A46`,
  `--green-soft: #E8F1E4`). `--primary-color: var(--green)`. Primary CTAs (`.btn-primary`,
  `.btn-donate`) use it with dark `--ink` text. (Earlier it was a lime green — now changed.)
  All greens flow from these three vars; nothing hardcodes the old color.
- **Blue** (`--blue`) is the secondary accent only. Any older notion of a blue primary (`#2563eb`)
  is obsolete.
- **Hero banner photo**: `images/IMG_7470.JPG`, shared across home, interior, and chapter pages.
  - `.home-hero` (home, taller), `.chapter-hero` (chapter pages), and `.hero-home-banner`
    (About/Impact/Ongoing Initiatives/Team) all use this image over a dark gradient overlay.
  - Plain `.hero` falls back to `images/hero-bg.avif` — but no live page uses bare `.hero` anymore.
- Logo: `.logo img` is `height: 58px`. Navbar logo links home (the "Home" nav tab was removed).
- Responsive with a hamburger menu (`initMobileNavigation`). No back-to-top button (removed). The
  home hero has no "proof pills" row (removed).

## Current content snapshot
- Stats: ~**$8,450** fundraised, **2,350+** donations, **1,500+** students, **3,500+** seniors,
  **5+** chapters.
- `donateUrl` → GoFundMe ("help provide iPads to local schools").
- Team is a large data-driven roster (founders + executive board/officers + chapter leaders +
  volunteers) — not a fixed 5-person list.

## Git / workflow
- Remote: `github.com/Andrey199123/bytesforbetterlives`. Default branch: `main`.
- Feature work happens on branches (e.g. `petr`). **Deploy = `npx firebase deploy --only hosting`**
  (uploads local files) — no longer tied to a git merge/push. Lots of recent work is uncommitted.
- Commit only when asked. Commit-message footer:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

## Conventions
- Keep it vanilla — no frameworks/build tooling. Match the surrounding code style.
- To change **navigation** → `navItems` in `script.js`.
- To change **stats** → `stats` array in `script.js`.
- To change **content** (members, chapters, gallery, etc.) → **Firestore** via the **per-tab admin
  pages** (`members-admin.html` etc.; `admin.html` redirects there) or the Admin SDK
  (`tools/firestore.mjs`), NOT `data.js` (that's only the seed/offline fallback now).
- To change a **chapter page** → layout/template in `ensureChapterProfileLayout()` (`script.js`);
  per-chapter content (details + highlight photos) via **`chapter-pages-admin.html`** (full admin) or
  **`chapter-admin.html`** (that chapter's admin) — both write the `chapterContent/{id}` doc.

## Firebase (live)
Project: `project-686d62b7-14f5-43c7-acc`. Firestore + Auth + Storage + Hosting all in use.
Storage bucket is **`project-686d62b7-14f5-43c7-acc.firebasestorage.app`** (in `firebase.js` — note
it is NOT `.appspot.com`; the wrong value caused upload hangs earlier).

**Live source of truth = Firestore, now split across two collections (merged on read):**
- **`site/content`** — SHARED content, FULL-admin write only: `categories`, `titles`, `galleryImages`,
  `gallery` [stories], `fundraisers`, `contactEmail`, `donateUrl`, `socialLinks`, a **chapters
  registry** (`[{id, pageHref}]`), unassigned `people`, and **`chapterAdmins`** (`email → chapterId`).
- **`chapterContent/{chapterId}`** — ONE doc per chapter = `{ page: {…editable chapter detail +
  photos…}, members: [that chapter's members] }`. Writable by full admins **or** that chapter's
  approved admin (rules check `site/content.chapterAdmins`).
- **Reads merge both**: `firebase-data.js` (public) and `admin.js` build `data.chapters` (registry ⊕
  each `page`) and `data.people` (unassigned ⊕ every chapter's `members`). So the site is one
  combined dataset; only WRITES are partitioned. `admin.js`'s `autosave()` routes: `"people"` →
  `savePeople()` (partitions into the chapter docs), `"chapters"` → `saveChapters()` (page per doc +
  registry + orphan-doc cleanup), everything else → `site/content`.

`data.js` is the **seed / offline fallback** — editing it alone does NOT change the live site.

- `gallery.html` is **de-hardcoded** — `script.js` `renderGalleryImages()` renders `.photo-gallery-grid`
  from `data.galleryImages`.
- Public-side TODO: render dynamic Team sections for new `categories`, and admin editors for
  **fundraisers** / **gallery stories** /
  **site settings** / full chapter-detail editing.

- **Public read** — `firebase-data.js` (classic script on every page, before `script.js`) fetches
  **`site/content` AND the `chapterContent` collection** via Firestore's public REST API, **merges**
  them into `window.BFBL_DATA` (chapters = registry ⊕ page; people = unassigned ⊕ all chapter members),
  and sets `window.BFBL_DATA_READY`. Falls back to `data.js` if Firestore is empty/unreachable (3s).
- **Auth / roles** — Google sign-in. **Full ("executive") admins** edit everything: `ADMIN_EMAILS`
  in `firebase.js` = `firestore.rules` `isFullAdmin()` list (keep in sync). **Chapter admins**:
  `site/content.chapterAdmins` (`email → chapterId`, managed by full admins in the Structure tab) may
  edit ONLY their `chapterContent/<id>` doc (page + members) — enforced by `firestore.rules`
  `isChapterAdminFor()`. On login `admin.js` routes a chapter admin to **`chapter-admin.html`** (a
  scoped editor: their chapter page + members only; `SCOPE_CID` gates all writes to their doc) and
  routes full admins away from it. **`storage.rules`** = explicit admin email list only (Storage
  rules can't read the chapterAdmins map), so a chapter admin can't upload FILES unless their email
  is added to `storage.rules` — otherwise they set a member/chapter photo by path/URL.
- **Admin = one page per tab** (`admin.js` SDK, shared `admin.css`): **`members-admin.html`**,
  `gallery-admin.html`, `chapters-admin.html`, `chapter-pages-admin.html`, `structure-admin.html`.
  Tabs are links between these pages (not in-page switching); `admin.html` is now just a redirect to
  `members-admin.html`. **All pages load the same `admin.js`** — every `render*()` and listener is
  null-guarded (`on(id,…)` helper) so each page renders only the section it contains. Google login →
  **auto-saving** (no Save button; debounced merge-writes to `site/content`). To add a tab: new
  `*-admin.html` (copy the shared shell, swap the active tab link + section) and a guarded `render*()`.
    - **Members** — 3-per-row cards: name, **Title** dropdown (from `titles`), **Category** dropdown
      (from `categories`), **Executive Board** checkbox (`person.execBoard`; when on, reveals a
      separate free-text **Executive Board title** input stored in `person.execTitle` — distinct
      from the regular `title`; it's a type-in, NOT the `titles` dropdown), bio, photo path + Storage
      upload, plus a separate **Executive Board bio** (`person.execBio`, shown only when the box is
      checked). No real photo → green **initials** avatar. `person.title` is chosen from the `titles`
      dropdown; `person.execTitle`/`execBio` are free text. Board members render their `execTitle`
      + `execBio` publicly via `memberDisplayTitle()` / `memberDisplayBio()`. Uploads are guarded client-side
      to <10 MB and **raster image types only** (`isRasterImage()`, mirroring `storage.rules`; SVG is
      rejected); avoids the opaque `storage/unauthorized`.
    - **Gallery** — bulk upload the gallery-page photos (`galleryImages`) via a styled
      **`.upload-dropzone`** (`#gallery-dropzone`) that is **click-to-choose AND drag-and-drop**
      (`uploadGalleryFiles()`; many files at once, per-file >10 MB skip, live progress) / remove
      photos. Thumbnails are clickable → a self-contained popup (`openAdminLightbox()`).
      Member photo upload uses the same `.upload-dropzone` (`uploadMemberPhoto()`), not a raw file input.
    - **Chapters** — drag-and-drop board (column per chapter + Unassigned + **Executive Board**).
      Each chapter's sub-zones are the **member categories** (from the Structure tab / `categories`),
      matching how the public chapter page groups members. Dropping a member into chapter X's
      "<Category>" zone sets `person.chapter = X` **and** `person.roles = [categoryId]`. Each chip
      shows the member's **role under their name as an editable control**: a **title dropdown**
      (from the Structure `titles` list → sets `person.title`) or a **typed board-title field** on
      Executive Board chips (→ `person.execTitle`); both save to Firestore. The **Executive Board** column is a
      **non-exclusive** flag (`person.execBoard = true`) — dropping there doesn't touch
      `chapter`/category, so a member can be on the board *and* in a chapter; ✕ removes them.
      (The legacy `tier` field is retired.)
    - **Chapter Pages** — per-chapter card editor (`renderChapterPages()`): edit name, location,
      status, statusTag, Instagram URL, description, and **manage chapter-highlight photos**
      (upload to Storage `chapters/<id>/…` / remove → `chapter.photos`, the array the public
      "Chapter highlights" section renders).
    - **Structure** — add/remove/**rename** **categories**, **chapters**, and **titles** (the member
      Title dropdown options). Renaming categories/chapters edits the display `label`/`name` only
      (the `id` stays stable so member role/chapter assignments hold). **Titles** are plain strings
      stored directly on `person.title`, so renaming a title **propagates** to every member who had
      it; removing a title just drops it from the options (members keep their value). On load,
      `migrateTitles()` folds any free-text `person.title` not yet in `titles` into the options.
      Also has a **Chapter admins** editor (`renderChapterAdmins()`): add/remove `email → chapter`
      entries → `site/content.chapterAdmins`.
    - **`chapter-admin.html`** (separate scoped page, not a tab) — where approved chapter admins land:
      only their chapter's page editor + members (reuses `renderChapterPages`/`renderPeople` filtered
      by `SCOPE_CID`; Chapter/Exec-Board controls hidden; saves only their `chapterContent` doc).
  Login is **Google sign-in** (official-branded button). Client checks `ADMIN_EMAILS`; rules enforce.
- **Rules** — `firestore.rules` / `storage.rules` (both wired into `firebase.json`). **Deploy with
  `npx firebase deploy --only firestore:rules,storage`** (no longer console-only); the CLI compiles
  them first, so a syntax error fails loudly. Hardened model (2026-05-29 security pass):
  - **Verified-identity gate** — `isVerified()` requires `request.auth.token.email_verified == true`
    **and** `firebase.sign_in_provider == 'google.com'`. Both `isFullAdmin()` and `isChapterAdminFor()`
    (Firestore) and `canUpload()` (Storage) build on it, so the email claim can't be spoofed via a
    self-registered Email/Password account. **Keep only Google sign-in enabled in the Firebase console.**
  - **Firestore writes**: `site/content` = full admin only; `chapterContent/{cid}` = full admin, or that
    chapter's admin **constrained to `keys().hasOnly(['page','members'])` with `members.size() <= 200`**.
    The catch-all `match /{document=**}` is now **default-deny read** (`allow read: if false`) so any
    future collection is private until explicitly opened; only `site/content` + `chapterContent` are
    public-read. Writes elsewhere = full admin only.
  - **Storage writes**: verified admins only, `< 10 MB`, **raster images only**
    (`image/(png|jpeg|jpg|gif|webp|avif)` — **SVG excluded**, since it can carry script). `admin.js`
    mirrors this client-side via `isRasterImage()`/`notRasterImage()` on every upload path.
- **HTTP security headers** (`firebase.json` `headers` on `**`): CSP, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, HSTS, `Permissions-Policy`. The CSP allowlists
  `gstatic`/`apis.google.com` (scripts), `*.googleapis.com`/`*.firebasestorage.app` (Firestore/Storage),
  `formsubmit.co` (email form), and the Firebase-Auth/Google hosts — keep it in sync when adding any
  third-party script/endpoint. `frame-ancestors 'none'` blocks clickjacking of the admin pages.
- **URL/XSS hardening** — `script.js` `escapeHTML()` covers HTML/attribute context; for any **data-driven
  `href`** use **`safeUrl()`** (scheme allowlist: http(s)/mailto → else `#`) wrapped in `escapeHTML`,
  e.g. `href="${escapeHTML(safeUrl(x))}"`. This blocks `javascript:`/`data:` URIs in chapter-admin-set
  fields (instagram, fundraiser/support URLs, `pageHref`). All `target="_blank"` links carry
  `rel="noopener noreferrer"`.
- **Email form anti-abuse** (`chapters.html` + `script.js` `submitEmailForm`): hidden honeypot
  (`#company-website` / FormSubmit `_honey`), 1 msg/min localStorage cooldown, 4000-char cap. Still
  client-side only — a server-side relay/rate-limit + **Firebase App Check** + a **GCP budget cap** are
  the remaining console-side hardening (public Firestore reads are an un-metered cost lever otherwise).

### Updating content as Claude (no browser)
Use the Admin SDK helper `tools/firestore.mjs` (key-less — uses gcloud Application Default
Credentials; run once: `gcloud auth application-default login` as the project Owner + 
`gcloud auth application-default set-quota-project project-686d62b7-14f5-43c7-acc`). Pattern:
```js
import { getContent, patchContent } from "./tools/firestore.mjs";
const d = await getContent();           // read live
// ...modify d.people / d.chapters / etc...
await patchContent({ people: d.people }); // merge-write (won't clobber other fields)
```
Run with `node`. Always read-modify-write so you don't overwrite the user's admin.html edits.
`package.json` (firebase-admin dep) and `node_modules/` exist only for this tooling; not deployed.

## History note
The repo previously contained ~23 stale dev-changelog/test `.md` files (and an outdated `readme.md`);
all were deleted in favor of this file. There is currently **no human-facing README** — write a fresh
one if a public-facing project description is wanted.
