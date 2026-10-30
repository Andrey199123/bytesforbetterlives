# Bytes for Better Lives

Website for [Bytes for Better Lives](https://www.bytesforbetterlives.net), a student-led nonprofit that helps seniors and kids get comfortable with technology. We run tech help sessions at senior communities, teach digital literacy and online safety, and donate devices to schools and shelters.

So far that has added up to 5,700+ people served, 124 events, 4,000+ service hours, and 3,900+ donated items, with 12 chapters across 6 countries.

## What's in here

The site is plain HTML, CSS, and JavaScript with no framework or build step. Most of the content (members, chapters, photos, fundraisers) lives in Firestore, so chapter leaders can update their own pages through an admin panel instead of editing code.

- **Admin panel** with Google sign-in. Full admins can edit everything, and each chapter's admins can only edit their own chapter. Firestore security rules enforce this on the server.
- **Chapter pages** for all 12 chapters, generated from one template and served on their own subdomains (like `ahs.bytesforbetterlives.net`) through Vercel middleware.
- **Maps** of where our chapters and service sites are. The Florida maps are generated from public-domain map data (`tools/maps/`), and every pin is projected from its real coordinates.
- **Photo gallery** that groups photos by location and date from their metadata, and serves resized copies through Cloudinary so pages load fast on phones.
- **Pre-rendered snapshots** for search crawlers that don't run JavaScript, built in GitHub Actions on every deploy.

## Running it locally

```
python3 -m http.server 8000 --directory public
```

Then open http://localhost:8000. Pushing to `main` deploys to Vercel through `.github/workflows/vercel-deploy.yml`.

## Repository layout

- `public/`: the complete static website, including pages, browser scripts, styles and images. Files are served at their original URLs, without a `/public` prefix.
- `tools/`: local administration, image helpers, maps and crawler snapshot generation.
- `config/firebase/`: Firestore and Storage security rules.
- `middleware.js`: Vercel routing middleware, kept at the repository root for automatic discovery.
- `.github/workflows/`: the existing deployment pipeline.

Vercel publishes `public/`. Crawler snapshots are generated into `public/_snapshots/` before deployment. Firebase is still the backend only.

## Built by

[Andrey Vasilyev](https://github.com/Andrey199123) and Petr Kirsanov.
