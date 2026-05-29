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
    Executive Board → Chapter leadership → Founders → Volunteers. Old "Club Officers" section removed.
  - Members may also carry a `chapter` (chapter id) and `tier` (`top`/`officer`/`volunteer`) set via
    the admin Chapters board. (Not yet shown on public chapter pages — assignment data only so far.)
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
`chapters.html`, `chapter-{ahs,coral-springs,cypress,gainesville,new-york,russia,turkiye}.html`,
`contact.html`, `past-events.html`, `gallery.html` (standalone photo gallery — a grid of all
activity photos; clicking one opens the lightbox).

Navbar order: About · Impact · Initiatives · Team · Chapters · Gallery (no "Home" tab). The
"Initiatives" tab is `ongoing-initiatives.html` (display label renamed to "Initiatives"; filename kept).
Chapter display names: AHS = "AHS Chapter" (still labelled the "Founding Chapter" eyebrow on the
chapters directory summary card), `turkiye` = "Turkey Chapter" (ids unchanged).

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
- To change **content** (members, chapters, gallery, etc.) → **Firestore** via `admin.html` or the
  Admin SDK (`tools/firestore.mjs`), NOT `data.js` (that's only the seed/offline fallback now).
- To change a **chapter page** → layout/template in `ensureChapterProfileLayout()` (`script.js`);
  per-chapter content (details + highlight photos) via **admin.html → Chapter Pages tab** (Firestore).

## Firebase (live)
Project: `project-686d62b7-14f5-43c7-acc`. Firestore + Auth + Storage + Hosting all in use.
Storage bucket is **`project-686d62b7-14f5-43c7-acc.firebasestorage.app`** (in `firebase.js` — note
it is NOT `.appspot.com`; the wrong value caused upload hangs earlier).

**Live source of truth = Firestore** doc `site/content` (fields: `people`, `chapters`, `gallery`
[gallery stories], `galleryImages` [the gallery-page photo grid], `categories` [member-category
options], `titles` [member job-title options — array of strings], `fundraisers`, `contactEmail`,
`donateUrl`, `socialLinks`). `data.js` is now just the
**seed / offline fallback** — editing it alone does NOT change the live site. Goal: **nothing
hardcoded** — all content comes from Firestore; `admin.html` edits it and auto-syncs.

- `gallery.html` is **de-hardcoded** — `script.js` `renderGalleryImages()` renders `.photo-gallery-grid`
  from `data.galleryImages`.
- Public-side TODO: render dynamic Team sections for new `categories`, show member `chapter`/`tier`
  assignments on chapter pages, and admin editors for **fundraisers** / **gallery stories** /
  **site settings** / full chapter-detail editing.

- **Public read** — `firebase-data.js` (classic script on every page, before `script.js`) fetches
  `site/content` via Firestore's public REST API, merges into `window.BFBL_DATA`, and sets
  `window.BFBL_DATA_READY`. `script.js` awaits that, then re-syncs `data`, re-runs `deriveRoles()`,
  and renders once. Falls back to `data.js` if Firestore is empty/unreachable (3s timeout).
- **Auth** — Google sign-in. Admins: `bytesforbetterlives@gmail.com`, `petr1264k@gmail.com`
  (in `firebase.js` `ADMIN_EMAILS` AND `firestore.rules`/`storage.rules` — keep all three in sync).
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
      upload. No real photo → green **initials** avatar. `person.title` is chosen from the `titles`
      dropdown; `person.execTitle` is free text. Uploads are guarded client-side
      to <10 MB with an explicit image content-type (matches `storage.rules`; avoids the opaque
      `storage/unauthorized`).
    - **Gallery** — upload (to Storage) / remove the gallery-page photos (`galleryImages`).
    - **Chapters** — drag-and-drop board (column per chapter + Unassigned + **Executive Board**;
      Leadership/Officer/Volunteer zones); dropping a member into a chapter sets their `chapter` +
      `tier`. The **Executive Board** column is a **non-exclusive** flag (`person.execBoard = true`):
      dropping there does NOT touch `chapter`/`tier`, so a member can be on the board *and* in a
      chapter; remove via the ✕ on the chip. (`tier` key `top` is labelled "Leadership" in the UI.)
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
  Login is **Google sign-in** (official-branded button). Client checks `ADMIN_EMAILS`; rules enforce.
- **Rules** — `firestore.rules` / `storage.rules`: public **read**, admin-only **write**. Published
  in the console (re-publish there after editing the files; they don't auto-deploy).

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
