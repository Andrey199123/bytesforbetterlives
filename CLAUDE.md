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
- **Hosting = Vercel** (the intended host). The static files are deployed by a **GitHub Actions
  workflow** (`.github/workflows/vercel-deploy.yml`) that runs on **every push to `main`** (and manual
  `workflow_dispatch`): it `vercel pull` / `vercel build --prod` / `vercel deploy --prebuilt --prod`
  using repo secrets `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`. So **file/code edits go live
  by committing + pushing to `main`** (auto-deploy via CI) — there is no manual deploy command for the
  files. Vercel's OWN git integration is intentionally **disabled** in `vercel.json`
  (`git.deploymentEnabled:false`, `github.enabled:false`) so deploys happen ONLY through the Action, not
  twice. NOTE: **content** edits (Firestore via admin) are live instantly; **file/code** edits need the
  push-to-`main` deploy.
- **Firebase is still the BACKEND** (Firestore + Auth + Storage), just **not the host** anymore.
  `firebase.json` + `.firebaserc` (project `project-686d62b7-14f5-43c7-acc`) remain for **rules/Storage
  deploys** (`npx firebase deploy --only firestore:rules,storage` — see the Firebase section) and the old
  Firebase Hosting URL (`https://project-686d62b7-14f5-43c7-acc.web.app`) may still resolve, but Vercel is
  the canonical site. `firebase-tools` is a local devDependency; the CLI auths via gcloud ADC (no
  `firebase login`). Do NOT run `firebase deploy --only hosting` for normal file changes — push to `main`.

## Architecture — content is data-driven
The HTML pages are thin shells with **empty containers** that `script.js` fills at runtime from
`data.js`. Edit data/logic, not the rendered markup.

- **`data.js`** — site content. Top-level keys: `contactEmail`, `donateUrl`, `socialLinks`,
  `fundraisers`, `drives`, **`people`**, `chapters`, `gallery`.
  - **`drives`** — current donation drives, rendered by `driveCardMarkup` into `#drives-grid` in the
    **"Current drives"** section on `ongoing-initiatives.html` (sits right under "Current fundraisers";
    `renderInitiativesPage` hides `#drives-section` when the array is empty). Each: `{id, title, status,
    description, url, image, alt}` — `status` shows as a `.drive-status` pill; a `url` makes the CTA a
    "Donate" link, otherwise it's "Get Involved" → contact.html. Live source = Firestore `drives`.
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
    The team-page sections all come from `data.people`
    (except Founders, which come from the hardcoded `FOUNDERS`). (The homepage no longer has an
    "All Members" roster section — it was removed; the `[data-members-slider]` renderer in `script.js`
    is null-guarded and simply no-ops without it.)
  - **Public display title** = `memberDisplayTitle(person)` in `script.js`: exec-board members
    (`person.execBoard`) show their `execTitle`; everyone else shows **"Title ⋅ Chapter Name"** when
    they have a `chapter` (just the title otherwise). Applied via `withDisplayTitle()` and in the
    team/homepage member renders. **EXCEPTION: chapter profile pages show the plain `person.title` only**
    (no "⋅ Chapter Name", no exec title) — you're already in that chapter's context
    (`renderChapterMembersByCategory`).
  - Team page **"Board of Directors"** section renders **only members flagged `person.execBoard === true`**
    in the admin (derived as `data.execBoard` in `deriveRoles()`) — NOT a heuristic over
    leadership/design. The homepage `#executive-board-preview` uses the same `data.execBoard` list.
    Members not flagged (including `design`-role people who aren't on the board) stay
    in the registry but get no separate team section. Team section order:
    Board of Directors → Chapter leadership → Volunteers → **Legacy** (the Founders section, moved to
    the bottom, titled "Legacy", no description). Old "Club Officers" section removed.
  - Team page **"Chapter leadership"** section = **one block per chapter, including AHS**
    (`chapterLeadershipBlockMarkup`, `.chapter-leadership-card`) listing **all** of that chapter's
    `leadership`-role members (`person.chapter === id` & `roles` includes `"leadership"`), not just a
    single designated lead. (AHS leaders may also appear in the Board of Directors section if flagged
    `execBoard` — that's expected.)
  - **Hover feedback signals CLICKABILITY — and ONLY clickability** (hard user rule: a non-clickable
    element must never glow/lift/change on hover). The hover lift (`translateY`+shadow) is reserved for
    whole-card **links**: `.chapter-card` (directory) and `.chapter-leadership-card` (an `<a>`). Everything
    that is NOT itself a link stays completely flat: `.service-card` (info tiles), `.card`
    (program/fundraiser tiles — they contain buttons/clickable images, but the card itself isn't a link),
    `.partner-strip` logos (now full-colour, no grayscale→colour hover), and all member cards
    (`.officer-card`, `.leader-card`, `.team-member`, `.person-card`). Clickable children inside a flat
    card (`.clickable-image`, `.btn`, carousel arrows) keep their own hover. When adding any block, give it
    a hover state IFF the whole block is clickable.
  - Members carry a `chapter` (chapter id) and a category (`roles[0]`) set via the admin Chapters
    board. **Public chapter pages list their members grouped by category** (`renderChapterMembersByCategory`,
    headings from `categories`). `firebase-data.js` fetches `categories`/`titles` too, so the public
    category labels/order match the admin. (The old `tier` field is retired.)
  - Chapter pages list *which* people lead each chapter in `chapters[].leadPeople` (by name), but
    each lead's displayed **photo, bio, and canonical name are resolved from `data.people`** via
    `resolvePersonRef()` / `personByName()` in `script.js`. So a person's profile lives only in the
    registry; chapters just reference them. Add any new chapter lead to `data.people` too.
  - Net: every person displayed anywhere (team sections, homepage Board of Directors preview,
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
  - **Lightbox**: any `.clickable-image` opens the shared popup (injected once by `initLightbox`).
    Wrap a set in a `.carousel-container` or `[data-lightbox-group]` to enable prev/next across the
    group (each gallery location section is its own group). Controls are **inline-SVG icons** (a
    centred `×` close + chevron nav) in frosted circular buttons on a blurred backdrop — NOT text
    glyphs (a lowercase "x" rendered off-centre). A bottom `.lightbox-info` pill shows the photo's
    **capture date · location** (`.lightbox-caption`, read from the tile's `data-taken`/`data-location`)
    then the `N / M` counter. Gallery tiles also expose the date on hover via the `<figcaption>` +
    a native `title` tooltip.
  - **Story flip cards** (home "Photo Stories" preview, `.story-card`): tap flips photo → story text.
    The faces are `position:absolute`, so `toggleStoryCard`/`syncStoryCardHeight` **grows the card to the
    back face's `scrollHeight` when flipped** (and clears it on flip-back/Escape) so the text is never
    clipped; `.gallery-grid` is `align-items:start` so a flipped card doesn't stretch its row-mates.
  - `ensureChapterProfileLayout()` **injects the hero/layout into the lightweight
    `chapter-*.html` stub pages** (which carry only `data-chapter-id`). Edit the chapter template
    here and chapter data in `data.js` — not the stub HTML.
  - **Chapter profile pages** (`renderChapterProfilePage` + `ensureChapterProfileLayout`): core
    sections are (1) **Chapter members** — the people assigned to that chapter
    (`person.chapter === chapter.id`), grouped by category (`roles[0]`, labelled from
    `data.categories`) via `renderChapterMembersByCategory()`; and (2) **Chapter highlights** — the
    `chapter.photos` grid. Plus **optional, conditionally-rendered** sections that only appear when
    the chapter has data for them (each hidden via `display:none` otherwise):
    - **Impact stats** (`chapter.stats` = `[{value,label}]`) → `#chapter-stats-section` stat row.
    - **Community partners** (`chapter.partners` = `[string]`) → `#chapter-partners-section`.
    - Hero CTAs build conditionally: always **"Support this Chapter"** (`chapterSupportUrl()`), plus
      **"Get Involved"** (`chapter.joinUrl`), **Instagram** (`chapter.instagram`), and
      **"Email the Chapter"** (`chapter.contactEmail`) when those fields are set.
    All these fields live on the `chapterContent/{id}.page` doc, edited in the **Chapter Pages** admin
    (and `chapter-admin.html`). Members show "Member roster coming soon." until assigned.
- **`styles.css`** — single stylesheet. Colors are **OKLCH custom properties** in `:root`.
- **`images/`** — organized into subfolders (e.g. `images/work with seniors/`, `images/donations/`,
  `images/team/`, `images/ongoing initiatives/`, `images/our impact/`). Note: some folder/file
  names contain spaces.

## Pages (current)
`index.html` (Home), `about.html`, `impact.html`, `ongoing-initiatives.html`, `team.html`,
`chapters.html`, `chapter-{ahs,coral-springs,cypress,gainesville,new-york,russia,turkey}.html`,
`contact.html`, `past-events.html`, `gallery.html` (standalone photo gallery — a grid of all
activity photos; clicking one opens the lightbox).
Admin pages (noindex, not in navbar): `admin.html` (chapter-picker login landing),
`members-admin.html`, `gallery-admin.html`, `chapters-admin.html`, `chapter-pages-admin.html`,
`structure-admin.html` (full admins), and **per-chapter scoped editors `chapter-<id>-admin.html`**
(one per chapter: `chapter-ahs-admin.html`, `chapter-cypress-admin.html`, …). `chapter-admin.html` is
the **template** they're generated from (and a generic `?c=<id>` fallback).

Navbar order: About · Impact · Initiatives · Team · Chapters · Gallery (no "Home" tab). The
"Initiatives" tab is `ongoing-initiatives.html` (display label renamed to "Initiatives"; filename kept).
Chapter display names: AHS = "AHS Chapter" (still labelled the "Founding Chapter" eyebrow on the
chapters directory summary card), `turkey` = "Turkey Chapter" (Instagram handle `bfbl_turkiye` kept).

- **`impact.html` is consolidated**: it holds the former "work with seniors", "work with kids",
  "donations", and "partners" content as in-page sections with anchors `#seniors`, `#kids`,
  `#donations`, `#partners`. (The old `#gallery` "Stories behind the photos" `#gallery-grid` section
  was **REMOVED** — it re-told the same initiatives as the detailed program cards and duplicated the
  standalone `gallery.html`; `renderGalleryPage()` is null-guarded so it just no-ops now. Home's "View
  Full Gallery" CTA now points to `gallery.html`, not `impact.html#gallery`.)
- ⚠️ **Do NOT recreate** `donations.html`, `work-with-seniors.html`, `work-with-kids.html`, or
  `our-impact.html` — they were intentionally removed and merged into `impact.html`.
- `test-image-loading.html`, `test-preservation.html`, `test-preservation.js`,
  `test-image-paths.js` are leftover image-path test harnesses from an earlier fix effort
  (not part of the live site; possibly stale).

## Design / branding
**2026-05-31 full redesign** — "warm + bold blend" inspired by DECA + youthteaching.org (Ustart),
mint-led. Goal: read as intentional/editorial, not AI-template.
- **Typography**: `--font-display` = **Nunito** (rounded geometric, bold — a free stand-in for DECA's
  licensed *Gotham Rounded*; headings are `font-weight: 800`); `--font-body` = **Mulish** (clean
  geometric, stand-in for *Gotham*); `--font-label` = Nunito (kickers/buttons/nav, uppercase). (The
  earlier Schibsted Grotesk/Afacad pair and a brief Fraunces serif experiment are gone — the user
  rejected the serif.)
- **Signature brand color = "SY Glacier Mint" `#B4D3AD`** (`--green`; `--green-dark: #4F7A46`,
  `--green-deep` for confident text, `--green-soft`). Primary CTAs (`.btn-primary`, `.btn-donate`) now
  **fill with `--green-dark` + paper text** as **pill buttons** (`border-radius: 999px`) — the pale mint
  failed contrast (~1.6:1), so mint is reserved for soft washes.
- **Per-page accent system**: `--accent` / `--accent-soft` / `--accent-dark` default to **green**
  (mint-led); `body.page-*` overrides per page — **green** (home, impact, chapters, chapter profiles),
  **gold** (initiatives, gallery, past-events), **teal** (about, contact), **coral** (team). Vivid
  `--gold`/`--coral`/`--teal` (+ `-soft`/`-dark`) added. Accent drives kicker/underline, hero tint,
  band wash, card-hover, stat numerals, and program-tile colours. (Blue is retired as an accent.)
- **Warm palette**: `--paper`/`--surface` are warm off-white (hue ~92, was cold blue); shadows are
  neutral/deeper (`--ink`-tinted, was blue); radii are generous (`--radius-lg: 18px` … `2xl: 32px`).
- **Section motif**: `.section-kicker` (uppercase Nunito, `--accent-dark`, 0.16em tracking) + a 48px
  `--accent` underline under each `.section-title`; hero `.eyebrow` uses `--accent-soft`.
- **Hero** (2026-05-31 de-vibe pass): heroes are now **split into two treatments**, because the old
  scheme — the SAME `images/hero-banner.jpg` photo on every non-chapter page, distinguished only by tint,
  with the "BYTES for Better Lives" wordmark printed on the banner bleeding through the wash — was the
  single loudest "AI-template" tell (an audit scored every interior page ~5.5–7 largely on it).
  - **Home only keeps the photo hero** (`.home-hero`, `images/hero-banner.jpg`, crop `center 34%`,
    compressed from `IMG_7470.JPG` 4.7 MB → ~540 KB via `sips`). `.home-hero` now **overrides** the base
    `.hero` background with a **lighter treatment** (per user request to "decrease the green / make the
    image clearer"): green `--accent-dark` wash cut to ~58→20→0% and the `--ink` layer eased to
    ~50→28→16% (was 80→68→64%), so the photo reads clearly while the left side keeps enough darkening for
    the white hero text. (The banner the students hold IS real BFBL signage, not a template wordmark.)
  - **All 8 interior pages** (about, impact, team, ongoing-initiatives, contact, past-events, gallery, and
    the chapters DIRECTORY) use **`.hero-editorial`** — a **photo-less accent COLOUR-FIELD** keyed to the
    page accent (green/gold/coral/teal): a directional `--accent-dark`→ink gradient + a faint light
    dot-grid texture + a soft top-left glow. Unlike the photo hero (FIXED height + `overflow:hidden` to keep
    the image a constant size), the editorial hero has no image to clip, so it uses
    `min-height: clamp(420px,48vh,560px)` + `height:auto` + `overflow:visible` and **grows to fit its
    content** — a fixed height was cropping the taller heroes (Impact: 2-line headline + 3-line copy + 2 CTAs).
    The per-page accent IS the hero identity now, so the 8 pages are visually distinct with no shared photo
    and no bleeding wordmark. (Swapped in HTML: those pages' hero class is `hero hero-editorial`, replacing
    the old `hero hero-home-banner` / `chapter-hero`.)
  - **Chapter-PROFILE pages keep their own photo hero** (`.chapter-hero`, unchanged) —
    `renderChapterProfilePage()` overrides `--hero-img` to that chapter's `photos[0]` + a faint name
    monogram (`.chapter-hero-mark`). These were already the least-template heroes (page-specific photo).
  - Base `.hero` (the photo treatment: accent wash + ink layer + scrim + `--hero-img`, fixed
    `height: clamp(560px,62vh,700px)`, mobile relaxes to `auto`/`min-height`) still backs `.home-hero` and
    `.chapter-hero`; `.hero-editorial` overrides its `background`/`height`. Plain `.hero` falls back to
    `images/hero-bg.avif`. (Earlier per-page-photo/crop and `.hero-bignum` watermark schemes were tried and
    reverted — the bignum read as a glitch on the busy photo. The colour-field approach replaces the
    "distinct per-page photography" idea that was asset-gated by the mostly-portrait photo pool.)
- **Editorial stat band** (`.impact-band`): de-chromed cards → big Nunito numerals (`--accent-dark`,
  weight 900) with hairline dividers on a soft accent wash. Home + Impact use the `stats` array in
  `script.js` (~line 501).
- **Program tiles** (`.service-card` in `.service-grid`): colored number chip cycling
  green/gold/coral/teal via `:nth-child(4n+…)`; the grid is 3-up on desktop. (The old `::before` **top
  accent strip was REMOVED** — per the user rule against decorative top/left "lines" on blocks; the
  coloured numeral carries the accent now. Service tiles are also flat on hover — they're not links.)
- **Bands**: `.surface-band` (accent-soft wash, strengthened to 62%); `.band--tint` / inverted `.band--ink`
  utilities available.
- Logo: `.logo img` is `height: 58px`; `.logo::after` wordmark is now `--green-dark` Nunito. Responsive
  hamburger (`initMobileNavigation`). No back-to-top, no hero proof-pills.
- **Redesign QA fixes** (after a per-page grading pass): (1) **Avatars** never show empty wells —
  `.avatar-initials` is a confident `--green-dark` fill + paper text, and `initImageFallbacks` now also
  catches images that 404'd *before* its listener attached (`complete && naturalWidth===0`), fixing the
  async-render race. (2) **No orphan rows** — `.officer-grid` is `auto-fit minmax(220px,1fr)` and
  `.chapter-card` is a flex column with `.chapter-actions { margin-top:auto }` so "View Chapter" CTAs
  align. (3) **Chapter directory cards** show a status pill on EVERY card (`chapterStatusBadgeMarkup`:
  founding → "Founding Chapter", else `chapter.status` || "Active") and render the lead name ONCE
  (resolved `chapterLeadPeopleText`, "Led by" eyebrow). (4) In-page labels use the page **accent**
  (`.person-role`, `.feature-box h3`, `.kicker-small`, flip-card location icon) so teal/coral/gold show
  below the fold; `--teal` chroma bumped. (5) **Contact** page reuses the Start-a-Chapter email form
  (`submitEmailForm`, honeypot) instead of a bare mailto. (6) Fundraisers with no URL fall back to
  `data.donateUrl` ("Donate") rather than a disabled "Coming Soon" button (`fundraiserCardMarkup`).
  (7) Placeholder images replaced with real photos (About "Our Story", Initiatives "Educational
  Technologies"). (8) `--muted` darkened (~40% L) for AA; interior `.hero h1` + `.section-title`/`h2`
  get a mobile clamp + `overflow-wrap` so headings no longer clip at 390px.
- **Kill-the-template work** (iterative "AI-look" audits drove the genericness score ~7.0 → ~5.4): the
  goal was breaking the repeated "kicker → title → uniform card grid" rhythm with reusable utilities,
  applied across pages. Current pieces (in `styles.css` + render fns in `script.js`):
  - **`.cards-grid--feature`** — was an asymmetric grid (first card 4×2, rest 2-wide); **changed to a
    UNIFORM grid** (`auto-fit minmax(300px,1fr)`, equal-width cards, rows stretch to equal height) per
    user request that "blocks should be the same size and spaced nicely." Cards flex-column so a short
    bio doesn't shrink its card. Applied to: Home chapters preview, Impact Seniors/Kids/Donations,
    Initiatives `#fundraiser-grid`, Past-events. The old per-`:first-child` span overrides on
    `.service-grid` and `.chapter-card--feature` were also removed so all tiles are equal size.
  - **`.service-number`** is a bare oversized display numeral (no circle badge).
  - **Editorial dark beats** — `.band--ink` sections carrying `.editorial-quote` (big quote glyph via
    `::before`) and/or `.band-figure` (oversized accent numeral): a founder pull-quote on Home, a "3,500+"
    quote+figure on About, a "40+" stat on Team, and dark closing CTAs on Impact/Initiatives/Chapters/Past-events.
  - **Gallery** = dense-grid **mosaic** (`.photo-gallery-grid` grid + `.g-feature`/`.g-wide`/`.g-tall` size
    cadence + hover `<figcaption>`), built in `renderGalleryImages`.
  - **Chapters directory** is a uniform grid (the founding chapter is just tinted via
    `.chapter-card--feature`, NOT double-wide anymore). The status-coloured **left spines
    (`.chapter-card.card-edge-*`) were REMOVED** (no decorative left "lines" on blocks); status now shows
    via the data-driven pill (`statusClass`) only. Lead name once ("Led by") + a subtle `.chapter-card-go`
    "View chapter →" text cue. Chapter cards ARE links, so they keep their hover lift.
  - **Chapter location maps** (chapters.html "Where We Are" section, 2026-06-01): two **self-contained
    inline-SVG maps** with status-coloured pins — a **Florida** map (`images/maps/florida.svg`, a single
    state path extracted from a public-domain US-states SVG, viewBox cropped to FL's bbox, recoloured to
    brand mint) and a **world** map (`images/maps/world.svg`, the PD "World map - low resolution" recoloured
    to mint via an injected `<style>path{fill}`). **No third-party map lib / tiles → no CSP change, no API
    keys, same-origin only** (deliberately NOT Google/Mapbox/Leaflet). Pins are rendered by
    `renderChapterMaps()` from two hand-calibrated **percent-position tables** (`FLORIDA_MAP_PINS` /
    `WORLD_MAP_PINS`) — chapters carry no usable geo data in live Firestore, so positions are hardcoded like
    `stats`/`FOUNDERS`; each pin still resolves its name/status/href LIVE from `data.chapters` via
    `chapterById()`, and an id with no table entry simply gets no pin. The image fills the `.map-frame`
    edge-to-edge (NO padding) so `left:X%` == X% of the map (padding would offset edge pins); the SVG's
    transparent ocean lets the frame's accent wash show through as "sea". Pin classes are namespaced
    **`.geo-pin` / `.geo-pin-dot` / `.geo-pin-label`** — they MUST NOT reuse `.map-pin`, which is a **dead
    legacy** teardrop-pin component (lines ~1198+ in styles.css, plus an unused `renderChaptersPage()`
    `#chapter-map` SVG + a never-loaded Leaflet/OSM block) that hijacks the markup if reused. Status colour:
    `.pin-active`=green, `.pin-launching`=gold. `.geo-pin--left` floats the label inland (used for the
    east-coast S. Florida cluster, whose three pins are y-staggered so labels don't pile up).
  - **Member rosters** — leadership renders as cards, volunteers as de-carded `.roster-chip` pills
    (`personChipMarkup`): on chapter profiles (`renderChapterMembersByCategory`) and the Team volunteers grid.
  - **About** "Our Story" is a numbered `.story-rail` timeline (ordinal nodes on an accent rail); **Impact**
    partners are a grayscale `.partner-strip` ribbon (not 10 card boxes); **Contact** is a numbered
    `.help-list` ledger + the real email form (`submitEmailForm`).
  - Misc: in-page labels use `var(--accent)`; `--muted` darkened (~40% L) for AA; placeholder images swapped
    for real photos; concrete number-driven copy in several description slots; `initImageFallbacks` catches
    already-errored avatars (no empty wells; `.avatar-initials` = `--green-dark` fill).
  - **Shared-hero tell RESOLVED** (2026-05-31): the "same photo on every page" tell is gone — interior
    pages now use the photo-less per-accent `.hero-editorial` colour-field and only home keeps a (darker-
    washed) photo hero. See the **Hero** bullet above. Also removed the **duplicate program grid**: impact
    no longer renders the home `#what-we-do-grid` 01–05 service tiles (it already has the detailed
    Seniors/Kids/Donations sections), so that content lives on home only.
  - REMAINING (diminishing returns): the **section-header rhythm** (kicker → bold title → description) is
    the main remaining repeated-structure tell; finer per-page art-direction and richer interior-hero
    motifs are the next lever if pushed further.

## Current content snapshot
- Stats: ~**$8,450** fundraised, **2,350+** donations, **1,500+** students, **3,500+** seniors,
  **7** chapters (the `stats` array in `script.js` ~line 501).
- `donateUrl` → GoFundMe ("help provide iPads to local schools").
- Team is a large data-driven roster (founders + board of directors/officers + chapter leaders +
  volunteers) — not a fixed 5-person list.

## Git / workflow
- Remote: `github.com/Andrey199123/bytesforbetterlives`. Default branch: `main`.
- Feature work happens on branches (e.g. `petr`). **Deploying the site = merge/push to `main`**, which
  triggers the Vercel GitHub Action (`.github/workflows/vercel-deploy.yml`) → production. (Firestore/
  Storage **rules** are a separate, manual `npx firebase deploy --only firestore:rules,storage`.)
- Commit only when asked. Commit-message footer:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

## Conventions
- **GLOBAL RULE — never render an empty section.** Any section whose only content is data-driven must
  hide itself (`display:none`) when it has nothing to show — no bare headings over empty grids. This is
  a hard user rule applied site-wide. Already done for: `#drives-section` (initiatives),
  `#chapter-highlights-section` / `#chapter-stats-section` / `#chapter-partners-section` (chapter
  profiles). When adding any data-driven section, gate its visibility on having content.
- Keep it vanilla — no frameworks/build tooling. Match the surrounding code style.
- To change **navigation** → `navItems` in `script.js`.
- To change **stats** → `stats` array in `script.js`.
- To change **content** (members, chapters, gallery, etc.) → **Firestore** via the **per-tab admin
  pages** (`members-admin.html` etc.; `admin.html` is the chapter-picker landing) or the Admin SDK
  (`tools/firestore.mjs`), NOT `data.js` (that's only the seed/offline fallback now).
- To change a **chapter page** → layout/template in `ensureChapterProfileLayout()` (`script.js`);
  per-chapter content (details + highlight photos) via **`chapter-pages-admin.html`** (full admin) or
  **`chapter-admin.html`** (that chapter's admin) — both write the `chapterContent/{id}` doc.

## Firebase (live)
Project: `project-686d62b7-14f5-43c7-acc`. **Firestore + Auth + Storage** in use as the BACKEND
(Hosting is **no longer** the host — the site is hosted on **Vercel**; see "Tech & how to run").
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

- `gallery.html` is **de-hardcoded** — `script.js` `renderGalleryImages()` renders the gallery from
  `data.galleryImages` (the page's container is now `.gallery-locations`, not a bare grid).
  - **`galleryImages` entries are objects** `{src, alt}` plus optional ingested metadata:
    **`takenAt`** (ISO capture date from EXIF), **`gps`** `{lat,lng}`, **`camera`**, a full flattened
    **`exif`** block, and **`locationName`** (place name reverse-geocoded from `gps`). A few legacy
    entries are still bare path strings — the renderer normalizes both. The public render only needs
    `src`/`alt`/`takenAt`/`locationName`; the rest is stored for reference.
  - **The gallery is GROUPED INTO LOCATION SECTIONS.** `renderGalleryImages()` buckets each photo by
    `locationName`; a photo with no `locationName` is folded into a section when its `takenAt` is
    within **±2 days** of a located photo (closest anchor wins) — anything left lands in a final
    **"No location"** section. Sections render newest-event-first (by latest `takenAt`), "No location"
    last; each section is its own `[data-lightbox-group]`. Styling: `.gallery-location` /
    `.gallery-location-title` (accent underline) / `.gallery-location-meta` (date + count).
  - **Ingest tooling (Node, key-less ADC — like `tools/firestore.mjs`; deps `sharp`+`exifr`, not
    deployed):** `tools/ingest-gallery.mjs <folder> [--commit]` matches ORIGINAL photos to existing
    gallery entries **by image content** (dHash — filenames are generic `IMG_####`), uploads the
    originals to Storage (EXIF intact) and writes their full metadata, replacing matched entries in
    place (only ingests confident matches). `tools/geocode-gallery.mjs [--commit]` clusters
    GPS-bearing entries by proximity and reverse-geocodes each cluster (OpenStreetMap Nominatim, in
    Node — NO browser map API / CSP change) into `locationName`. Both default to a dry-run.
    NOTE: iOS strips **only GPS** (not date/camera) when photos are shared via AirDrop/Messages/share
    sheet, so many originals have `takenAt` but no `gps` — that's expected, not a bug.
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
  routes full admins away from it. **Signing out** (the shared `#sign-out` button, handled once in
  `admin.js`) calls `signOut()` then `location.replace("admin.html")`, so logout from any admin page
  returns to the chapter-picker landing rather than the signed-out state of the current editor.
  **`storage.rules`** = explicit admin email list only (Storage
  rules can't read the chapterAdmins map), so a chapter admin can't upload FILES unless their email
  is added to `storage.rules` — otherwise they set a member/chapter photo by path/URL.
- **Admin = one page per tab** (`admin.js` SDK, shared `admin.css`): **`members-admin.html`**,
  `gallery-admin.html`, `chapters-admin.html`, `chapter-pages-admin.html`, `structure-admin.html`.
  Tabs are links between these pages (not in-page switching). **`admin.html` is the chapter-picker
  login landing**: lists all chapters live (from `firebase-data.js`, so it updates as chapters are
  created/deleted), each linking to that chapter's **`chapter-<id>-admin.html`** page. **All pages load the same `admin.js`** — every `render*()` and listener is
  null-guarded (`on(id,…)` helper) so each page renders only the section it contains. Google login →
  **auto-saving** (no Save button; debounced merge-writes to `site/content`). To add a tab: new
  `*-admin.html` (copy the shared shell, swap the active tab link + section) and a guarded `render*()`.
    - **Members** — 3-per-row cards: name, **Title** dropdown (from `titles`), **Category** dropdown
      (from `categories`), **Board of Directors** checkbox (`person.execBoard`; when on, reveals a
      separate free-text **Board of Directors title** input stored in `person.execTitle` — distinct
      from the regular `title`; it's a type-in, NOT the `titles` dropdown), bio, photo path + Storage
      upload, plus a separate **Board of Directors bio** (`person.execBio`, shown only when the box is
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
    - **Chapters** — drag-and-drop board (column per chapter + Unassigned + **Board of Directors**).
      Each chapter's sub-zones are the **member categories** (from the Structure tab / `categories`),
      matching how the public chapter page groups members. Dropping a member into chapter X's
      "<Category>" zone sets `person.chapter = X` **and** `person.roles = [categoryId]`. Each chip
      shows the member's **role under their name as an editable control**: a **title dropdown**
      (from the Structure `titles` list → sets `person.title`) or a **typed board-title field** on
      Board of Directors chips (→ `person.execTitle`); both save to Firestore. The **Board of Directors** column is a
      **non-exclusive** flag (`person.execBoard = true`) — dropping there doesn't touch
      `chapter`/category, so a member can be on the board *and* in a chapter; ✕ removes them.
      (The legacy `tier` field is retired.)
    - **Chapter Pages** — per-chapter card editor (`renderChapterPages()`): edit name, location,
      status, statusTag, Instagram URL, description, **chapter email** (`contactEmail`), **Get
      Involved/volunteer link** (`joinUrl`), **impact stats** (`stats`, a `value | label` per-line
      textarea), **community partners** (`partners`, one per line), **current initiatives**
      (`initiatives`, a `title | description | url` per-line textarea), and **manage chapter-highlight
      photos** (upload to Storage `chapters/<id>/…` / remove → `chapter.photos`). All persist to the
      chapter's `page` doc via `chapterPageFields()` (copies every chapter field except `id`), so new
      fields auto-save with no extra wiring. The public page renders stats/partners/CTAs only when set.
      **`initiatives` are NOT shown on the chapter page** — they're aggregated ACROSS all clubs into the
      **"Current initiatives"** section on `ongoing-initiatives.html` (`renderInitiativesPage` →
      `initiativeCardMarkup`, each card tagged with its club name; section hidden when no club has any).
      This section replaced the old static "Recurring initiatives" cards (migrated onto the AHS chapter).
    - **Structure** — add/remove/**rename** **categories**, **chapters**, and **titles** (the member
      Title dropdown options). Renaming categories/chapters edits the display `label`/`name` only
      (the `id` stays stable so member role/chapter assignments hold). **Titles** are plain strings
      stored directly on `person.title`, so renaming a title **propagates** to every member who had
      it; removing a title just drops it from the options (members keep their value). On load,
      `migrateTitles()` folds any free-text `person.title` not yet in `titles` into the options.
      Also has a **Chapter admins** editor (`renderChapterAdmins()`): add/remove `email → chapter`
      entries → `site/content.chapterAdmins`.
    - **`chapter-<id>-admin.html`** (one scoped editor page **per chapter**, reached from the
      `admin.html` picker) — where approved chapter admins land: their chapter's editor with **three
      in-page tabs, "Page", "Initiatives", and "Members"** (`[data-admin-tab]`/`[data-tab-panel]` toggled
      in `admin.js`; reuses `renderChapterPages`/`renderPeople` filtered by `SCOPE_CID`; Chapter/Board
      controls hidden; saves only their `chapterContent` doc). **Chapter admins CANNOT edit the chapter
      Name** (the Name `<input>` is omitted when `SCOPE_CID` is set — name shows as the card heading only;
      full admins still edit it in Chapter Pages). The **Initiatives tab** (`renderInitiativesAdmin` →
      `#initiatives-editor`, `+ Add initiative`) is a structured add/edit/remove editor for that chapter's
      `initiatives`; when it's present, `renderChapterPages` omits its inline initiatives textarea (the
      full admin, which has no such tab, keeps the textarea). The chapter-pages editor stretches full width
      (the old inline `max-width:900px` was removed across the template + all generated pages). Admin
      `<label>`s are `display:grid`, so any descriptive text containing inline `<code>` must be wrapped in
      one `<span>` or each fragment becomes its own grid row (the "Impact stats"/"Current initiatives"
      labels do this). Each page sets `<body data-admin-chapter="<id>">`, which
      `admin.js` reads as the chapter scope (full admins) — chapter admins are still scoped by their
      **email** (the rules enforce it). A chapter admin who lands on any other admin page is redirected
      to their `chapter-<id>-admin.html`.
      - **Generated from the `chapter-admin.html` template** via:
        `for f in chapter-*.html; do b=${f#chapter-}; b=${b%.html}; case "$b" in admin|pages-admin|*-admin) continue;; esac; sed -e "s|<body>|<body data-admin-chapter=\"$b\">|" chapter-admin.html > "chapter-$b-admin.html"; done`
        **A NEW chapter needs its `chapter-<id>-admin.html` generated** (re-run the loop) — same as adding
        a public `chapter-<id>.html`. `chapter-admin.html?c=<id>` still works as a generic fallback.
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
