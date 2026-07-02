# CLAUDE.md — Bytes for Better Lives (BFBL)

Living context for this repo. Keep it accurate: when structure, conventions, or state change,
update the relevant section here in the same change.

## What this is
Marketing/info site for **Bytes for Better Lives**, a student-led South Florida nonprofit bridging
the digital divide for seniors and children (senior tech help, digital-literacy/online-safety
education, donations, a growing chapter network).

## Tech & how to run
- **Plain static site** — vanilla HTML/CSS/JS, no build step, no framework, no package manager. All
  source files live at the **repo root** (no `src/`/`pages/`).
- Run locally: `python3 -m http.server 8000` → http://localhost:8000/.
- **Hosting = Vercel.** Deployed by a **GitHub Action** (`.github/workflows/vercel-deploy.yml`) on
  every push to `main` (+ manual `workflow_dispatch`): `vercel pull`/`build --prod`/`deploy --prebuilt
  --prod` using secrets `VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID`. So **file/code edits go
  live by committing + pushing to `main`** — no manual deploy command. Vercel's own git integration is
  intentionally OFF in `vercel.json` (`git.deploymentEnabled:false`, `github.enabled:false`) so deploys
  happen ONLY via the Action. **Content** edits (Firestore via admin) are live instantly; **file/code**
  edits need the push-to-`main` deploy.
- **Firebase is the BACKEND only** (Firestore + Auth + Storage), not the host. `firebase.json` +
  `.firebaserc` (project `project-686d62b7-14f5-43c7-acc`) remain for **rules/Storage deploys**
  (`npx firebase deploy --only firestore:rules,storage`). `firebase-tools` is a local devDependency;
  CLI auths via gcloud ADC (no `firebase login`). Do NOT `firebase deploy --only hosting` — push to `main`.

## Architecture — content is data-driven
HTML pages are thin shells with **empty containers** that `script.js` fills at runtime. Edit
data/logic, not rendered markup. **Live content = Firestore** (see Firebase section); `data.js` is the
**seed/offline fallback** — editing it alone does NOT change the live site.

### `data.js` keys & the people model
Top-level: `contactEmail`, `donateUrl`, `socialLinks`, `fundraisers`, `drives`, `people`, `chapters`, `gallery`.
- **`drives`** — donation drives, `driveCardMarkup` → `#drives-grid` ("Current drives" on
  `ongoing-initiatives.html`, under "Current fundraisers"; `renderInitiativesPage` hides
  `#drives-section` when empty). Each `{id,title,status,description,url,image,alt}`; `status`→`.drive-status`
  pill; `url` makes CTA "Donate" else "Get Involved"→contact.html.
- **`people` = the single source of truth for every member.** Each person defined ONCE: `name`,
  `title`, `photo`, `fallbackPhoto`, `bio`, `detail`, `contact`, `roles` array
  (`"leadership"`/`"design"`/`"volunteer"`; may hold several). Do NOT re-list elsewhere — add/remove a role.
- **Founders are HARDCODED** in the `FOUNDERS` const at top of `script.js` — intentionally NOT in
  `data.people`/Firestore/admin. `deriveRoles()` sets `data.founders = FOUNDERS`. No `"founder"` role exists.
- `script.js` derives `data.officers`/`data.design`/`data.volunteers`/`data.execBoard` from
  `data.people` by role at startup. Homepage "All Members" roster was removed (`[data-members-slider]`
  renderer is null-guarded).
- **Public display title** = `memberDisplayTitle(person)`: exec-board (`person.execBoard`) show
  `execTitle`; others show **"Title ⋅ Chapter Name"** when they have a `chapter` (else just title). Via
  `withDisplayTitle()`. **EXCEPTION: chapter profile pages show plain `person.title`** (already in that
  chapter's context — `renderChapterMembersByCategory`).
- Team page sections (order): **Board of Directors** (only `person.execBoard===true`, = `data.execBoard`;
  homepage `#executive-board-preview` uses same list) → **Chapter leadership** (`chapterLeadershipBlockMarkup`,
  one block per chapter incl. AHS, all `leadership`-role members; AHS leaders may also show in Board if
  flagged) → **Volunteers** → **Legacy** (Founders, no description).
- Members carry `chapter` (id) + category (`roles[0]`) set via admin Chapters board. Public chapter
  pages group members by category (`renderChapterMembersByCategory`, headings from `categories`).
  `firebase-data.js` fetches `categories`/`titles` too so labels match admin. (`tier` field retired.)
- Chapters reference leads by name in `chapters[].leadPeople`; photo/bio/name resolved from
  `data.people` via `resolvePersonRef()`/`personByName()`. Add any new chapter lead to `data.people`.

### `script.js` — rendering + behavior
- `navItems` (~line 21) = navbar links. Impact **stat numbers** = `stats` array (~line 366/501),
  *here, not data.js*.
- **Avatars**: `personPhotoMarkup(name,photo,…)` → portrait or initials on brand green
  (`.avatar-initials`) when no real photo. `hasRealPhoto()` treats missing photo OR `logo.avif`
  placeholder as "no photo"; `initImageFallbacks` swaps 404'd `<img>` for initials (also catches images
  that errored before the listener attached: `complete && naturalWidth===0`).
  - **Per-member framing**: `photoZoom`(1–3), `photoX`,`photoY`(0–100 object-position %) set via a
    Google-profile-style cropper in member admin (drag + zoom slider, `data-fit-zoomrange`; `renderPeople`
    + `fitInline`). `photoFitStyle(name)` applies `object-position`+`transform:scale()` and wraps `<img>`
    in `.avatar-fit` (tight `overflow:hidden` circle). Default (1/50/50) → no wrapper. Stored on person.
- **Lightbox**: any `.clickable-image` opens the shared popup (`initLightbox`). Wrap a set in
  `.carousel-container`/`[data-lightbox-group]` for prev/next (each gallery location section is one
  group). Controls are inline-SVG icons (centred `×` + chevrons) in frosted buttons. Bottom
  `.lightbox-info` pill shows **capture date · location** (`.lightbox-caption` from `data-taken`/`data-location`)
  + `N / M`. Tiles expose date on hover via `<figcaption>` + `title`.
- **Story flip cards** (home "Photo Stories", `.story-card`): tap flips photo→text; faces are absolute
  so `toggleStoryCard`/`syncStoryCardHeight` grows the card to the back face's `scrollHeight`;
  `.gallery-grid` is `align-items:start`.
- **Chapter profile pages** (`renderChapterProfilePage` + `ensureChapterProfileLayout`, which injects
  the hero/layout into the lightweight `chapter-*.html` stubs that carry only `data-chapter-id` — edit
  the template here, not the stub HTML). Sections: (1) **Chapter members** (by category); (2) **Chapter
  highlights** (`chapter.photos`). **Optional, hidden via `display:none` when empty**: **Impact stats**
  (`chapter.stats=[{value,label}]`→`#chapter-stats-section`), **Community partners**
  (`chapter.partners=[string]`→`#chapter-partners-section`), **Current initiatives** (see admin
  Initiatives). Hero CTAs build conditionally: always "Support this Chapter" (`chapterSupportUrl()`),
  plus "Get Involved" (`chapter.joinUrl`), Instagram (`chapter.instagram`), "Email the Chapter"
  (`chapter.contactEmail`) when set. These fields live on `chapterContent/{id}.page`.

### `styles.css`
Single stylesheet. Colors are **OKLCH custom properties** in `:root`.

### `images/`
Subfolders (e.g. `images/work with seniors/`, `images/donations/`, `images/team/`); some names
contain spaces.

## Pages
`index.html` (Home), `about.html`, `impact.html`, `ongoing-initiatives.html`, `team.html`,
`chapters.html`, `chapter-{ahs,coral-springs,cypress,gainesville,miami,new-york,virginia,russia,turkey}.html`,
`contact.html`, `past-events.html`, `gallery.html` (standalone photo gallery → lightbox).
Admin (noindex, not in navbar): `admin.html` (chapter-picker login landing), `members-admin.html`,
`gallery-admin.html`, `chapters-admin.html`, `chapter-pages-admin.html`, `initiatives-admin.html`,
`fundraisers-admin.html`, `structure-admin.html`; per-chapter scoped `chapter-<id>-admin.html`
generated from the `chapter-admin.html` template (which also works as `?c=<id>` fallback).

- Navbar order: About · Impact · Initiatives · Team · Chapters · Gallery (no "Home"). "Initiatives" tab
  = `ongoing-initiatives.html` (label renamed, filename kept). AHS = "AHS Chapter" ("Founding Chapter"
  eyebrow on directory); `turkey` = "Turkey Chapter" (IG handle `bfbl_turkiye`).
- **`impact.html` is consolidated**: former "work with seniors/kids", "donations", "partners" as
  in-page sections (`#seniors`,`#kids`,`#donations`,`#partners`). Old `#gallery` section REMOVED
  (`renderGalleryPage()` null-guarded → no-op); Home "View Full Gallery" → `gallery.html`.
- ⚠️ **Do NOT recreate** `donations.html`, `work-with-seniors.html`, `work-with-kids.html`,
  `our-impact.html` — intentionally merged into `impact.html`.
- `test-image-loading.html`, `test-preservation.html`, `test-preservation.js`, `test-image-paths.js`
  are stale leftover test harnesses (not live).

## Design / branding
**2026-05-31 redesign** — "warm + bold blend" (DECA + youthteaching.org), mint-led; read as
intentional/editorial, not AI-template.
- **Type**: `--font-display`=**Nunito** (headings 800); `--font-body`=**Mulish**; `--font-label`=Nunito
  (kickers/buttons/nav, uppercase). No serif (rejected).
- **Brand color = "SY Glacier Mint" `#B4D3AD`** (`--green`; `--green-dark:#4F7A46`, `--green-deep`,
  `--green-soft`). Primary CTAs (`.btn-primary`,`.btn-donate`) fill `--green-dark`+paper text as **pill
  buttons** (mint failed contrast, reserved for soft washes).
- **Per-page accent**: `--accent`/`-soft`/`-dark` default green; `body.page-*` overrides — green
  (home, impact, chapters, chapter profiles), gold (initiatives, gallery, past-events), teal (about,
  contact), coral (team). Accent drives kicker/underline, hero tint, band wash, card-hover, stat
  numerals, program-tile colours. (Blue retired.) Every page keeps `--accent-dark` a shade DEEPER
  than `--accent` so the kicker text sits below its underline bar (two-tone layering): green uses
  `--green-deep`, the others use `--gold-deep`/`--teal-deep`/`--coral-deep`.
- **Warm palette**: `--paper`/`--surface` warm off-white; neutral/deeper shadows; generous radii
  (`--radius-lg:18px`…`2xl:32px`).
- **Section motif**: `.section-kicker` (uppercase Nunito, `--accent-dark`, 0.16em) + 48px `--accent`
  underline under `.section-title`; hero `.eyebrow`=`--accent-soft`.

### Heroes — two treatments
- **Home only** keeps the photo hero (`.home-hero`, `images/hero-banner.jpg`, crop `center 34%`). It
  overrides base `.hero` with a lighter wash (green `--accent-dark` ~58→20→0%, `--ink` ~50→28→16%) so
  the photo reads clearly while the left keeps enough darkening for white text. (Banner is real BFBL
  signage.)
- **All 8 interior pages** (about, impact, team, ongoing-initiatives, contact, past-events, gallery,
  chapters DIRECTORY) use **`.hero-editorial`** — a photo-less accent COLOUR-FIELD (directional
  `--accent-dark`→ink gradient + faint dot-grid + top-left glow), keyed per-page accent. No image →
  `min-height:clamp(420px,48vh,560px)` + `height:auto` + `overflow:visible` so it grows to fit content.
  HTML class is `hero hero-editorial`.
- **Chapter-PROFILE pages** keep their own photo hero (`.chapter-hero`) WHEN the chapter has a real
  `photos[0]`; `renderChapterProfilePage()` sets `--hero-img` to it. `.chapter-hero` overrides the base
  `.hero` wash with a LIGHT one (accent 36→12→0%, ink 54→30→14%) so the chapter's own photo reads
  clearly. **Chapters with NO real photo get `.chapter-hero--editorial`** (a photo-less accent
  colour-field, same recipe as `.hero-editorial`) instead of falling back to the shared `hero-banner.jpg`
  — whose printed wordmark bled through the light wash and made every photoless chapter look identical.
  The locator map carries identity in both cases. A faint **locator MAP + dot** (`chapterLocatorConfig` +
  `.chapter-hero-locator`/`.hero-locator-map`/`.hero-locator-dot`, hidden on mobile) shows each
  chapter's OWN region outline from `images/maps/`: FL chapters→`florida.svg` (dot %s mirror
  `FLORIDA_MAP_PINS`); `new-york.svg`/`virginia.svg` (US-state outlines); `russia.svg`/`turkey.svg`
  (country paths). Each region SVG fills the box edge-to-edge so `left/top:%`==map %; dot % is
  **projected from the city's real lat/lng** (see map-projection note below); container `aspect-ratio`
  matches the SVG's bbox.
- Base `.hero` (accent wash + ink + scrim + `--hero-img`, fixed `height:clamp(560px,62vh,700px)`,
  mobile→auto) backs `.home-hero`/`.chapter-hero`; `.hero-editorial` overrides background/height. Plain
  `.hero` falls back to `images/hero-bg.avif`.

### Components & hard rules
- **Hover feedback signals CLICKABILITY — and ONLY that** (HARD user rule: a non-clickable element must
  never glow/lift/change on hover). Hover lift (`translateY`+shadow) is reserved for whole-card LINKS:
  `.chapter-card`, `.chapter-leadership-card`. Flat (no hover): `.service-card`, `.card`,
  `.partner-strip` logos, all member cards (`.officer-card`/`.leader-card`/`.team-member`/`.person-card`).
  Clickable children inside a flat card keep their own hover.
- **No decorative top/left "lines" on blocks** (HARD rule): removed `.service-card::before` top strip
  and `.chapter-card.card-edge-*` left spines; accent carried by coloured numeral / data-driven pill.
- **Editorial stat band** (`.impact-band`): big Nunito numerals (`--accent-dark`, 900, `tabular-nums`
  so the count-up doesn't jitter) + hairline dividers on soft accent wash; Home+Impact use the `stats`
  array. Dividers (`border-left`) are scoped to the desktop 5-up row (`@media min-width:901px`) — on
  stacked/2-col layouts the numeral carries the accent (a left spine there would break the no-lines
  HARD rule). Grid laddering: 5 (≥901px) → 3 (≤900) → 2 (≤680 and ≤440); never 1-col.
- **Program tiles** (`.service-card` in `.service-grid`): coloured `.service-number` (bare oversized
  numeral) cycling green/gold/coral/teal via `:nth-child(4n+…)`; 3-up desktop.
- **`.cards-grid--feature`**: UNIFORM grid (`auto-fit minmax(300px,1fr)`, equal width/height; cards
  flex-column). Used on Home chapters preview, Impact Seniors/Kids/Donations, Initiatives
  `#fundraiser-grid`, Past-events.
- **Editorial dark beats** — `.band--ink` sections with `.editorial-quote` (big quote glyph ::before)
  and/or `.band-figure` (oversized accent numeral): founder quote on Home, "3,500+" on About, "40+" on
  Team, dark closing CTAs on Impact/Initiatives/Chapters/Past-events. Bands: `.surface-band`
  (accent-soft 62%), `.band--tint`, `.band--ink`.
- **Gallery** = dense mosaic (`.photo-gallery-grid` + `.g-feature`/`.g-wide`/`.g-tall` cadence + hover
  `<figcaption>`), built in `renderGalleryImages`.
- **Chapters directory** = uniform grid (founding chapter just tinted via `.chapter-card--feature`).
  Status pill on EVERY card (`.status-badge`: true `999px` pill, uppercase `--font-label`;
  `chapterStatusBadgeMarkup`: founding→"Founding Chapter", else `chapter.status`||"Active"); lead name
  once ("Led by", `chapterLeadPeopleText`) + `.chapter-card-go` "View chapter →". `.chapter-card-desc`
  is `-webkit-line-clamp:3` so cards don't stretch unevenly. Chapter cards ARE links → keep hover lift.
  (Dead `card-edge-*` classes removed from `chapterDirectoryCardMarkup`.)
- **Chapter location maps** (chapters.html "Where We Are"): two self-contained inline-SVG maps with
  status-coloured pins — `images/maps/florida.svg` and `images/maps/world.svg` (both PD, recoloured
  mint). **No third-party map lib/tiles → no CSP change, same-origin** (deliberately NOT
  Google/Mapbox/Leaflet). `renderChapterMaps()` renders pins from percent tables
  `FLORIDA_MAP_PINS`/`WORLD_MAP_PINS` (chapters carry no geo in Firestore, so hardcoded like
  `stats`/`FOUNDERS`); each pin resolves name/status/href LIVE via `chapterById()`. Image fills
  `.map-frame` edge-to-edge so `left:X%`==X% of map. Pin classes **`.geo-pin`/`.geo-pin-dot`/`.geo-pin-label`**
  — MUST NOT reuse `.map-pin` (dead legacy teardrop component ~line 1198+ that hijacks markup).
  - **Map-projection note (how pin %s are derived):** pin positions are PROJECTED from each city's real
    lat/lng, not eyeballed. `florida.svg` (+ `new-york.svg`/`virginia.svg`) are equirectangular over the
    region's bounding box → `x%=(lng-lngW)/(lngE-lngW)`, `y%=(latN-lat)/(latN-latS)`, then mapped into the
    SVG via its path bbox vs viewBox (each has ~5% padding). `world.svg` (and its crops `russia.svg`/
    `turkey.svg`, which share its coordinate space) is **Miller cylindrical**: `x=X0+mx·lng`,
    `y=Y0−k·millerY(lat)` where `millerY(lat)=1.25·ln(tan(π/4+0.4·lat))`. To add/move a pin, compute the
    %s this way and visually verify against the silhouette; the four SE-Florida chapters legitimately
    cluster on the SE coast (~40 mi apart), so their labels float left and a couple of dots overlap.
  `.pin-active`=green, `.pin-launching`=gold; `.geo-pin--left` floats label inland.
- **Member rosters**: leadership as cards, volunteers as `.roster-chip` pills (`personChipMarkup`) — on
  chapter profiles and Team volunteers grid.
- **About** "Our Story" = numbered `.story-rail` timeline; **Impact** partners = `.partner-strip`
  grid of `<figure class="partner">` (84px full-colour logo + uppercase `figcaption` name — captions
  because several marks are illegible small; imgs use `alt=""`, the caption carries the name);
  **Contact** = `.contact-layout` split (left: section-header + `.contact-channel`
  rows for email/IG/LinkedIn; right: `.contact-form-card` email form) + `.help-list` "Get Involved" band.
- **Social icons = monochrome inline SVG** (`SOCIAL_ICONS` const in `script.js`, duplicated inline in
  `contact.html`); `.social-link` = 42px quiet icon button inheriting currentColor. The old full-colour
  raster logos in `images/contact us logo/` are unused (kept only by stale test files). Footer quick
  links include an **Admin** link (`admin.html`) alongside the nav pages (`renderFooter` `quickLinks`).
- Logo: `.logo img` 58px; `.logo::after` wordmark `--green-dark` Nunito. Responsive hamburger
  (`initMobileNavigation`, sets `aria-label`/`aria-expanded`). `--muted` darkened (~40% L) for AA;
  interior `.hero h1` + `.section-title`/`h2` get a mobile clamp + `overflow-wrap`.
- **A11y baseline** (keep when adding pages/components): `:focus-visible` ring = `--accent` outline +
  paper halo (works on light & dark); skip-link + `<main id>` + `<meta theme-color>` are INJECTED once
  per page by `ensureSkipLink()` in `script.js` (DRY — don't add them to each static head); `:root`
  has `color-scheme: light`. Lightbox tiles (`.clickable-image`) are `role=button tabindex=0` + Enter/Space
  (`openLightboxFrom`); both the lightbox and the email modal (`role=dialog aria-modal`) move focus in,
  trap Tab / honor Escape, and restore focus on close. `scrollBehavior()` returns `auto` under reduced
  motion (count-up + JS smooth-scroll respect it). Icon-only buttons need `aria-label` + wrap the glyph
  in `<span aria-hidden>`; status `<p>`s use `role=status aria-live=polite`; email inputs carry
  `autocomplete=email inputmode=email spellcheck=false name`. Form error/success colours: `--danger` /
  `--green-dark` (NOT `--green`/the non-existent `--red`). Headings/section titles use `text-wrap:balance`,
  long prose `text-wrap:pretty`; numerals (`.stat-number`, gallery meta) use `tabular-nums`.

## Current content snapshot
- Stats: ~**$8,450** fundraised, **2,350+** donations, **1,500+** students, **3,500+** seniors,
  **9** chapters (`stats` array in `script.js`). Chapters (registry order): AHS, Cypress Bay,
  Gainesville, Coral Springs, Miami, New York, Virginia, Russia, Turkey.
- Chapter cities (for map dots): AHS→Plantation FL, Cypress Bay→Weston/Cypress Bay FL,
  Gainesville→Gainesville FL, Coral Springs→Coral Springs FL, Miami→Miami FL, New York→NYC,
  Virginia→Virginia Beach VA, Russia→Moscow, Turkey→Istanbul. (Miami = MAST @ FIU students, not an
  official school club; public page is Miami-only. Chapter admin: adina.t.brody09@gmail.com.)
- `donateUrl` → GoFundMe ("help provide iPads to local schools"). Team is a large data-driven roster.

## Git / workflow
- Remote `github.com/Andrey199123/bytesforbetterlives`, default branch `main`. Feature work on
  branches (e.g. `petr`). **Deploy = merge/push to `main`** → Vercel Action. Firestore/Storage **rules**
  are a separate manual `npx firebase deploy --only firestore:rules,storage`.
- Commit only when asked. Footer: `Co-Authored-By:` the Claude model doing the commit, e.g.
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

## Conventions
- **GLOBAL RULE — never render an empty section.** Any data-driven section must hide itself
  (`display:none`) when it has nothing to show — no bare headings over empty grids. Done for
  `#drives-section`, `#chapter-highlights-section`/`#chapter-stats-section`/`#chapter-partners-section`.
  Gate every new data-driven section on having content.
- Keep it vanilla — no frameworks/build tooling. Match surrounding style.
- Change **nav** → `navItems`; **stats** → `stats` array (both `script.js`).
- Change **content** → **Firestore** via per-tab admin pages or Admin SDK (`tools/firestore.mjs`), NOT
  `data.js`.
- Change a **chapter page** → layout in `ensureChapterProfileLayout()`; per-chapter content via
  `chapter-pages-admin.html` (full) or `chapter-admin.html` (scoped) → both write `chapterContent/{id}`.

## Firebase (live)
Project `project-686d62b7-14f5-43c7-acc`. Firestore + Auth + Storage as BACKEND (host = Vercel).
Storage bucket **`project-686d62b7-14f5-43c7-acc.firebasestorage.app`** (in `firebase.js` — NOT
`.appspot.com`; the wrong value caused upload hangs).

**Live source of truth = Firestore, split across two collections (merged on read):**
- **`site/content`** — SHARED, full-admin write only: `categories`, `titles`, `galleryImages`,
  `gallery` [stories], `fundraisers`, `contactEmail`, `donateUrl`, `socialLinks`, a **chapters
  registry** (`[{id,pageHref}]`), unassigned `people`, `chapterAdmins` (`email→chapterId`).
- **`chapterContent/{chapterId}`** — one doc per chapter `{ page:{…detail+photos…}, members:[…] }`.
  Writable by full admins OR that chapter's approved admin (rules check `chapterAdmins`).
- **Reads merge both** (`firebase-data.js` public, `admin.js`): `data.chapters`=registry⊕each `page`;
  `data.people`=unassigned⊕all chapter members. Only WRITES are partitioned. `admin.js` `autosave()`
  routes: `"people"`→`savePeople()` (partitions into chapter docs), `"chapters"`→`saveChapters()` (page
  per doc + registry + orphan cleanup), else→`site/content`.

### Gallery data & tooling
- `gallery.html` is de-hardcoded; `renderGalleryImages()` renders from `data.galleryImages` into
  `.gallery-locations`.
- **`galleryImages` entries are objects** `{src, alt}` + optional ingested metadata: `takenAt` (ISO
  EXIF date), `gps{lat,lng}`, `camera`, full flattened `exif`, `locationName` (reverse-geocoded). Legacy
  bare path strings still normalized. Public render needs only `src`/`alt`/`takenAt`/`locationName`.
- **Grouped into LOCATION SECTIONS**: bucket by `locationName`; a no-`locationName` photo folds into a
  section when its `takenAt` is within **±2 days** of a located photo (closest wins), else a final "No
  location" section. Newest-event-first; each section is one `[data-lightbox-group]`.
  `.gallery-location`/`-title`/`-meta`.
- **Tooling** (Node, key-less ADC like `tools/firestore.mjs`; deps `sharp`+`exifr`, not deployed; all
  default to dry-run, add `--commit`):
  - `tools/ingest-gallery.mjs <folder>` — matches ORIGINALS to EXISTING entries by content (dHash),
    uploads originals (EXIF intact) + writes full metadata, REPLACING matched entries in place.
  - `tools/add-gallery.mjs <folder> [--dup N] [--alt text]` — for NEW photos: dHashes each, drops
    near/exact dupes within the batch AND any matching an existing entry (`≤ --dup`, default 10; re-runs
    safe), parses EXIF, uploads, APPENDS survivors.
  - `tools/geocode-gallery.mjs` — clusters GPS entries by proximity, reverse-geocodes each cluster
    (OSM Nominatim, in Node) into `locationName`.
  - NOTE: iOS strips **only GPS** (not date/camera) on AirDrop/Messages/share-sheet, so many originals
    have `takenAt` but no `gps` — expected.
- Public-side TODO: dynamic Team sections for new `categories`; admin editors for gallery stories /
  site settings. (Fundraisers admin exists.)

### Public read & auth/roles
- **Public read** — `firebase-data.js` (classic script on every page, before `script.js`) fetches
  `site/content` AND the `chapterContent` collection via Firestore REST, merges into `window.BFBL_DATA`,
  sets `window.BFBL_DATA_READY`. Falls back to `data.js` if empty/unreachable (3s).
- **Auth** — Google sign-in. **Full admins** edit everything: `ADMIN_EMAILS` in `firebase.js` =
  `firestore.rules` `isFullAdmin()` list (keep in sync). **Chapter admins**: `site/content.chapterAdmins`
  (managed in Structure tab) edit ONLY their `chapterContent/<id>` (page+members), enforced by
  `isChapterAdminFor()`. On login `admin.js` routes chapter admins to `chapter-<id>-admin.html` (scoped;
  `SCOPE_CID` gates writes) and full admins away. Sign-out (`#sign-out`) → `signOut()` +
  `location.replace("admin.html")`. **`storage.rules`** = explicit admin email list only (can't read
  chapterAdmins map), so a chapter admin can't upload FILES unless their email is added there.

### Admin = one page per tab
`admin.js` SDK + shared `admin.css`. Tabs are links between pages (not in-page switching). `admin.html`
is the chapter-picker landing (lists chapters live, each → `chapter-<id>-admin.html`). All pages load
the same `admin.js`; every `render*()`/listener is null-guarded (`on(id,…)`) so each page renders only
its section. Google login → **auto-saving** (debounced merge-writes). Add a tab: new `*-admin.html`
(copy shell, swap active link + section) + a guarded `render*()`.
- **Members** — 3-per-row cards: name, **Title** dropdown (`titles`), **Category** dropdown
  (`categories`), **Board of Directors** checkbox (`person.execBoard`; reveals free-text **board title**
  `execTitle` + **board bio** `execBio`, both type-in not dropdown). No real photo → initials avatar.
  Board members render `execTitle`/`execBio` publicly. Uploads guarded <10 MB + **raster only**
  (`isRasterImage()`, SVG rejected).
- **Gallery** — bulk upload `galleryImages` via `.upload-dropzone` (`#gallery-dropzone`,
  click+drag-drop, `uploadGalleryFiles()`, per-file >10 MB skip) / remove; thumbnails →
  `openAdminLightbox()`. Member photo upload uses same dropzone (`uploadMemberPhoto()`).
- **Chapters** — drag-drop board (column per chapter + Unassigned + **Board of Directors**). Sub-zones
  = member categories. Dropping into chapter X's "<Category>" sets `person.chapter=X` AND
  `person.roles=[categoryId]`. Each chip shows role under the name as an editable control: title
  dropdown (→`title`) or typed board-title (→`execTitle`). Board column is a **non-exclusive** flag
  (`execBoard=true`, doesn't touch chapter/category); ✕ removes.
- **Chapter Pages** — one club at a time via `#chapter-pages-pick` dropdown (`renderChapterPages`
  filters; `data-i` still indexes full `chapters` via `chapters.indexOf(c)`). Per-chapter card editor:
  **initiatives editor FIRST**, then name, location, status, statusTag, Instagram, description,
  `contactEmail`, `joinUrl`, impact stats, partners, highlight photos. **Stats/partners/initiatives are
  STRUCTURED row editors** (`statsEditorMarkup`/`partnersEditorMarkup`/`initiativesEditorMarkup`,
  `.admin-list`, `+ Add`/Remove — not textareas). An **initiative** =
  `{title,description,url,image(flyer),startDate,endDate,startTime,endTime}` (dates `<input type=date>`
  optional range; times optional; flyer → Storage `initiatives/<id>/…` via `uploadInitiativeFlyer`).
  Highlight photos → Storage `chapters/<id>/…` → `chapter.photos`. All persist via `chapterPageFields()`
  (copies every chapter field except `id`). **Initiatives appear in TWO places**: (1) "Current
  initiatives" first section on the chapter profile (`#chapter-initiatives-section`,
  `initiativeCardMarkup(it,chapter,{hideChapter:true})`, hidden when none); (2) aggregated across clubs
  on `ongoing-initiatives.html` (`renderInitiativesPage`, each tagged with club name). Cards show flyer
  (clickable→lightbox) + schedule line (`initiativeWhen`, e.g. "Jun 14, 2026 – Jun 16, 2026 · 3:00 PM –
  5:30 PM").
- **Initiatives** (`initiatives-admin.html`, full) — structured add/edit/remove for a club's
  `initiatives` via `#initiatives-pick` dropdown (`renderInitiativesAdmin`+`initiativesChapter()`,
  shared with scoped chapter-admin tab). Auto-saves to chapter `page`.
- **Fundraisers** (`fundraisers-admin.html`, full) — `renderFundraisers()` add/edit/remove for
  `site/content.fundraisers`: title, "Led by", description, donate URL, **Chapter** dropdown
  (`chapterId`/`chapterHref`), image (dropzone → Storage `fundraisers/…`).
- **Structure** — add/remove/**rename** `categories` + `titles`. (Chapter editing REMOVED from this tab;
  `renderStructure` null-guards `chRoot`.) Renaming a category edits `label` only (id stable). Titles
  are plain strings on `person.title`, so renaming propagates; `migrateTitles()` folds free-text titles
  into options on load. Also has **Chapter admins** editor (`renderChapterAdmins()` → `chapterAdmins`).
- **`chapter-<id>-admin.html`** (scoped editor per chapter) — three in-page tabs **Page / Initiatives /
  Members** (`[data-admin-tab]`/`[data-tab-panel]`; reuses `renderChapterPages`/`renderPeople` filtered
  by `SCOPE_CID`; Chapter/Board controls hidden; saves only `chapterContent`). Chapter admins CANNOT
  edit the Name (input omitted when `SCOPE_CID` set). Initiatives tab present → `renderChapterPages`
  omits its inline textarea. Each page sets `<body data-admin-chapter="<id>">` (admin.js reads as scope
  for full admins; chapter admins scoped by email via rules). Admin `<label>`s are `display:grid` — wrap
  inline `<code>` text in one `<span>`.
  - **Generated from `chapter-admin.html`** via:
    `for f in chapter-*.html; do b=${f#chapter-}; b=${b%.html}; case "$b" in admin|pages-admin|*-admin) continue;; esac; sed -e "s|<body>|<body data-admin-chapter=\"$b\">|" chapter-admin.html > "chapter-$b-admin.html"; done`
    **Full checklist to add a NEW chapter `<id>`** (all surfaces — miss one and the chapter half-exists):
    (1) public `chapter-<id>.html` stub (copy a sibling; set `data-chapter-id` + title + canonical
    subdomain); (2) `chapter-<id>-admin.html` (re-run the sed loop above); (3) Firestore registry entry
    `{id,pageHref}` in `site/content.chapters` AND a `chapterContent/<id>` doc `{page,members}` (use
    `tools/firestore.mjs`); (4) map pin — FL chapters → `FLORIDA_MAP_PINS` + `chapterLocatorConfig` FL
    table in `script.js`; others → `WORLD_MAP_PINS` + a region SVG; (5) bump the `stats` "Chapters"
    `raw` count in `script.js` AND any hardcoded count prose (e.g. `index.html`, `team.html`);
    (6) `sitemap.xml` `<loc>` for the subdomain; (7) `vercel.json` subdomain redirect PAIR (.net + .org)
    — without it the canonical/sitemap subdomain URL just redirects to the homepage; (8) add the chapter
    lead to the chapter doc's members + `page.leadPeople`; (9) optional: mirror into the `data.js` seed
    fallback. Grant a chapter admin via `site/content.chapterAdmins` (key = the **lowercased** Google
    email, to match `firestore.rules`); add that email to `storage.rules` too ONLY if they must upload
    photos (existing chapter admins are NOT in `storage.rules`, so they can edit text/members but not
    upload files).

### Rules & security
- **Rules** — `firestore.rules`/`storage.rules` (wired into `firebase.json`). Deploy
  `npx firebase deploy --only firestore:rules,storage` (compiles first → syntax errors fail loudly).
  - **Verified-identity gate** `isVerified()`: `email_verified==true` AND
    `sign_in_provider=='google.com'`. `isFullAdmin()`/`isChapterAdminFor()`/`canUpload()` build on it.
    **Keep only Google sign-in enabled in the console.**
  - **Firestore writes**: `site/content`=full admin; `chapterContent/{cid}`=full admin or that chapter's
    admin (constrained `keys().hasOnly(['page','members'])`, `members.size()<=200`). Catch-all
    `{document=**}` is default-deny read; only `site/content`+`chapterContent` are public-read.
  - **Storage writes**: verified admins, <10 MB, raster only (`image/(png|jpeg|jpg|gif|webp|avif)`, SVG
    excluded). `admin.js` mirrors via `isRasterImage()`/`notRasterImage()`.
- **HTTP security headers** (`firebase.json` `headers` on `**`): CSP, `X-Frame-Options:DENY`,
  `X-Content-Type-Options:nosniff`, `Referrer-Policy`, HSTS, `Permissions-Policy`. CSP allowlists
  `gstatic`/`apis.google.com`, `*.googleapis.com`/`*.firebasestorage.app`, `formsubmit.co`, Firebase-Auth/Google
  hosts — keep in sync when adding any third-party script/endpoint. `frame-ancestors 'none'`.
- **URL/XSS** — `escapeHTML()` for HTML/attr; for any data-driven `href` use **`safeUrl()`** (scheme
  allowlist http(s)/mailto, else `#`) wrapped in `escapeHTML`. Blocks `javascript:`/`data:` in
  admin-set fields. All `target="_blank"` carry `rel="noopener noreferrer"`.
- **Email form anti-abuse** (`chapters.html` + `submitEmailForm`): honeypot (`#company-website`/`_honey`),
  1 msg/min localStorage cooldown, 4000-char cap. Client-side only — server relay/rate-limit + App Check
  + GCP budget cap remain as console-side hardening.

### Updating content as Claude (no browser)
`tools/firestore.mjs` (key-less gcloud ADC; one-time
`gcloud auth application-default login` + `… set-quota-project project-686d62b7-14f5-43c7-acc`):
```js
import { getContent, patchContent } from "./tools/firestore.mjs";
const d = await getContent();              // read live
await patchContent({ people: d.people });  // merge-write (won't clobber other fields)
```
Run with `node`. Always read-modify-write. `package.json` (firebase-admin) + `node_modules/` exist
only for tooling; not deployed.

## History note
~23 stale dev-changelog/test `.md` files (+ an outdated `readme.md`) were deleted in favor of this
file. No human-facing README currently — write a fresh one if a public project description is wanted.
