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
data/logic, not rendered markup. **Live content = Firestore** (see Firebase section) for most fields;
`data.js` is the **seed/offline fallback**, and `firebase-data.js` preserves the seed `people`
roster when Firestore's people array is empty.

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
  `data.people` by role at startup. Homepage "All Members" roster was removed (the
  `[data-members-slider]` renderer + its CSS were deleted in the 2026-07 dead-code sweep).
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
- **Analytics** = two injectors in `initRender`: `initVercelAnalytics()` (Vercel Web Analytics) and
  `initPlausible()` (Plausible, cookie-less; `data-domain="bytesforbetterlives.net"` = the ONE
  dashboard site all hosts/subdomains report into; `script.outbound-links.js` variant so external
  donate-link clicks are tracked; skips `/admin` paths; no-ops on localhost). Dashboard:
  plausible.io — the site must exist there under that exact domain for events to record.
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
  Initiatives). A closing **"Get involved" dark CTA band** (`#chapter-cta-section`, `band--ink`) is
  ALWAYS shown once the chapter resolves — so thin chapters (no initiatives/photos yet) still end with
  a beat; its buttons: Support (always), Email-the-chapter OR Contact-Us fallback, Join when `joinUrl`.
  Hero CTAs build conditionally: always "Support this Chapter" (`chapterSupportUrl()`),
  plus "Get Involved" (`chapter.joinUrl`), Instagram (`chapter.instagram`), "Email the Chapter"
  (`chapter.contactEmail`) when set. These fields live on `chapterContent/{id}.page`.

### `styles.css`
Single stylesheet. Colors are **OKLCH custom properties** in `:root`. **Fonts load via
`<link rel="preconnect">`+`<link rel="stylesheet">` in every page `<head>`** (public + admin), NOT via
CSS `@import` (that serialized HTML→styles.css→fonts-CSS→woff2 and blocked first paint) — a new page
shell must copy the three font `<link>`s **verbatim** (2 preconnects + the stylesheet with
`family=Mulish:wght@400;500;600;700;800&family=Gabarito:wght@400..900`). All 42 pages carry the
identical link; Nunito is retired and must not come back.

### `images/`
Subfolders (e.g. `images/work with seniors/`, `images/donations/`, `images/team/`); some names
contain spaces.

## Pages
`index.html` (Home), `about.html`, `impact.html`, `ongoing-initiatives.html`, `team.html`,
`chapters.html`, `chapter-{ahs,coral-springs,cypress,doral,gainesville,los-angeles,miami,new-york,virginia,russia,turkey}.html`,
`contact.html`, `past-events.html`, `gallery.html` (standalone photo gallery → lightbox),
`donate.html` (donate hub — `donateHubUrl` in `script.js` drives every Donate CTA; `renderDonatePage()`).
Admin (noindex, not in navbar): `admin.html` (chapter-picker login landing), `members-admin.html`,
`gallery-admin.html`, `chapters-admin.html`, `chapter-pages-admin.html`, `initiatives-admin.html`,
`fundraisers-admin.html`, `structure-admin.html`; per-chapter scoped `chapter-<id>-admin.html`
generated from the `chapter-admin.html` template (which also works as `?c=<id>` fallback).

- Navbar order: About · Impact · Initiatives · Team · Chapters · Gallery (no "Home"). "Initiatives" tab
  = `ongoing-initiatives.html` (label renamed, filename kept). AHS = "AHS Chapter" ("Founding Chapter"
  eyebrow on directory); `turkey` = "Turkey Chapter" (IG handle `bfbl_turkiye`).
- **`impact.html` is consolidated**: former "work with seniors/kids", "donations", "partners" as
  in-page sections (`#seniors`,`#kids`,`#donations`,`#partners`). Old `#gallery` section REMOVED
  (its `renderGalleryPage()` was deleted in the dead-code sweep); Home "View Full Gallery" → `gallery.html`.
- ⚠️ **Do NOT recreate** `donations.html`, `work-with-seniors.html`, `work-with-kids.html`,
  `our-impact.html` — intentionally merged into `impact.html`.
- `test-image-loading.html`, `test-preservation.html`, `test-preservation.js`, `test-image-paths.js`
  are stale leftover test harnesses (not live).

## Design / branding
**2026-05-31 redesign** — "warm + bold blend" (DECA + youthteaching.org), mint-led; read as
intentional/editorial, not AI-template.
- **Type (SITE-WIDE, 2026-08)**: `--font-display`+`--font-label`=**Gabarito** (free stand-in for
  DECA's Gotham Rounded — Rethink Sans was tried and rejected as AI-template; Gotham is commercial);
  `--font-body`=**Mulish**. No serif (rejected). **Nunito is RETIRED** — gone from `:root`, from every
  page's fonts `<link>`, and from the whole repo. Both tokens are set once in the base `:root`; there
  is NO `body.page-home` type override any more.
  - **Weight scale**: Gabarito sets much blacker than Nunito did at the same number, so the whole
    display/label scale sits one notch down and those are now the BASE values in each component's own
    rule — 900→**700**, 800→**600**, 750→**550**, 700→**500**. When adding a display/label component,
    pick from 500/550/600/700. ⚠️ The re-map applies ONLY to rules whose text renders in Gabarito.
    **Mulish text keeps its original 400–900 weights** — check the computed `font-family` before
    touching a `font-weight` (several Mulish rules were mapped down by mistake and reverted).
  - **No text-shadows in ANY hero** (HARD user rule) — the declarations are deleted, not overridden
    with `text-shadow:none`. If hero type gets lost over a photo, **deepen the hero wash**; never
    re-add a shadow. (`.chapter-hero`'s ink gradient was deepened to 72/68/46/20% for exactly this.)
- **Brand color = "SY Glacier Mint" `#B4D3AD`** (`--green`; `--green-dark:#4F7A46`, `--green-deep`,
  `--green-soft`). Primary CTAs (`.btn-primary`,`.btn-donate`) fill `--green-dark`+paper text as **pill
  buttons** (mint failed contrast, reserved for soft washes) — EXCEPT on home, which squares them
  (4px) with the rest of the page.
- **Per-page accent**: `--accent`/`-soft`/`-dark` default green; `body.page-*` overrides — green
  (home, impact, chapters, chapter profiles), gold (initiatives, gallery, past-events), teal (about,
  contact), coral (team). Accent drives kicker/underline, hero tint, band wash, card-hover, stat
  numerals, program-tile colours. (Blue retired.) Every page keeps `--accent-dark` a shade DEEPER
  than `--accent` so the kicker text sits below its underline bar (two-tone layering): green uses
  `--green-deep`, the others use `--gold-deep`/`--teal-deep`/`--coral-deep`.
- **Warm palette**: `--paper`/`--surface` warm off-white; neutral/deeper shadows; generous radii
  (`--radius-lg:18px`…`2xl:32px`).
- **Section motif**: `.section-kicker` (uppercase Gabarito 600, `--accent-dark`, 0.16em) + 48px `--accent`
  underline under `.section-title`; hero `.eyebrow`=`--accent-soft`.

### Heroes — two treatments
- **Home only** keeps the photo hero (`.home-hero`, `images/hero-banner.jpg`, crop `center 34%`).
  **2026-08 home redesign** (News-Literacy-Project structure on the mint palette) replaced the old
  light left-heavy wash with ONE strong, near-uniform scrim — `--home-hero-scrim`
  (`ink` 86% + `green-deep`) at **72→66→62%** across a `92deg` gradient — so white type is legible
  anywhere on the frame with NO text-shadow (measured ≥7.7:1). Hero is `height:auto` +
  `min-height:85vh` (auto-ish on mobile), `padding-block` starts at `calc(var(--nav-height) + …)`
  because the navbar overlays it (below). Content: `.eyebrow` → h1 → subtitle (`max-width:46ch`) → ONE
  quiet `.hero-arrow-link` ("Our mission and vision →" → about.html, underline on hover); the hero
  button row was removed (Donate lives in the navbar). All of this lives in the `HOME REDESIGN` block
  at the END of `styles.css`, scoped to `body.page-home`. (Banner is real BFBL signage.)
  - **Hero copy.** Current: eyebrow "Largest and fastest growing youth-led digital equity nonprofit
    in Florida" (user reinstated this superlative 2026-08-16, overriding the earlier facts-only rule
    that had replaced it with "Student-led · 11 chapters · 3 countries"), h1 "Technology shouldn't
    determine opportunity.", subtitle naming the three programs. The eyebrow no longer carries the
    chapter count, so it's off the add-a-chapter count-bump checklist.
- **Home navbar overlays the hero**: `body.page-home .navbar` is `position:fixed` + transparent (paper
  links/wordmark/hamburger bars, Donate = SQUARE paper-bg ink-text button; link colours only
  `@media(min-width:1181px)` so the paper mobile drawer stays readable). `initHomeNavOverlay()`
  (script.js, gated on `body.page-home` + `.home-hero`, no-op elsewhere) adds **`.is-solid`** via an
  IntersectionObserver once the hero clears the bar → the navbar returns to its normal paper/ink
  treatment. No hero or no IO → `.is-solid` immediately.
- **All 8 interior pages** (about, impact, team, ongoing-initiatives, contact, past-events, gallery,
  chapters DIRECTORY) use **`.hero-editorial`** — a photo-less accent COLOUR-FIELD (directional
  `--accent-dark`→ink gradient + faint dot-grid + top-left glow), keyed per-page accent. No image →
  `min-height:clamp(420px,48vh,560px)` + `height:auto` + `overflow:visible` so it grows to fit content.
  HTML class is `hero hero-editorial`.
- **Chapter-PROFILE pages** keep their own photo hero (`.chapter-hero`) WHEN the chapter has a real
  `photos[0]`; `renderChapterProfilePage()` sets `--hero-img` to it. `.chapter-hero` overrides the base
  `.hero` wash with its own (light accent 36→12→0%, ink 72%→68%@55%→46%@78%→20%) so the chapter's own
  photo still reads while the copy stays legible — the ink gradient carries ALL legibility now that
  heroes have no text-shadows (it was 54→30→14% and bright banners swallowed the subtitle). It stays
  deep across the whole copy column and only falls away past 78%, so the right third of the photo —
  where no copy ever sits — stays bright. Verified ≥5.3:1 on every photo chapter. **Chapters with NO real photo get `.chapter-hero--editorial`** (a photo-less accent
  colour-field, same recipe as `.hero-editorial`) instead of falling back to the shared `hero-banner.jpg`
  — whose printed wordmark bled through the light wash and made every photoless chapter look identical.
  The locator map carries identity in both cases. A faint **locator MAP + dot** (`chapterLocatorConfig` +
  `.chapter-hero-locator`/`.hero-locator-map`/`.hero-locator-dot`, hidden on mobile) shows each
  chapter's OWN region outline from `images/maps/`: FL chapters→`florida.svg` (dot %s mirror
  `FLORIDA_MAP_PINS`); `new-york.svg`/`virginia.svg`/`california.svg` (US-state outlines); `russia.svg`/`turkey.svg`
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
- **Editorial stat band** (`.impact-band`): big Gabarito numerals (`--accent-dark`, 700, `tabular-nums`
  so the count-up doesn't jitter) + hairline dividers on soft accent wash; Home+Impact use the `stats`
  array. Dividers (`border-left`) are scoped to the desktop 5-up row (`@media min-width:901px`) — on
  stacked/2-col layouts the numeral carries the accent (a left spine there would break the no-lines
  HARD rule). Grid laddering: 5 (≥901px) → 3 (≤900) → 2 (≤680 and ≤440); never 1-col.
  **On home** the band drops the green wash and shares the light NEUTRAL ground of the impact-intro
  band above it (`surface-strong` 55% + paper), pads `0` on top, flushes the first numeral to the
  container edge and thins the desktop dividers to a neutral hairline — the two sections read as one.
- **Impact-intro band** (`.home-intro`, home only, STATIC markup in `index.html` directly under the
  hero and directly above `#home-impact-stats`): light neutral band holding ONLY the
  `.home-intro-title` in `--green-deep` ("Our impact, thanks to your support") — the 2-col grid,
  "Our work in numbers" CTA and right-column sentence/lede were removed 2026-08 at user request
  (markup + their CSS deleted); the title alone hands off to the numbers.
- **Home is SQUARE-cornered** (home-scoped, end of `styles.css`): `.btn`/`.btn-donate`/`.nav-link` →
  4px; cards/`.story-face`/`.map-frame`/`.dropdown-menu`/`.hamburger` → 8px; `.service-icon`/
  `.dropdown-link` → 6px. Small data pills (`.status-badge`, story chips) and avatars keep their shape.
- **Home section order** (`index.html`): hero → impact-intro band → stat band (`#home-impact-stats`)
  → What We Do → Our Reach map (`#global-reach`, moved down from first) → Board of Directors →
  Chapters preview → Photo Stories → footer (the founder-quote `band--ink` was removed 2026-08 at
  user request). Renderers target ids, so
  reordering the containers is safe; keep every container id.
- **Program tiles** (`.service-card` in `.service-grid`): `.service-icon` chip (soft tile-colour wash +
  program-specific stroke SVG, defined inline in `renderWhatWeDo`) cycling green/gold/coral/teal via
  `:nth-child(4n+…)`; 3-up desktop. (Replaced the 01-05 numerals — they implied a sequence the programs
  don't have; numbered markers stay only where order is real, e.g. About's story rail.)
- **`.cards-grid--feature`**: UNIFORM grid (`auto-fit minmax(300px,1fr)`, equal width/height; cards
  flex-column). Used on Home chapters preview, Impact Seniors/Kids/Donations, Initiatives
  `#fundraiser-grid`, Past-events.
- **Editorial dark beats** — `.band--ink` sections with `.editorial-quote` (big quote glyph ::before)
  and/or `.band-figure` (oversized accent numeral): "3,500+" on About, "40+" on
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
  (the legacy `.map-pin` teardrop component that used to hijack markup was deleted in the dead-code sweep).
  - **Map-projection note (how pin %s are derived) — CALIBRATED 2026-08, supersedes the old
    "Miller / equirectangular" note, which was wrong:** pin positions are PROJECTED from each place's
    real lat/lng, not eyeballed.
    - **`florida.svg`** (viewBox `630 435 176 152`) is an **Albers conic**, not equirectangular:
      `n=0.60283700`, `C=1.35122133`, `lng0=-96`; `ρ=√(C−2n·sin φ)/n`, `θ=n·(λ−λ0)` in radians;
      `X=479.96+1264.138·ρ·sin θ`, `Y=−1332.38+1264.138·ρ·cos θ`; then
      `x%=(X−630)/176·100`, `y%=(Y−435)/152·100`.
    - **`world.svg`** (+ its crops `russia.svg`/`turkey.svg`/`world-reach.svg`) is a **hand-drawn pseudocylindrical**
      outline, not Miller. Global fit (λ,φ in radians):
      `x = 453.159 + λ·(161.7715 − 22.1313·φ² + 0.3638·φ⁴)`,
      `y = 337.757 − 172.8404·φ + 0.6486·φ³ − 10.4118·φ⁵`; `x%=x/9.5`, `y%=y/6.2`.
      North-American pins are off by a few px under the global fit, so they use a **local affine**
      instead: `x = 432.1872 + 0.7217·lat + 2.6924·lng`, `y = 360.4426 − 3.5132·lat + 0.1962·lng`.
    - `new-york.svg`/`virginia.svg`/`california.svg` stay equirectangular over the shape's bbox →
      `x%=(lng−lngW)/(lngE−lngW)`, `y%=(latN−lat)/(latN−latS)`, mapped in via path bbox vs viewBox.
    - `russia.svg`/`turkey.svg` hero locators are CROPS of world.svg, so their dot = that chapter's
      `WORLD_MAP_PINS` point in world.svg units (`x%·9.5`,`y%·6.2`) remapped into the crop viewBox —
      the same city then lands identically on both maps. (They previously held stale Miller values.)
    - To add/move a pin: compute the %s this way, then **visually verify** against the silhouette
      (serve locally + screenshot), and **audit label-vs-DOT, not just label-vs-label** — a pill
      sitting on a neighbour's dot hides the marker, mislabels it and steals its click target.
      The SE-Florida chapters legitimately cluster on the SE coast (~40 mi apart), so their labels
      float left and a couple of dots overlap; per-pin `dy`/`dx` (px) stagger the clustered labels
      into a readable inland column (`--label-dy`/`--label-dx` on `.geo-pin-label`, both sides).
      `--label-dy-scale` (default 1) shrinks a whole frame's stagger when the frame itself shrinks.
      A `dy` of |20px|+ auto-renders a **hairline leader** (`.geo-pin-lead`, `--label-lead`) back to
      the dot, so a lifted pill (Los Angeles, whose 86px label would otherwise land on the New
      York/Virginia dots) still reads as belonging to its marker.
    - Two DOTS may still overlap where the places genuinely are that close at that scale (New York /
      Virginia on the world maps, AHS / Plantation on the inset). That is accepted: each label is
      inside its own `<a>`, so the pill is the real click target and both chapters stay reachable.
      A LABEL on someone else's dot is not accepted — it hides and mislabels that marker.
  `.pin-active`=green, `.pin-launching`=gold; `.geo-pin--left` floats label inland.
- **Home "Our Reach" PAIR** (`#global-reach` on `index.html` — sits AFTER the What We Do section since
  the 2026-08 home redesign; restructured 2026-08-16): ONE `.reach-row` grid holding two `.map-card`
  figures side by side — the **CROPPED world map** `#map-world-home` (`images/maps/world-reach.svg` =
  world.svg with viewBox cropped to **`79 78 659 335`**, the pin spread W-N-America→India /
  N-Russia→Peru, so pins fill the frame) next to the **South-Florida inset** `#map-florida-se`
  (`images/maps/florida-se.svg` = florida.svg viewBox-cropped to **`780 526.5 24 26`**, `stroke-width`
  scaled 0.16 for the ~7× zoom). The old full-width 900px world map + whole-Florida panel
  (`#map-florida-home`, `.reach-fl-row`, `.map-inset-region`/`FLORIDA_INSET_REGION`) were REMOVED —
  do not restore. Columns `2.13fr / 1fr` = ratio of the two aspect ratios (659/335 ÷ 24/26) so the
  frames land at the same height; **≤1000px** they stack (inset capped 380px). The inset runs 0.68rem
  labels and NO `--label-dy-scale`: its frame is within ~20px of 370 at every breakpoint (366 / 380 /
  362), so the px `dy` offsets are simply tuned at that size.
  Captions reuse `.map-cap`/`.map-cap-sub` ("Worldwide" / "South Florida").
  - **World-map pins**: `WORLD_MAP_PINS`/`WORLD_OUTREACH_PINS` keep FULL-map %s (chapters.html renders
    them as-is); the home renderer remaps every pin into the crop via `worldReachPin()` +
    `WORLD_REACH_CROP` (`x%·9.5`,`y%·6.2` → viewBox units → % of crop box) — NO second pin table, so
    new/moved world pins need no home-specific work. Chapter pins forced GREEN via
    `mapPinMarkup(pin,"Active")` (2nd arg must be a STRING — bare `.map(mapPinMarkup)` passes the
    index; recolours the DOT only, the `title` tooltip keeps the REAL status); the `ahs` pin becomes
    an aggregate "Florida · N chapters" (N live from `FLORIDA_MAP_PINS.length`; suffix = `labelNote` →
    `.geo-pin-label-note`, hidden ≤760px) linking to `chapters.html`. Red pins = `WORLD_OUTREACH_PINS`
    (Haiti/Peru/India centroids) — id-less but with `href` → real `<a>`s; `mapPinMarkup` id-less
    branch: **href → link; no href → `.geo-pin--static` `<span>`** (hover-inert per the clickability
    HARD rule). `.pin-outreach` dots are HOLLOW `--coral-dark` rings (shape ≠ colour alone;
    green/coral is a red-green CVD pair). India carries `pin-edge-right` (dot ~90% across the crop →
    its label flips inland ≤640px so it can't clip the frame edge). New outreach country = one
    `WORLD_OUTREACH_PINS` entry (full-map %s per the map-projection note — the crop remap is
    automatic; give any pin landing near the crop's right edge `pin-edge-right`).
  - **Inset pins**: `FLORIDA_SE_CHAPTER_PINS` (5 metro chapters, own inset %s) +
    `FLORIDA_IMPACT_PINS` (9 service-site markers, each a `pin-outreach` link into
    impact/past-events). Inset %s come STRAIGHT from the Albers X,Y remapped onto `FLORIDA_SE_CROP`
    (`x%=(X−780)/24·100`, `y%=(Y−526.5)/26·100`) — never converted from the rounded full-map %s,
    which multiplies their rounding error by 176/24. `stats`/`FOUNDERS`-style hardcoded tables —
    chapters carry no geo. **"Hollywood" is one marker for two sites** (Five Star Premier + Joe
    DiMaggio, 1.6 km apart): at any zoom this frame can carry, their dots merge into one blob and the
    upper pill covered the lower dot's click target — one pill naming both is honest and clickable.
  - **Inset corner locator** (`floridaLocatorMarkup()` → `.map-locator`/`.map-locator-box`): the crop
    is a ~7× zoom into a silhouette with NO interior geography, so on its own the panel reads as a
    plain green rectangle. A small full-state Florida with the crop outlined (derived from
    `FLORIDA_SE_CROP` ÷ `FLORIDA_VIEWBOX`, so it can't drift from the SVG) says where the zoom is.
    Decorative: `aria-hidden`, `pointer-events:none`, no hover.
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
- Logo: `.logo img` 58px; `.logo::after` wordmark `--green-dark` Gabarito. Responsive hamburger
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
  **11** chapters (`stats` array in `script.js`). Chapters (registry order): AHS, Cypress Bay,
  Gainesville, Coral Springs, Miami, Doral, New York, Virginia, Russia, Turkey, Los Angeles.
- Chapter cities (for map dots): AHS→Plantation FL, Cypress Bay→Weston/Cypress Bay FL,
  Gainesville→Gainesville FL, Coral Springs→Coral Springs FL, Miami→Miami FL, Doral→Doral FL,
  New York→NYC, Virginia→Virginia Beach VA, Russia→Moscow, Turkey→Istanbul, Los Angeles→Los Angeles CA.
  (Miami = MAST @ FIU
  students, not an official school club; public page is Miami-only. Chapter admin:
  adina.t.brody09@gmail.com.) Doral = independent chapter (2026–2027 officer cohort), President
  Asvika Prakash; FL map pin at x:92.2,y:74.2. Los Angeles = independent chapter, no lead assigned yet
  (`leadPeople` empty → directory "Led by" line hides via `chapterHasLead()`); world map pin at
  x:14.6,y:35.1 with `dy:-34` (NOT `side:left` — as the westernmost pin, a left-floating label clipped
  off the frame's left edge on the 2-col world map, so the label floats right and rises clear of the
  New York / Virginia pills its 86px label would otherwise reach; the lift auto-draws a leader line),
  locator outline `images/maps/california.svg`.
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
  `gallery` [stories], `fundraisers`, `drives` (no admin editor yet — set via `tools/firestore.mjs`;
  `firebase-data.js` DOES fetch it), `contactEmail`, `donateUrl`, `socialLinks`, a **chapters
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
  section when its `takenAt` is within **±2 days** of a located photo (closest wins), else a final
  catch-all section headed **"More moments"** (`GALLERY_NO_LOCATION`). Newest-event-first; each section
  is one `[data-lightbox-group]`.
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
  on `ongoing-initiatives.html` (`renderInitiativesPage`, each tagged with club name; an initiative
  whose TITLE matches a fundraiser's is SKIPPED there — the fundraiser card already presents it with a
  Donate CTA — but still shows on its chapter profile). Cards show flyer
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
    table (LOCKSTEP, same %s) in `script.js`, and if it's in the SE-Florida metro also
    `FLORIDA_SE_CHAPTER_PINS` (inset %s); others → `WORLD_MAP_PINS` + a region SVG; (5) bump the `stats`
    "Chapters" `raw` count in `script.js` AND every hardcoded count prose — `index.html`
    chapters-preview description, `team.html` (the home hero eyebrow no longer carries a count);
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
  `gstatic`/`apis.google.com`, `*.googleapis.com`/`*.firebasestorage.app`, `formsubmit.co`,
  `plausible.io` (script+connect), Firebase-Auth/Google hosts — keep in sync when adding any
  third-party script/endpoint. `frame-ancestors 'none'`.
  - ⚠️ **These headers are currently DORMANT in production** (discovered 2026-07-19): they're
    Firebase-Hosting config, but the site is served by VERCEL and `vercel.json` has NO `headers`
    block — live responses carry only Vercel's own HSTS. Still keep `firebase.json` in sync (it's
    the intended policy). Do NOT copy it into `vercel.json` as-is: `style-src`/`font-src` predate the
    Google-Fonts `<link>` setup (no `fonts.googleapis.com`/`fonts.gstatic.com`) and would break all
    fonts — porting needs those hosts added and a full page-by-page check first.
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
