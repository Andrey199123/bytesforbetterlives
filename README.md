# Bytes for Better Lives

### Technology should be for everyone.

The digital home of **Bytes for Better Lives**, a student-led 501(c)(3) nonprofit turning technology access into opportunity. Through senior tech support, digital literacy workshops, online safety education, and device donations, our volunteers help people build the skills and confidence to participate in an increasingly digital world.

[Visit the website](https://www.bytesforbetterlives.net/) · [Explore our impact](https://www.bytesforbetterlives.net/impact.html) · [Meet our chapters](https://www.bytesforbetterlives.net/chapters.html) · [Support the mission](https://www.bytesforbetterlives.net/donate.html)

## Student-led. Community-powered. International in reach.

| Impact | Reach |
| :--- | ---: |
| Funds & donations | **$32,000+** |
| People served | **5,700+** |
| Items donated | **3,900+** |
| Service hours | **4,000+** |
| Student volunteers | **216** |
| Events | **124** |
| Chapters | **12** |
| Countries | **5** |
| Digital media centers | **7** |

*Organization-wide figures provided as of October 2026.*

## A platform built for a growing mission

This repository powers more than a public-facing website. It connects a distributed chapter network through a shared publishing platform, giving student leaders the tools to maintain their own pages while keeping the organization’s identity and content consistent.

### One network, locally led

Chapter profiles bring together leadership, photos, initiatives, and ways to get involved. A shared rendering system supports all 12 chapters, with Vercel routing middleware serving chapter-specific pages on configured subdomains.

### Publishing without a developer bottleneck

Google-authenticated admin tools let authorized leaders manage members, galleries, chapter pages, donation drives, and fundraisers. Content lives in Firestore rather than being hardcoded into each page. Chapter-level access is enforced by server-side security rules, not just hidden controls in the interface.

### Real work, made visible

Interactive maps place chapters and service sites at their geographic coordinates. Photo galleries organize community work by location and capture date, with Cloudinary image delivery, responsive layouts, and a shared lightbox for exploring the details.

### Lightweight delivery, thoughtful engineering

The frontend uses vanilla HTML, CSS, and JavaScript without a framework runtime. Cached content snapshots support faster repeat visits, while deployment-time pre-rendering gives supported search and AI crawlers meaningful page content without requiring JavaScript execution.

## Behind the platform

**HTML · CSS · JavaScript · Firebase · Cloudinary · Vercel · GitHub Actions**

- **Frontend:** a shared design system and data-driven rendering across public pages and admin tools.
- **Content and access:** Firestore, Firebase Authentication, and Firebase Storage.
- **Delivery:** Vercel hosting and routing middleware, with automated deployments through GitHub Actions.
- **Supporting tools:** gallery ingestion, image processing, geographic map generation, and crawler snapshots.

## Inside the repository

```text
public/             Website pages, browser scripts, styles, and images
config/firebase/    Firestore and Storage security rules
tools/              Content, image, map, and pre-rendering utilities
.github/workflows/  Automated deployment pipeline
middleware.js       Chapter routing and crawler snapshot delivery
```

## Built by

[Andrey Vasilyev](https://github.com/Andrey199123) and Petr Kirsanov.

Built to help student volunteers spend less time maintaining a website and more time serving their communities.
