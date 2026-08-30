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
  happen ONLY via the Action. **Content** edits (Firestore via admin) go live on the next uncached
  load — a repeat visit within 10 min may still be served the localStorage snapshot (see the snapshot
  section under Firebase); the admin clears that key on every successful save, so the editor's own
  browser is never stale. **File/code** edits need the push-to-`main` deploy.
- **Firebase is the BACKEND only** (Firestore + Auth + Storage), not the host. `firebase.json` +
  `.firebaserc` (project `project-686d62b7-14f5-43c7-acc`) remain for **rules/Storage deploys**
  (`npx firebase deploy --only firestore:rules,storage`). `firebase-tools` is a local devDependency;
  CLI auths via gcloud ADC (no `firebase login`). Do NOT `firebase deploy --only hosting` — push to `main`.
- **Caching (`vercel.json` `headers`, added 2026-08-29 for the flash work).** `styles.css`/`script.js`/
  `data.js`/`firebase-data.js` = `public, max-age=300`; `/images/*` = `public, max-age=86400`. Before
  this, every navigation revalidated all four code files and the browser painted empty chrome while
  it waited (measured 7–8 frames / ~145ms on EVERY load). Consequences to know: a code push is live
  immediately for a new visitor but up to **5 min** later for a returning one (hard-reload bypasses),
  an image replaced in place (`hero-banner.jpg`, `logo.avif`, `maps/*.svg`) up to **24h** later, and
  the four code files expire independently so `styles.css` and `script.js` can skew by up to 5 min —
  which is why there is deliberately **no `stale-while-revalidate`** on them (a stale stylesheet with
  a fresh script breaks the nav-overlay class handshake) and no `immutable` (needs hashed filenames,
  i.e. a build step). ⚠️ **`vercel.json` admits NO comment keys** — its schema is
  `additionalProperties:false`, so a `"//"` key fails `vercel build` and nothing deploys. Rationale
  lives here instead.

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
- **Render pipeline — `boot()` paints EVERYTHING it can at parse time (2026-08-29 anti-flash pass).**
  The IIFE's last statement is `boot()`, in this order: `ensureChapterProfileLayout()` (warm only) →
  `renderChrome()` → `renderStaticBody()` → `renderBodyOnce()` (warm only).
  `renderChrome()` owns `renderNavigation` → `initNavDropdowns` → `renderFooter` → `syncDonateLinks`
  → `ensureSkipLink` → `initMobileNavigation` → `initNavOverlay`. `renderStaticBody()` = the
  renderers that read NO data (`renderHomeStats` + `initCounters`, `renderWhatWeDo`,
  `renderDonatePage` — all hardcoded arrays), so they run on every load, warm or cold.
  - **WARM vs COLD is the whole design.** `firebase-data.js` sets **`window.BFBL_DATA_SYNC`** when it
    installs its localStorage snapshot synchronously (i.e. on every repeat visit — which is exactly
    what "switching pages" is). Then the live content is already in `window.BFBL_DATA` at parse time
    and `boot()` renders the entire body in the FIRST paint. Cold (first visit, private mode, expired
    snapshot, a chapter SUBDOMAIN's separate origin) falls through to the `DOMContentLoaded` handler
    behind `BFBL_DATA_READY`, exactly as before — the `data.js` seed cannot honestly answer "is this
    section empty?", so a seed pass would hide-then-reveal, which is worse than the wait.
  - ⚠️ **`renderBodyOnce()` runs EXACTLY ONCE**, behind a `bodyRendered` flag, because
    `initLightbox`/`initCarousels`/`initStoryCards`/`initSmoothScroll` all bind listeners with no
    re-entry guard and `initRevealEffects` would blank cards the reader has already scrolled to.
  - ⚠️ **`boot()` must stay the LAST statement of the IIFE.** Module-level `const`s above it
    are in the temporal dead zone earlier, so calling it higher up makes `renderFooter` throw on
    `SOCIAL_ICONS` and aborts the whole IIFE.
  - ⚠️ **`renderChrome()` is called exactly ONCE, from inside `boot()`.**
    `initNavDropdowns`/`initMobileNavigation` add listeners — a second call toggles the hamburger
    twice per click (opens, instantly closes). `initMobileNavigation` now also self-guards on
    `hamburger.dataset.mobileNavBound`; don't rely on that instead of calling once.
  - The only genuinely data-dependent chrome is the **Chapters dropdown `<li>`s** and the **footer**
    (email/socials). Both are patched afterwards, once data resolves, by `refreshChaptersDropdown()`
    / `refreshFooter()` — they replace markup only, never the bound `.dropdown-toggle`, and
    `initNavDropdowns()` is never called again. Drawer-close is delegated on `.nav-menu` precisely
    because those `<li>`s get replaced.
  - `initNavOverlay()` is the one chrome initializer that IS re-entrant (full contract under Heroes →
    `nav-overlay`): it disconnects the previous observer, re-applies the state with `body.nav-ready`
    off, and re-adds it two frames later so the correction snaps instead of fading. Two call sites
    only — `renderChrome()` and `ensureChapterProfileLayout()`, and the latter fires **only on the
    cold path**, gated on a `chromeRendered` flag: on the warm path `boot()` injects the hero BEFORE
    `renderChrome()`, so observing there would measure a navbar that has no links yet.
  - **`ensureChapterProfileLayout()` runs at parse time on the WARM path only.** Its template is
    data-free, so injecting it early is what puts a chapter's hero in the first paint instead of one
    blank viewport. ⚠️ Do NOT ungate it: the template ships a placeholder `<h1>Chapter</h1>` and empty
    subtitle/actions, so on a COLD start it painted a visibly wrong hero and then re-laid it out when
    Firestore landed — **measured 0.44–0.49 CLS**, against ~0 for the reserved-blank path.
    `renderChapterProfilePage()` flags `main[data-chapter-ready]` (via `markChapterMainReady()`) at
    BOTH exits — success and "chapter not found" — which releases the CSS reservation.
  - ⚠️ **`var navOverlayObserver;` is declared at the top of the IIFE and must NEVER get an
    initializer.** The binding hoists but `= null` would run in source order — i.e. after the
    parse-time call already stored an observer — wiping the reference so no later call could
    disconnect it, leaving two live observers toggling `.is-over-hero` at different thresholds.
- `navItems` (~line 21) = navbar links. Impact **stat numbers** = `stats` array (~line 366/501),
  *here, not data.js*.
- **Count-up + reveal run where their content is rendered.** `initCounters()` lives in
  `renderStaticBody()` (with the stat band, NOT behind the Firestore wait — it used to show five
  literal `0`s for the whole cold window). Both it and `initRevealEffects()` also treat an element
  **already scrolled PAST** as already-seen (guarded on `height > 0`, so a `display:none` box with an
  all-zero rect doesn't qualify). To be precise about what that buys: neither observer *unobserves* a
  non-intersecting target, so nothing was stuck forever — it fired again on scroll-BACK, which reads
  as a glitch (a card animating in, or a numeral counting up, above content you already read).
  ⚠️ `initCounters()`' version of the test lives INSIDE the observer callback, not at attach time:
  `boot()` runs before Chrome applies the fragment scroll / scroll restoration, so `scrollY` is still
  0 then and an attach-time test can never be true.
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
**Same rule, same reason, for FOUR more head/body blocks a new public shell must copy VERBATIM**:
1. the static `<meta name="theme-color" content="#FCFAF5">` right after the viewport meta (A11y baseline);
2. `class="nav-overlay"` on `<body>` if the page opens with a hero (Heroes → `nav-overlay`);
3. the three **`<link rel="preload" as="script">`** for `data.js`/`firebase-data.js`/`script.js` after the
   `styles.css` link — those three scripts build the navbar, footer and content, so the browser needs them
   before first paint or the bar paints logo-only. (On `index.html` ONLY they sit *after* the LCP
   `hero-banner.jpg` image preload, which must claim the connection first.)
4. the inline **first-paint navbar `<script>`** immediately before `<script src="data.js">` (Heroes →
   `nav-overlay`).
Drift checks — both must print nothing:
`grep -L 'rel="preload" as="script" href="script.js"' $(grep -l 'nav-overlay' *.html)` and
`grep -L '__bfblNavOverlayReady' $(grep -l 'nav-overlay' *.html)`.

**Cross-document View Transitions** (top of `styles.css`, user-approved 2026-08-29): a top-level
`@view-transition { navigation: auto; }` cross-fades the navigation itself, so the browser's gap between
documents is covered by the outgoing page instead of a blank frame. It must stay at the TOP LEVEL (not nested
in a media query) to be honoured; reduced motion is handled by a `prefers-reduced-motion: reduce` block that
kills `::view-transition-group/old/new` animations. Same-origin only — Firefox ignores it and a hop to a
chapter SUBDOMAIN gets the plain cut. ⚠️ It only helps because `boot()` now paints the new page COMPLETE;
cross-fading into a half-empty page would make pop-in MORE visible.

### `images/`
Subfolders (e.g. `images/work with seniors/`, `images/donations/`, `images/team/`); some names
contain spaces.

## Pages
`index.html` (Home), `about.html`, `impact.html`, `ongoing-initiatives.html`, `team.html`,
`chapters.html`, `chapter-{ahs,coral-springs,cypress,doral,gainesville,los-angeles,miami,new-york,virginia,russia,turkey}.html`,
`contact.html`, `past-events.html`, `gallery.html` (standalone photo gallery → lightbox),
`donate.html` (donate hub — `donateHubUrl` in `script.js` drives every Donate CTA; `renderDonatePage()`),
`design-system.html` (noindex, not in navbar — living style guide rendering real components from `styles.css`).
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
- **Page `<body>` classes** — two static classes doing different jobs:
  - `page-<name>` (`page-home`, `page-about`, `page-team`, …) is the per-page hook. Since the accent
    retirement **only `page-home` still drives any CSS** (its photo hero, `.home-intro`, and the
    stat-band pairing); the others style nothing and are kept only as handles. `page-chapter` is added
    at RUNTIME by `renderChapterProfilePage()` and is likewise inert now.
  - **`nav-overlay` is the functional one** — carried by every public page that OPENS with a hero
    (`index.html` + the 9 interior pages + all 11 `chapter-*.html` stubs) and by nothing else: admin
    pages, `design-system.html` and the stale `test-*.html` have no top hero and must NOT get it (see
    Heroes → `nav-overlay`). A new public page with a hero needs it in the `<body>` tag.

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
    re-add a shadow. (`.chapter-hero`'s ink gradient was deepened to 72/68/46/20% for exactly this,
    and its nav-band top scrim to 62/50 when the overlay navbar moved onto chapter pages.)
- **Brand color = "SY Glacier Mint" `#B4D3AD`** (`--green`; `--green-dark:#4F7A46`, `--green-deep`,
  `--green-soft`). Primary CTAs (`.btn-primary`,`.btn-donate`) fill `--green-dark`+paper text as solid
  **square-cornered (4px)** buttons (mint failed contrast, reserved for soft washes) — same 4px as every
  other control, site-wide.
- **ONE accent, SITE-WIDE = brand green** (HARD rule, 2026-08): `--accent`=`--green-dark`,
  `--accent-soft`=`--green-soft`, `--accent-dark`=`--green-deep`, set once in `:root`. There are **NO
  `body.page-*` accent overrides** — the gold (initiatives/gallery/past-events), teal (about/contact)
  and coral (team) blocks were DELETED; four hero colours were the main reason the site read as four
  products. Do not reintroduce a per-page accent. Accent drives kicker/underline, hero tint, band
  wash, card-hover, stat numerals. `--accent-dark` stays a shade DEEPER than `--accent` so the kicker
  text sits below its underline bar (two-tone layering).
  - The `--gold*`/`--teal*`/`--coral*` tokens STAY in `:root` — they are **data/brand colours, not
    page accents**, and their consumers must not change: the `.service-icon` 4-colour program-tile
    cycle (home itself uses it), `.pin-launching` gold map pins, `.pin-outreach` hollow coral rings,
    status badges, `--danger`. Reach for them only for that kind of encoding.
- **Warm palette**: `--paper`/`--surface` warm off-white; neutral/deeper shadows. The `--radius-*`
  tokens still sit in `:root` but are all but dead — only `.skip-link`, `.social-link` and the story
  chips read `--radius-md`; every other holder now carries a literal px (see the SQUARE-corners rule).
  The whole dead members-slider CSS block (`.members-viewport`/`-track`/`-chip`/`-count`/`-arrow*`,
  heading included) is gone — retired renderer, referenced nowhere.
- **Section motif**: `.section-kicker` (uppercase Gabarito 600, `--accent-dark`, 0.16em) + 48px `--accent`
  underline under `.section-title`; hero `.eyebrow`=`--accent-soft`.

### Heroes — two treatments, ONE colour (2026-08 unification)
Every hero now runs home's green-ink field: a photo hero (home + chapters that have a photo) or the
photo-less version of the same field (interior pages + photoless chapters). No per-page hero colours.
The navbar overlays all of them — see `nav-overlay` below.
- **Home only** keeps the photo hero (`.home-hero`, `images/hero-banner.jpg`, crop `center 34%`).
  **2026-08 home redesign** (News-Literacy-Project structure on the mint palette) replaced the old
  light left-heavy wash with ONE strong, near-uniform scrim — `--home-hero-scrim`
  (`ink` 86% + `green-deep`) at **72→66→62%** across a `92deg` gradient — so white type is legible
  anywhere on the frame with NO text-shadow (measured ≥7.7:1). Hero is `height:auto` +
  `min-height:85vh` (auto-ish on mobile), `padding-block` starts at `calc(var(--nav-height) + …)`
  because the navbar overlays it (below). Content: `.eyebrow` → h1 → subtitle (`max-width:46ch`) → ONE
  quiet `.hero-arrow-link` ("Our mission and vision →" → about.html, underline on hover); the hero
  button row was removed (Donate lives in the navbar). All of this lives in the block at the END of
  `styles.css` — which now holds TWO scopes: the `body.nav-overlay` navbar rules (site-wide, below)
  and what is still genuinely home-only under `body.page-home` (this hero, `.home-intro`, and the
  stat-band pairing). Its square-corner pass was deleted when those radii became the site-wide base
  (see Components). (Banner is real BFBL signage.)
  - **Hero copy.** Current (user-dictated 2026-08-29): eyebrow "Largest youth-led digital equity
    nonprofit in Florida" — the superlative was reinstated 2026-08-16 over the earlier facts-only
    rule, then trimmed of "and fastest growing". A concurrent upstream commit inserted "501(c)(3)"
    here; the user had it REMOVED — that status belongs in the footer ledger (`renderFooter`, every
    page) and on donate.html, not in the hero. h1 "Technology Should Be for Everyone", subtitle "…bridges the
    digital divide through technology access, digital literacy, and community service." The eyebrow
    carries no chapter count, so it's off the add-a-chapter count-bump checklist.
- **`nav-overlay` — the navbar overlays the hero on EVERY hero page** (was home-only until 2026-08):
  - **`body.nav-overlay` is a STATIC class in the page's `<body>` tag**, carried by every public page
    that opens with a hero — `index.html` (which also keeps `page-home`), the 9 `.hero-editorial`
    interior pages, and all 11 `chapter-*.html` public stubs (their hero is injected at runtime but
    always present). Pages with no top hero — every `*-admin.html`, `design-system.html`, the stale
    `test-*.html` — do NOT get it and keep the normal sticky navbar.
  - **CSS**: the whole overlay rule set is keyed to `body.nav-overlay` (fixed bar; the transparent
    look — transparent bg/border, paper wordmark/hamburger, `@media(min-width:1181px)` paper links +
    paper-bg ink-text Donate button — is under **`.is-over-hero`**; link colours are gated on that
    breakpoint so the paper mobile drawer stays readable). ⚠️ **SOLID is the default, transparent is
    the JS-applied state** (inverted 2026-08): `body.nav-overlay .navbar` restates no colours, so it
    inherits the base paper/ink `.navbar` treatment and a blocked script or a renderer that threw
    can never leave an invisible bar on 20 pages. Do not flip this back to a "transparent by
    default + JS solidifies" scheme. Home carries both classes and computes exactly what it did when
    these were `body.page-home` rules.
    ⚠️ The 220ms bg/border cross-fade lives on **`body.nav-overlay.nav-ready .navbar`**, NOT on
    `body.nav-overlay .navbar` — solid being the default means the first paint over a hero is the
    wrong state, and an ungated transition played that correction as a visible solid→transparent
    fade on every navigation. `initNavOverlay()` applies the initial state, then adds **`nav-ready`**
    to `<body>` on the next frame, so the first state change snaps and only scroll-driven ones
    animate. The DESCENDANTS that also flip colour with `.is-over-hero` declare their own
    transitions (`.nav-link` 150ms, `.btn-donate` 250ms — both LONGER than the bar's 220ms), so they
    are killed by the mirror rule `body.nav-overlay:not(.nav-ready) .navbar .nav-link, … .btn-donate
    { transition: none }`. Keep any new overlay transition behind the same gate — including one on a
    child.
  - **JS**: `initNavOverlay()` (script.js, gated on `body.nav-overlay` + the page's first hero —
    `.home-hero, .hero-editorial, .chapter-hero`) sets **`.is-over-hero`** and toggles it with an
    IntersectionObserver — on while the hero is behind the bar, off once it clears. No hero or no
    IO → the class stays off (solid). The INITIAL state is derived from GEOMETRY, mirroring the
    observer's own `rootMargin` condition (`hero.getBoundingClientRect().bottom > navbar.offsetHeight
    || 76`), never added unconditionally: on a load that is ALREADY scrolled when this runs (mid-page
    reload / back-restore) the unconditional add painted a transparent bar over light content for a
    frame until the observer's first callback corrected it. Matching the observer makes that first
    callback a no-op. ⚠️ **An anchor deep-link (`impact.html#seniors`) is the same staleness one step
    later**: Chrome applies the fragment scroll AFTER the end-of-`<body>` script, from y=0, so that
    read says "over the hero" and is wrong a moment later. This used to be excused as a scroll-driven
    fade because `html{scroll-behavior:smooth}` animated the jump — **that declaration is DELETED**
    (it also animated Chrome's own scroll restoration on reload/back, flying the page down with the
    bar still paper-on-paper; in-page anchors keep their glide through `initSmoothScroll()`, which
    passes `behavior` explicitly — with ONE exception, `body.page-design-system`, which has in-page
    anchors and does not load `script.js`, so it keeps its own `scroll-behavior: smooth`). So
    `enableNavTransitions()` now takes a **recheck callback and re-runs the geometry test one frame
    BEFORE it adds `body.nav-ready`** — ⚠️ not in the same callback: measured, the after-change style
    already carries the 220ms transition then and the browser animates the very fade this fixes.
    Even split, arrival at a `#hash` still fades on a throttled CPU (the observer's own correction
    can land later still); it is much shorter than it was (solid at FCP+165ms vs FCP+365ms, 1 bad
    frame vs 13), not zero. It is **re-entrant** (disconnects the previous
    observer) and has exactly TWO call sites: from **`renderChrome()` at script parse time** (the
    end-of-`<body>` script, so the static navbar/hero already exist and the bar reads transparent
    from the FIRST paint instead of after the up-to-3s Firestore wait), and at the end of
    **`ensureChapterProfileLayout()`**, which fires only on the COLD path (gated on `chromeRendered`
    — on the warm path `boot()` already injected the hero before `renderChrome()`).
    `initRender` calls neither this nor `renderNavigation()` any more — don't add a third
    call, it just re-binds chrome listeners and leaks a second observer.
  - **An INLINE `<script>` in every hero page's `<body>`, right before `<script src="data.js">`,
    applies `.is-over-hero` before the external scripts have even downloaded** — that is what keeps a
    solid bar off the hero when the network is slow. It is **ADD-ONLY**: solid stays the CSS default,
    so JS off, a throw or a CSP drop all still leave the readable bar. Its one new failure mode —
    class added and never removed because `script.js` never reached `initNavOverlay()` — is closed by
    an `addEventListener("load")` fallback keyed on **`window.__bfblNavOverlayReady`**, which
    `initNavOverlay()` sets. ⚠️ Its geometry test is PAIRED with `initNavOverlay()`'s: change one,
    change both. On a chapter stub there is no hero yet, so it bails by design.
  - ⚠️ **`position:fixed` takes the bar out of flow**, so EVERY hero type on a nav-overlay page must
    start at y=0 and re-add the bar's height as top padding —
    `padding-block: calc(var(--nav-height) + clamp(2rem,5vw,3.5rem)) …`, scoped to
    `body.nav-overlay` for `.hero-editorial`/`.chapter-hero` (`.home-hero` sets its own identical
    value). A new hero component needs the same padding or the bar eats its first line.
- **All 9 interior pages** (about, impact, team, ongoing-initiatives, contact, past-events, gallery,
  donate, chapters DIRECTORY) use **`.hero-editorial`** — a photo-less field that is now **home's own
  hero colour**, not a per-page accent: `color-mix(in oklch, var(--ink) 86%, var(--green-deep))` at
  home's `92deg` **72→66→62%** falloff over a `green-deep`/`ink` ground (there is no photo beneath),
  plus the faint dot-grid + top-left glow re-tinted to the green family and held down so the
  brightest pixel still clears 7:1 against paper copy (measured ~9:1 on the nav band, ~14:1 on hero
  copy). `.chapter-hero--editorial` shares this field verbatim. No image →
  `min-height:clamp(420px,48vh,560px)` + `height:auto` + `overflow:visible` so it grows to fit content.
  HTML class is `hero hero-editorial`. Subtitles carry **no colour override** — the old
  `.hero-editorial p` accent-tinted rule was deleted so they inherit `.hero p`, exactly what home's
  hero subtitle renders.
- **Chapter-PROFILE pages** keep their own photo hero (`.chapter-hero`) WHEN the chapter has a real
  `photos[0]`; `renderChapterProfilePage()` sets `--hero-img` to it. `.chapter-hero` overrides the base
  `.hero` wash with its own (light accent 36→12→0%, ink 72%→68%@55%→46%@78%→20%) so the chapter's own
  photo still reads while the copy stays legible — the ink gradient carries ALL legibility now that
  heroes have no text-shadows (it was 54→30→14% and bright banners swallowed the subtitle). It stays
  deep across the whole copy column and only falls away past 78%, so the right third of the photo —
  where no copy ever sits — stays bright. Verified ≥5.3:1 on every photo chapter. Its BOX is
  `height:auto` + `min-height:clamp(560px,62vh,700px)` (not the base `.hero`'s fixed height) so it can
  grow by the `--nav-height` top padding `nav-overlay` adds instead of clipping.
  - **Nav-band scrim.** The overlay navbar runs TRANSPARENT over these photos, and its paper links sit
    in the right third where the ink gradient has already fallen to 20–46% — bright banners took the
    links to 2.2:1. So the stack now OPENS with a top scrim (`ink` 62%→50%→transparent) that fades out
    ~72px past `--nav-height`, above every hero's eyebrow: the sanctioned "deepen the wash" remedy,
    never a text-shadow. Worst per-link case measured 5.8:1 (Cypress Bay, the brightest photo; home's
    own worst is 4.9:1) and the 390px hamburger 6.4:1 vs its 3:1 floor.
    ⚠️ It is a **FULL-SIZE layer with PIXEL colour stops**, NOT a `/ 100% <height>` sized layer:
    `renderChapterProfilePage` sets an inline `background-position` (the per-chapter crop,
    `--hero-pos`) and background-position applies to EVERY layer, so a strip smaller than the box gets
    dragged ~68% down the hero and stops covering the navbar entirely. Re-measure per-link on
    chapter-cypress after touching it.
  - **Locator map**: the overlay top padding grows the hero, and `.chapter-hero-mark` centres on the
    PADDING box, so `body.nav-overlay .chapter-hero .chapter-hero-mark` re-centres it with
    `top: calc(50% + var(--nav-height) / 2)` — otherwise the tallest outline (California, on Los
    Angeles) paints into the nav band.
  **Chapters with NO real photo get `.chapter-hero--editorial`** (the shared photo-less green-ink
  field, same recipe as `.hero-editorial`). `.chapter-hero` carries **no `--hero-img` fallback at all**
  (`none`): `initNavOverlay()` measures the hero the moment `<main>` is injected, which forced any
  default to be fetched in full and thrown away (540KB per chapter page). Its background shorthand
  therefore ends in an opaque `--editorial` ground colour, so the un-hydrated hero already looks like
  the field it may become instead of letting the paper page show through the semi-transparent layers.
  This replaces falling back to the shared `hero-banner.jpg`
  — whose printed wordmark bled through the light wash and made every photoless chapter look identical.
  The locator map carries identity in both cases. A faint **locator MAP + dot** (`chapterLocatorConfig` +
  `.chapter-hero-locator`/`.hero-locator-map`/`.hero-locator-dot`, hidden on mobile) shows each
  chapter's OWN region outline from `images/maps/`: FL chapters→`florida.svg` (dot %s mirror
  `FLORIDA_MAP_PINS`); `new-york.svg`/`virginia.svg`/`california.svg` (US-state outlines); `russia.svg`/`turkey.svg`
  (country paths). Each region SVG fills the box edge-to-edge so `left/top:%`==map %; dot % is
  **projected from the city's real lat/lng** (see map-projection note below); container `aspect-ratio`
  matches the SVG's bbox.
- Base `.hero` (green wash + ink + scrim + `--hero-img`, fixed `height:clamp(560px,62vh,700px)`,
  mobile→auto) backs `.home-hero`/`.chapter-hero`; `.hero-editorial` overrides background/height, and
  `.chapter-hero` now overrides the fixed height too (see above). Plain `.hero` falls back to
  `images/hero-bg.avif`.

### Components & hard rules
- **Hover feedback signals CLICKABILITY — and ONLY that** (HARD user rule: a non-clickable element must
  never glow/lift/change on hover). Hover lift (`translateY`+shadow) is reserved for whole-card LINKS:
  `.chapter-card`, `.chapter-leadership-card`. Flat (no hover): `.service-card`, `.card`,
  `.partner-strip` logos, all member cards (`.officer-card`/`.leader-card`/`.team-member`/`.person-card`).
  Clickable children inside a flat card keep their own hover.
- **SQUARE corners SITE-WIDE** (HARD rule, 2026-08 — promoted from home; there is NO `body.page-home`
  radius override any more, the values are the BASE in each component's own rule, in `styles.css`,
  `admin.css` and the inline styles in admin HTML/`admin.js`): controls (`.btn`/`.btn-donate`/
  `.nav-link`, inputs/selects/textareas) → **4px**; cards, panels, surfaces (`.card`/`.service-card`/
  member cards/`.story-face`/`.map-frame`/`.dropdown-menu`/`.hamburger`/`.contact-form-card`/gallery
  tiles/`.admin-card`/`.chapter-col`/`.upload-dropzone`/modal + lightbox-image panels) → **8px**; icon
  chips (`.service-icon`/`.dropdown-link`) → **6px**. Write the literal px, not a `--radius-*` token.
  KEEP SHAPE: true 999px data pills (`.status-badge`, `.roster-chip`, `.chapter-partner`,
  `.drive-status`, `.initiative-tag`, `.donate-method-badge`, `.lightbox-info`, `.geo-pin-label`,
  accent underline bars); the three `--radius-md` survivors (`.skip-link`, `.social-link`, story chips
  `.story-category`/`.story-overlay-label`); 50% rounds — avatars (`.avatar-initials`/`.avatar-fit`,
  `.member-chip img`, admin `.photo-fit-crop`) and the circular lightbox/carousel close+prev+next.
  Rule of thumb: pills carry status/metadata (keep); things you act on are square.
  `design-system.html` documents the scale and its own `.ds-*` chrome follows it.
- **No decorative top/left "lines" on blocks** (HARD rule): removed `.service-card::before` top strip
  and `.chapter-card.card-edge-*` left spines; accent carried by coloured numeral / data-driven pill.
- **Editorial stat band** (`.impact-band`): big Gabarito numerals (`--accent-dark`, 700, `tabular-nums`
  so the count-up doesn't jitter) + neutral hairline dividers on a **light NEUTRAL ground**
  (`color-mix(in oklch, var(--surface-strong) 55%, var(--paper))` — home's treatment, promoted to the
  base 2026-08 and now the only one; the old soft-accent wash is gone, so the mint stays on the type
  and the numerals). Home+Impact use the `stats` array. (Chapter profile "Impact stats" are a
  DIFFERENT component — `.chapter-stats-row`/`.chapter-stat` bordered cards, not `.impact-band`.)
  Dividers (`border-left`) are scoped to the desktop 5-up row (`@media min-width:901px`) — on
  stacked/2-col layouts the numeral carries the accent (a left spine there would break the no-lines
  HARD rule). Grid laddering: 5 (≥901px) → 3 (≤900) → 2 (≤680 and ≤440); never 1-col.
  **Home-scoped only** is its PAIRING with the impact-intro band above it: `0` top padding and the
  first numeral flushed to the container edge, so the two sections read as one. Other pages keep the
  band's standalone `--space-2xl` padding.
  **`#home-impact-stats` carries a `min-height` reservation** (4 steps on the same 901/680/440
  ladder, separate values for `body.page-impact` because its extra top padding makes the band
  taller) so the empty container doesn't collapse at first paint and shove the first viewport ~148px
  when `renderHomeStats()` fills it. Values are the MEASURED settled height at the shortest width in
  each step, rounded DOWN — the reservation must only ever undershoot, so steady state stays
  pixel-identical; re-measure with the band filled if the stat copy, the column ladder or the band
  padding change. This does NOT break "never render an empty section": `renderHomeStats()` builds
  from a hardcoded array, reads nothing from Firestore, and `hideSectionWhenEmpty()` is never
  pointed at this id — there is no data-driven empty state to pin open.
  Two more containers hydrate late and carry the same kind of reservation, on the same
  only-ever-undershoot doctrine: **`body.page-gallery .gallery-locations { min-height: 100vh }`**
  (the grid IS the page, so an empty one is a failure state, not a legitimate empty section — but
  `:has(> .gallery-empty)` releases it, since `data.js` seeds no `galleryImages` and the one-line
  empty copy would otherwise sit on a viewport of dead white) and
  **`body[data-chapter-id]:not(:has(main)) { padding-top: 100vh }`** — on a COLD start (and with JS
  off) chapter stubs are still navbar + footer only until `ensureChapterProfileLayout()` injects the
  whole `<main>`, so without it the footer paints under the bar and then drops a full page (measured
  cold CLS 0.82). That reserved viewport is also painted in the hero's own ground
  (`color-mix(in oklch, var(--green-deep) 55%, var(--ink))`), not paper: it IS the first screen for
  as long as the fetch takes, and a full viewport of cream reads as a broken page. Its warm-path twin
  is **`body[data-chapter-id] main:not([data-chapter-ready]) { min-height: 100vh }`** — `boot()`
  injects `<main>` in the first paint there, so the `:has()` rule self-cancels immediately and the
  reservation has to move onto `<main>` until `renderChapterProfilePage()` flags it ready. ⚠️ It is
  **padding on the `<body>`**, not a margin on the footer: the navbar is `position:fixed`, so the
  footer is the stub's only in-flow box and its `margin-top` collapses through `<body>` — the body
  keeps a 0×0 box until `<main>` lands and that jump alone scores 0.45. The `:has()`
  self-cancels the moment that `<main>` exists. `ongoing-initiatives.html` still shifts cold
  (~0.377, source the closing `.band--ink`): its three optional sections ship `style="display:none"`,
  so any CSS reservation inside them is a no-op and reserving outside them would pin empty sections
  open. Fixing that needs a markup/JS change, not CSS.
- **Impact-intro band** (`.home-intro`, home only, STATIC markup in `index.html` directly under the
  hero and directly above `#home-impact-stats`): light neutral band holding ONLY the
  `.home-intro-title` in `--green-deep` ("Our impact, thanks to your support") — the 2-col grid,
  "Our work in numbers" CTA and right-column sentence/lede were removed 2026-08 at user request
  (markup + their CSS deleted); the title alone hands off to the numbers.
- **Home section order** (`index.html`): hero → impact-intro band → stat band (`#home-impact-stats`)
  → the problem/programs section (TWO stacked `.section-header`s in ONE `<section>`: "The Gap We’re
  Working to Close" then "How We Bridge the Digital Divide" over `#what-we-do-grid`; the second one
  carries `.section-header--stacked` for its top margin) → Our Reach map (`#global-reach`, moved down from first) → Board of Directors →
  Chapters preview → Photo Stories → footer (the founder-quote `band--ink` was removed 2026-08 at
  user request). Renderers target ids, so
  reordering the containers is safe; keep every container id.
- **Program tiles** (`.service-card` in `.service-grid`, home): THREE numbered pillars from
  `renderWhatWeDo` — 01 Provide Access / 02 Build Digital Literacy / 03 Serve Communities, mirroring
  the hero subtitle triad (user-specified 2026-08-29, replacing the five icon tiles). Marker is
  `.service-step` (Gabarito 700 `--accent-dark` numeral, `tabular-nums`), NOT the `.service-icon`
  chip — the numerals are legitimate here because the order is real (like About's story rail); the
  old unordered 01-05 program numerals are still the thing not to bring back. `.service-icon` (soft
  tile wash + stroke SVG, green/gold/coral/teal via `:nth-child(4n+…)`) remains in `styles.css` for
  other `.service-grid` users. 3-up desktop.
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
- **Chapter location maps** (chapters.html "Where We Are"): two self-contained SVG maps with
  status-coloured pins — `images/maps/florida-roads.svg` and `images/maps/world.svg` (both PD,
  recoloured mint). **No third-party map lib/tiles → no CSP change, same-origin** (deliberately NOT
  Google/Mapbox/Leaflet — the Florida map is a REAL map with roads, but it is still a static file).
  `renderChapterMaps()` renders pins from percent tables
  `FLORIDA_MAP_PINS`/`WORLD_MAP_PINS` (chapters carry no geo in Firestore, so hardcoded like
  `stats`/`FOUNDERS`); each pin resolves name/status/href LIVE via `chapterById()`. Image fills
  `.map-frame` edge-to-edge so `left:X%`==X% of map. Pin classes **`.geo-pin`/`.geo-pin-dot`/`.geo-pin-label`**
  (the legacy `.map-pin` teardrop component that used to hijack markup was deleted in the dead-code sweep).
  - ⚠️ **The two Florida maps are GENERATED, not hand-drawn** (2026-08-18): `florida-roads.svg`
    (this map) and `florida-se-roads.svg` (the home inset) are built by **`tools/maps/build.py`**
    from public-domain geodata — Natural Earth (state outline, the Keys, Lake Okeechobee) and
    TIGER/Line 2023 (roads, county polygons, AREAWATER) — projected with the SAME Albers conic the
    pin tables were calibrated against, so **every pin % below is unchanged**. `tools/maps/README.md`
    has the download commands and the traps; the source data is NOT committed. **Do not hand-edit the
    two files, and never change their `viewBox`** — every pin percentage on the site is expressed in
    it. The plain silhouette `images/maps/florida.svg` STAYS: it still backs the decorative locators
    (chapter-hero `chapterLocatorConfig`, and the inset's own corner locator), where road detail
    would just be noise at ~90px.
  - Both generated maps keep the **sea transparent** (the `.map-frame` wash behind reads as sea):
    the state map cuts Lake Okeechobee with `fill-rule="evenodd"`, the inset cuts every water body
    with an SVG `<mask>` whose water path is also STROKED (dilating water ~150 m — without it the
    offshore county line antialiases into a stray hairline out at sea). The inset's coastline is a
    separately DERIVED layer, because a mask cuts the land path's own stroke and the county boundary
    is offshore anyway.
  - Detail is scaled to what each map's zoom can carry: the state map (~3.1 px/unit) shows only the
    interstates + Florida's Turnpike — US highways were built and rejected as ink without a readable
    feature; the inset (~15.4 px/unit) adds the arterial tier, which is what makes it READ as South
    Florida (the dense coastal grid stopping dead at the Everglades).
  - ⚠️ **Stroke scaling is NOT one rule.** The two frames are not in the `176/24` zoom ratio the old
    files assumed: the state map renders ~570px for 176 units (**3.24 px/unit**) and the inset ~366px
    for 24 units (**15.25 px/unit**), so px/unit differ by **4.7×, not 7.33×** — dividing a stroke by
    `176/24` makes the inset line ~0.64× the state's ON SCREEN. So: the **coastline** is matched in
    PIXELS (`COAST_W_FULL` 0.38 = 1.23px, `COAST_W_SE` 0.08 = 1.22px) because it is the same kind of
    line on both; the **road tiers** keep the ÷`176/24` convention, which lands them deliberately
    finer on the inset since it carries ~10× the line density. Both are set in `tools/maps/build.py`.
    Re-derive them if either frame's rendered width changes.
  - **Map-projection note (how pin %s are derived) — CALIBRATED 2026-08, supersedes the old
    "Miller / equirectangular" note, which was wrong:** pin positions are PROJECTED from each place's
    real lat/lng, not eyeballed.
    - **`florida-roads.svg`** (viewBox `630 435 176 152`) is an **Albers conic**, not equirectangular:
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
  (`images/maps/florida-se-roads.svg`, viewBox **`780 526.5 24 26`** — its own generated map at the
  same ~7× zoom into the same Albers plane; see the generated-maps + stroke-scaling notes under
  Chapter location maps). The old full-width 900px world map + whole-Florida panel
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
  paper halo (works on light & dark); skip-link + `<main id>` are INJECTED once per page by
  `ensureSkipLink()` in `script.js` (DRY — don't add those two to each static head). **`<meta
  name="theme-color" content="#FCFAF5">` is STATIC in every page `<head>`**, on the line right after
  the viewport meta — it used to be injected too, but arriving ~250ms late made mobile browser
  chrome visibly recolour on every navigation, so a new page shell must copy it verbatim (it is
  `--paper` as sRGB hex and must match the page/navbar background; a dark value paints a dark band
  over a near-white page). All 42 head-bearing shells carry it — public, chapter stubs,
  `design-system.html`, every admin page incl. the `chapter-admin.html` template and its 11
  generated `chapter-<id>-admin.html`; only the stale `test-*.html` harnesses and the Google
  verification file are excluded. `:root` has `color-scheme: light`, and `scrollbar-gutter: stable`
  is set on **both `html` AND `body`** so the post-hydration scrollbar can't sidestep the layout
  ~15px — `body { overflow-x: hidden }` makes `<body>` the viewport-defining element, the property
  doesn't inherit, so declaring it only on `html` would be discarded (`body.nav-open`/`.modal-open`
  still drop the gutter while a drawer/modal is open — pre-existing). Lightbox tiles (`.clickable-image`) are `role=button tabindex=0` + Enter/Space
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
  `site/content` AND the `chapterContent` collection via Firestore REST (both URLs carry
  **`?prettyPrint=false`** — the API indents its JSON by default, 871KB vs 327KB raw for the same
  decoded payload; same host, so no CSP change, and the decoded shape is identical, so it needs no
  `SNAPSHOT_VERSION` bump), merges into `window.BFBL_DATA`, sets `window.BFBL_DATA_READY`. Falls back to `data.js` if empty/unreachable — the 3s
  `Promise.race` timeout only exists on a COLD start; a warm start resolves synchronously (below).
- **localStorage SNAPSHOT (warm start)** — repeat visits are served from a cached copy of the last
  good LIVE READ — what Firestore itself returned that load (`fresh`), **not** the merged
  `window.BFBL_DATA` view: key **`bfbl:data:v1`**, shape `{v,t,d}`, ~75KB. `galleryImages` entries are
  stripped to `src/alt/takenAt/locationName/gps` (`GALLERY_SNAPSHOT_FIELDS`) — the flattened `exif`
  blobs are ~68% of the payload and nothing public reads them. A snapshot younger than **10 minutes**
  (`SNAPSHOT_MAX_AGE_MS`) installs into `window.BFBL_DATA` synchronously *before* `script.js` parses
  and resolves `BFBL_DATA_READY` immediately (measured ~3ms warm vs ~250–350ms cold). It also sets
  **`window.BFBL_DATA_SYNC`**, which is what tells `script.js`'s `boot()` it may render the whole
  body at PARSE TIME — i.e. inside the first paint, with no pop-in (see the render pipeline under
  `script.js`). Cold starts have no such flag and keep the old wait. The live fetch still runs in the
  background; it replaces whole keys on `window.BFBL_DATA` — `script.js` has already copied them into
  its own `data` by then — so it refreshes the snapshot for the NEXT navigation and deliberately does
  **not** re-render the current view (no mid-view content swaps).
  - ⚠️ **Bump `SNAPSHOT_VERSION`** on any change to the stored shape — the key follows it, so a stale
    shape can otherwise be served for 10 minutes.
  - ⚠️ **Never merge onto the installed snapshot.** `fetchAll()` rebuilds `people` from `basePeople`
    = Firestore's unassigned `people` when non-empty, else `SEED_PEOPLE` (the `data.js` roster
    captured *before* the snapshot was installed). Using `window.BFBL_DATA.people` there made the
    snapshot its own input: since production's `site/content.people` is EMPTY, a deleted or renamed
    member survived every merge (last-wins, no purge) and was re-persisted with a fresh timestamp, so
    the TTL never expired the ghost. Same reason `fetchAll()` collects every decoded key into a local
    **`fresh = {}`** (alongside writing it to `window.BFBL_DATA`, merged `chapters`/`people` included)
    and calls `writeSnapshot(fresh)`: persisting the merged view would carry a field DELETED from
    Firestore forward and re-stamp it fresh forever.
  - Snapshots are skipped entirely on **`/admin` paths** (`admin.html`'s chapter picker must never be
    up to 10 min stale) and are only written after a genuinely LIVE read (`live` = content doc AND at
    least one chapter doc came back), so an offline load can't cache the `data.js` seed as fresh.
  - **A successful admin save busts the key** — `admin.js` `clearPublicSnapshot()` runs in
    `scheduleSave()`'s success path (so it covers site fields, people AND chapters) and sweeps every
    `bfbl:data:v*` key **on the same origin** — so an editor on www sees their own save immediately.
    A chapter SUBDOMAIN (`vercel.json` redirects) is a separate origin with its own `localStorage`:
    those views, and every other visitor, age out via the 10-min TTL — that's the trade, and it's why
    10 min is the cap. A write made OUTSIDE the admin (`tools/firestore.mjs`)
    busts nothing: clear the key in devtools, or wait out the TTL, before checking the change.
  - Every path is `try/catch`'d — missing, blocked (private mode) or full `localStorage` degrades to
    exactly the old fetch-and-wait behaviour.
- **Auth** — Google sign-in. **Full admins** edit everything: `ADMIN_EMAILS` in `firebase.js` =
  `firestore.rules` `isFullAdmin()` list (keep in sync). **Chapter admins**: `site/content.chapterAdmins`
  (managed in Structure tab) edit ONLY their `chapterContent/<id>` (page+members), enforced by
  `isChapterAdminFor()`. On login `admin.js` routes chapter admins to `chapter-<id>-admin.html` (scoped;
  `SCOPE_CID` gates writes) and full admins away. Sign-out (`#sign-out`) → `signOut()` +
  `location.replace("admin.html")`. **`storage.rules`** = explicit admin email list only (can't read
  chapterAdmins map), so a chapter admin can't upload FILES unless their email is added there.

### Admin = one page per tab
`admin.js` SDK + shared `admin.css` (loads AFTER `styles.css`, so `.btn`/`.impact-card` radii come from
there; admin's own rules follow the same site-wide 4/8/6px scale — incl. the inline `style=` radii in
the admin HTML and `admin.js`). Tabs are links between pages (not in-page switching). `admin.html`
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
    subdomain); (2) ⚠️ check the stub's body tag is `<body class="nav-overlay" data-chapter-id="<id>">`
    — copying a sibling carries `nav-overlay`, but without it the runtime-injected hero renders under a
    solid sticky bar with no top-padding compensation and the page reads as a different site — AND
    that it carries the three `<link rel="preload" as="script">` and the inline first-paint navbar
    `<script>` (see the must-copy-verbatim list under `styles.css`; run both drift greps);
    (3) `chapter-<id>-admin.html` (re-run the sed loop above); (4) Firestore registry entry
    `{id,pageHref}` in `site/content.chapters` AND a `chapterContent/<id>` doc `{page,members}` (use
    `tools/firestore.mjs`); (5) map pin — FL chapters → `FLORIDA_MAP_PINS` + `chapterLocatorConfig` FL
    table (LOCKSTEP, same %s) in `script.js`, and if it's in the SE-Florida metro also
    `FLORIDA_SE_CHAPTER_PINS` (inset %s); others → `WORLD_MAP_PINS` + a region SVG; (6) bump the `stats`
    "Chapters" `raw` count in `script.js` AND every hardcoded count prose — `index.html`
    chapters-preview description, `team.html` (the home hero eyebrow no longer carries a count);
    (7) `sitemap.xml` `<loc>` for the subdomain; (8) `vercel.json` subdomain redirect PAIR (.net + .org)
    — without it the canonical/sitemap subdomain URL just redirects to the homepage; (9) add the chapter
    lead to the chapter doc's members + `page.leadPeople`; (10) optional: mirror into the `data.js` seed
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
  - ⚠️ **These SECURITY headers are currently DORMANT in production** (discovered 2026-07-19):
    they're Firebase-Hosting config, but the site is served by VERCEL. `vercel.json` now has a
    `headers` block, but it carries **Cache-Control only** (see Tech & how to run) — live responses
    still carry no CSP and only Vercel's own HSTS. Still keep `firebase.json` in sync (it's
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
