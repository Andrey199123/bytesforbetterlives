# Bytes for Better Lives

Website for [Bytes for Better Lives](https://www.bytesforbetterlives.net/), a student-led 501(c)(3) nonprofit that helps seniors and kids get comfortable with technology. Our volunteers run tech help sessions at senior communities, teach digital literacy and online safety, and donate devices to schools and shelters.

As of October 2026 we've served 5,700+ people across 124 events, with 216 student volunteers putting in 4,000+ service hours. We've raised $32,000+ in funds and donations and given away 3,900+ items. There are 12 chapters in 6 countries.

## What the site does

Most of the content (members, chapters, photos, fundraisers) lives in Firestore, so chapter leaders can update their own pages through an admin panel without touching code.

- **Admin panel.** Leaders sign in with Google. Full admins can edit everything, and each chapter's admins can only edit their own chapter. Firestore security rules enforce that on the server, so it holds even if someone edits the page in their browser.
- **Chapter pages.** All 12 chapters share one template, and Vercel middleware serves each one on its own subdomain (like `ahs.bytesforbetterlives.net`).
- **Maps.** The chapter and service-site maps are static SVGs. The Florida maps are generated from public-domain map data in `tools/maps/`, and every pin is projected from its real coordinates.
- **Gallery.** Photos are grouped by location and date from their metadata, and Cloudinary serves resized copies so the page loads fast on phones.
- **Crawler snapshots.** The pages are filled in by JavaScript, which most search and AI crawlers don't run, so every deploy pre-renders a static copy of each page for them.

The frontend is plain HTML, CSS, and JavaScript with no framework.

## Running it locally

```
cd public
python3 -m http.server 8000
```

Then open http://localhost:8000. Pushing to `main` deploys to Vercel through GitHub Actions.

## Repository layout

```text
public/             Website pages, scripts, styles, and images
config/firebase/    Firestore and Storage security rules
tools/              Content, image, map, and pre-rendering scripts
.github/workflows/  Deployment pipeline
middleware.js       Chapter subdomain routing and crawler snapshots
```

## Built by

[Andrey Vasilyev](https://github.com/Andrey199123) and Petr Kirsanov.
