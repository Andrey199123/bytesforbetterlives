(function () {
    const fallbackData = {
        contactEmail: "bytesforbetterlives@gmail.com",
        donateUrl: "https://www.gofundme.com/f/help-provide-ipads-to-local-schools",
        socialLinks: {
            instagram: "https://www.instagram.com/bytesforbetterlives?igsh=cmgzYzEwczV6YWI1",
            linkedin: "https://www.linkedin.com/company/bytes-for-better-lives/about/"
        },
        founders: [],
        officers: [],
        chapters: [],
        gallery: [],
        fundraisers: [],
        volunteers: []
    };

    const data = Object.assign({}, fallbackData, window.BFBL_DATA || {});
    let donateUrl = data.donateUrl || fallbackData.donateUrl;
    let contactEmail = data.contactEmail || fallbackData.contactEmail;

    // Founders are hardcoded here on purpose — they never change, so they are NOT stored in
    // Firestore / data.people and are NOT editable in the admin. Edit this list to update them.
    const FOUNDERS = [
        {
            name: "Aaron Pinto",
            title: "Co-Founder",
            photo: "images/team/aaron-pinto.jpg",
            fallbackPhoto: "images/logo.avif",
            detail: "",
            bio: "Aaron co-founded Bytes for Better Lives to bridge the digital divide through service, education, and donations.",
            contact: "",
            roles: ["founder"]
        },
        {
            name: "Pranav Rai",
            title: "Co-Founder",
            photo: "images/team/pranav-rai.jpg",
            fallbackPhoto: "images/logo.avif",
            detail: "",
            bio: "Pranav co-founded Bytes for Better Lives to help seniors and children build practical technology skills and access.",
            contact: "",
            roles: ["founder"]
        }
    ];

    // Central member registry (data.people): derive the role-specific rosters so the rest of the
    // app can keep using data.founders, data.officers, etc. Re-run whenever the data changes.
    // Founders are always the hardcoded FOUNDERS list (never from data.people / Firestore).
    function deriveRoles() {
        data.founders = FOUNDERS;
        if (!Array.isArray(data.people)) return;
        const byRole = function (role) {
            return data.people.filter(function (person) {
                return person && Array.isArray(person.roles) && person.roles.indexOf(role) !== -1;
            });
        };
        data.officers = byRole("leadership");
        data.design = byRole("design");
        data.volunteers = byRole("volunteer");
    }
    deriveRoles();

    const navItems = [
        { label: "About", href: "about.html" },
        { label: "Impact", href: "impact.html" },
        { label: "Initiatives", href: "ongoing-initiatives.html" },
        { label: "Team", href: "team.html" },
        {
            label: "Chapters",
            href: "chapters.html",
            match: [
                "chapters.html",
                "chapter-ahs.html",
                "chapter-cypress.html",
                "chapter-new-york.html",
                "chapter-gainesville.html",
                "chapter-russia.html",
                "chapter-turkey.html"
            ]
        },
        { label: "Gallery", href: "gallery.html" }
    ];

    // Renders the standalone gallery page's photo grid from data.galleryImages (Firestore).
    function renderGalleryImages() {
        var root = document.querySelector(".photo-gallery-grid");
        if (!root) return;
        var imgs = data.galleryImages || [];
        root.innerHTML = imgs.map(function (im) {
            var src = typeof im === "string" ? im : (im && im.src) || "";
            var alt = typeof im === "string" ? "" : (im && im.alt) || "";
            return '<img class="clickable-image" src="' + escapeHTML(src) + '" alt="' + escapeHTML(alt) + '" loading="lazy" decoding="async" data-fallback="images/logo.avif">';
        }).join("");
    }

    function initRender() {
        initVercelAnalytics();
        renderNavigation();
        initNavDropdowns();
        renderFooter();
        renderHomePage();

        renderChaptersPage();
        renderGalleryPage();
        renderGalleryImages();
        renderInitiativesPage();
        renderTeamPage();
        renderChapterDirectoryPage();
        renderChapterProfilePage();
        initMobileNavigation();
        initImageFallbacks();
        initCarousels();
        initLightbox();
        initStoryCards();
        initFlipCards();
        initRevealEffects();
        initSmoothScroll();
        initCounters();
        initMembersSlider();

        // Ensure flip-card backs never clip text after fonts/images settle (and on resize).
        scheduleFlipCardResize();
        window.addEventListener("load", scheduleFlipCardResize, { once: true });
        window.addEventListener("resize", scheduleFlipCardResize);
    }

    // Render once the live content (firebase-data.js, if present) has loaded — falling back to
    // data.js if Firestore is empty/unreachable. Then re-sync data and derive roles before render.
    document.addEventListener("DOMContentLoaded", function () {
        var ready = (window.BFBL_DATA_READY && typeof window.BFBL_DATA_READY.then === "function")
            ? window.BFBL_DATA_READY
            : Promise.resolve();
        ready.then(function () {
            Object.assign(data, window.BFBL_DATA || {});
            donateUrl = data.donateUrl || donateUrl;
            contactEmail = data.contactEmail || contactEmail;
            deriveRoles();
            initRender();
        });
    });

    let flipCardResizeRaf = null;
    function scheduleFlipCardResize() {
        if (flipCardResizeRaf) return;
        flipCardResizeRaf = window.requestAnimationFrame(function () {
            flipCardResizeRaf = null;
            resizeFlipCardsToFitBackContent(document);
        });
    }

    function initVercelAnalytics() {
        // Vercel Web Analytics (static HTML/JS).
        // Safe on non-Vercel hosts: script will 404 and be ignored.
        // Docs/community show an HTML snippet using `window.vaq` + the insights script.
        if (window.__bfblVercelAnalytics) return;
        window.__bfblVercelAnalytics = true;

        window.va = window.va || function () {
            (window.vaq = window.vaq || []).push(arguments);
        };

        const script = document.createElement("script");
        script.defer = true;
        script.src = "/_vercel/insights/script.js";
        script.onerror = function () {
            // Ignore (Netlify/GitHub Pages/etc).
        };
        document.head.appendChild(script);
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (char) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[char];
        });
    }

    function currentPageName() {
        return window.location.pathname.split("/").pop() || "index.html";
    }

    function setText(selector, value) {
        const element = document.querySelector(selector);
        if (element) element.textContent = value;
    }

    function statusKey(status) {
        return String(status || "").trim().toLowerCase();
    }

    function statusClass(status) {
        const key = statusKey(status);
        if (key === "active") return "status-active";
        if (key === "launching") return "status-launching";
        return "status-prospective";
    }

    function statusLabel(status, chapter) {
        const tag = chapter && chapter.statusTag ? String(chapter.statusTag).trim() : "";
        const value = tag || (status || "Prospective");
        return `${value} Chapter`;
    }

    function isExecutiveChapter(chapter) {
        const tag = chapter && chapter.statusTag ? String(chapter.statusTag).trim() : "";
        return tag.toLowerCase() === "executive";
    }

    function chapterStatusBadgeMarkup(chapter) {
        if (!isExecutiveChapter(chapter)) return "";
        const tag = String(chapter.statusTag).trim();
        return `<span class="status-badge status-executive">${escapeHTML(tag)} Chapter</span>`;
    }

    function chapterStatusDetail(chapter) {
        return isExecutiveChapter(chapter) ? statusLabel(chapter.status, chapter) : "";
    }

    function imageMarkup(src, alt, className, fallback, loading, fetchPriority) {
        const loadMode = loading === "eager" ? "eager" : "lazy";
        const priorityAttr = fetchPriority ? ` fetchpriority="${escapeHTML(fetchPriority)}"` : "";
        return `<img src="${escapeHTML(src || "images/logo.avif")}" alt="${escapeHTML(alt || "Bytes for Better Lives image")}"${className ? ` class="${escapeHTML(className)}"` : ""} data-fallback="${escapeHTML(fallback || "images/logo.avif")}" loading="${loadMode}" decoding="async"${priorityAttr}>`;
    }

    // Up to two initials from a name, e.g. "Aaron Pinto" -> "AP", "Ipek" -> "IP".
    function personInitials(name) {
        const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return "?";
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    // A photo only "counts" if it's a real portrait — the logo placeholder means "no picture".
    function hasRealPhoto(photo) {
        return Boolean(photo) && !/logo\.avif(\?|#|$)/i.test(photo);
    }

    function initialsAvatarMarkup(name, className) {
        return `<span class="avatar-initials${className ? ` ${escapeHTML(className)}` : ""}" role="img" aria-label="${escapeHTML(name || "Member")}">${escapeHTML(personInitials(name))}</span>`;
    }

    // Renders a person's portrait, or their initials on the brand green when no real photo exists.
    // If a real photo fails to load, initImageFallbacks swaps it for the initials avatar.
    function personPhotoMarkup(name, photo, className, loading, fetchPriority) {
        if (!hasRealPhoto(photo)) return initialsAvatarMarkup(name, className);
        const loadMode = loading === "eager" ? "eager" : "lazy";
        const priorityAttr = fetchPriority ? ` fetchpriority="${escapeHTML(fetchPriority)}"` : "";
        return `<img src="${escapeHTML(photo)}" alt="${escapeHTML(`${name || "Member"} portrait`)}"${className ? ` class="${escapeHTML(className)}"` : ""} data-name="${escapeHTML(name || "")}" data-initials-fallback="1" loading="${loadMode}" decoding="async"${priorityAttr}>`;
    }

    // Look up a person in the central registry (data.people) by name.
    function personByName(name) {
        if (!name) return null;
        const key = String(name).trim().toLowerCase();
        return (data.people || []).find(function (person) {
            return person && String(person.name).trim().toLowerCase() === key;
        }) || null;
    }

    // Resolve a chapter-lead reference against the registry so displayed details
    // (photo, bio, canonical name) come from the single source of truth, with the
    // chapter's own values as a fallback for anyone not yet in the registry.
    function resolvePersonRef(ref, chapter) {
        const registry = personByName(ref && ref.name) || {};
        return {
            name: (ref && ref.name) || registry.name || (chapter && chapter.leadName) || "Chapter Lead",
            title: (ref && ref.title) || registry.title || (chapter && chapter.leadTitle) || "Chapter Lead",
            photo: registry.photo || (ref && ref.photo) || (chapter && chapter.leadPhoto) || "images/logo.avif",
            fallbackPhoto: registry.fallbackPhoto || "images/logo.avif",
            bio: registry.bio || ""
        };
    }

    function chapterLeadPeople(chapter) {
        const refs = Array.isArray(chapter.leadPeople)
            ? chapter.leadPeople.filter(function (person) { return person && person.name; })
            : [];

        if (refs.length) {
            return refs.map(function (ref) { return resolvePersonRef(ref, chapter); });
        }

        return [resolvePersonRef({
            name: chapter.leadName,
            title: chapter.leadTitle,
            photo: chapter.leadPhoto
        }, chapter)];
    }

    function chapterLeadAvatarMarkup(chapter, modifierClass) {
        const people = chapterLeadPeople(chapter);
        const label = people.length > 1 ? `${chapter.leadName} portraits` : `${people[0].name} portrait`;
        return `
            <div class="chapter-lead-avatars${modifierClass ? ` ${escapeHTML(modifierClass)}` : ""}" aria-label="${escapeHTML(label)}">
                ${people.map(function (person) {
                    return personPhotoMarkup(person.name, person.photo || chapter.leadPhoto, "chapter-lead-photo", "eager");
                }).join("")}
            </div>
        `;
    }

    function chapterLeadPeopleText(chapter) {
        return chapterLeadPeople(chapter).map(function (person) {
            return person.name;
        }).join(" / ");
    }

    function activeChapters() {
        return (data.chapters || []).filter(function (chapter) {
            return chapter.status === "Active";
        });
    }

    function pipelineChapters() {
        return (data.chapters || []).filter(function (chapter) {
            return chapter.status !== "Active";
        });
    }

    function renderNavigation() {
        const page = currentPageName();
        const menus = document.querySelectorAll(".nav-menu");
        if (!menus.length) return;

        function chaptersDropdownMarkup(item) {
            const allChaptersLink = `<li><a href="${escapeHTML(item.href)}" class="dropdown-link${page === item.href ? " active" : ""}">All Chapters</a></li>`;
            const chapterLinks = (data.chapters || []).map(function (chapter) {
                const href = chapter.pageHref || `chapter-${chapter.id}.html`;
                const isActive = page === href;
                return `<li><a href="${escapeHTML(href)}" class="dropdown-link${isActive ? " active" : ""}">${escapeHTML(chapter.name)}</a></li>`;
            }).join("");

            const isActive = page === item.href || page.indexOf("chapter-") === 0;
            return `
                <li class="nav-item dropdown">
                    <a href="${escapeHTML(item.href)}" class="nav-link dropdown-toggle${isActive ? " active" : ""}" aria-haspopup="true" aria-expanded="false">
                        ${escapeHTML(item.label)} <span class="dropdown-caret" aria-hidden="true">▾</span>
                    </a>
                    <ul class="dropdown-menu" aria-label="Chapter pages">
                        ${allChaptersLink}
                        ${chapterLinks}
                    </ul>
                </li>
            `;
        }

        const items = navItems.map(function (item) {
            if (item.label === "Chapters") return chaptersDropdownMarkup(item);
            const matches = item.match || [item.href];
            const isActive = matches.includes(page);
            return `<li><a href="${escapeHTML(item.href)}" class="nav-link${isActive ? " active" : ""}">${escapeHTML(item.label)}</a></li>`;
        }).join("");

        const donateItem = `<li><a href="${escapeHTML(donateUrl)}" target="_blank" rel="noopener" class="btn-donate">Donate</a></li>`;
        menus.forEach(function (menu) {
            menu.innerHTML = items + donateItem;
        });
    }

    function initNavDropdowns() {
        const touchLike = window.matchMedia && window.matchMedia("(hover: none), (pointer: coarse)").matches;
        const dropdowns = document.querySelectorAll(".nav-item.dropdown");
        if (!dropdowns.length) return;

        dropdowns.forEach(function (dropdown) {
            const toggle = dropdown.querySelector(".dropdown-toggle");
            if (!toggle) return;
            if (toggle.dataset.dropdownBound) return;
            toggle.dataset.dropdownBound = "true";

            function setExpanded(isOpen) {
                dropdown.classList.toggle("dropdown-open", isOpen);
                toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
            }

            if (touchLike) {
                toggle.addEventListener("click", function (event) {
                    // On touch devices, first tap opens the menu (links are inside the dropdown).
                    event.preventDefault();
                    const isOpen = dropdown.classList.contains("dropdown-open");
                    // Close others.
                    dropdowns.forEach(function (other) {
                        if (other !== dropdown) {
                            const otherToggle = other.querySelector(".dropdown-toggle");
                            other.classList.remove("dropdown-open");
                            if (otherToggle) otherToggle.setAttribute("aria-expanded", "false");
                        }
                    });
                    setExpanded(!isOpen);
                });

                document.addEventListener("click", function (event) {
                    if (dropdown.contains(event.target)) return;
                    setExpanded(false);
                });
            } else {
                // Keep aria-expanded roughly in sync for keyboard/mouse.
                dropdown.addEventListener("mouseenter", function () { setExpanded(true); });
                dropdown.addEventListener("mouseleave", function () { setExpanded(false); });
                toggle.addEventListener("focus", function () { setExpanded(true); });
            }
        });
    }

    function renderFooter() {
        const footerContainer = document.querySelector(".footer .container");
        if (!footerContainer) return;

        const quickLinks = [
            ["Home", "index.html"],
            ["About", "about.html"],
            ["Impact", "impact.html"],
            ["Initiatives", "ongoing-initiatives.html"],
            ["Team", "team.html"],
            ["Chapters", "chapters.html"],
            ["Admin", "admin.html"]
        ];

        const programLinks = [
            ["Start a Chapter", "chapters.html#start-chapter"],
            ["Volunteer", "contact.html"]
        ];

        footerContainer.innerHTML = `
            <div class="footer-content">
                <div class="footer-section">
                    <div class="footer-logo">
                        <img src="images/logo.avif" alt="Bytes for Better Lives logo" loading="lazy">
                        <h3>Bytes for Better Lives</h3>
                    </div>
                    <p>A South Florida student-led nonprofit bridging the digital divide for seniors and children through service, education, donations, and community outreach.</p>
                </div>
                <div class="footer-section">
                    <h3>Quick Links</h3>
                    ${quickLinks.map(function (link) {
                        return `<a href="${link[1]}">${link[0]}</a>`;
                    }).join("")}
                </div>
                <div class="footer-section">
                    <h3>Programs</h3>
                    ${programLinks.map(function (link) {
                        return `<a href="${link[1]}">${link[0]}</a>`;
                    }).join("")}
                    <a href="${escapeHTML(donateUrl)}" target="_blank" rel="noopener">Donate</a>
                </div>
                <div class="footer-section">
                    <h3>Contact</h3>
                    <a href="mailto:${escapeHTML(contactEmail)}">${escapeHTML(contactEmail)}</a>
                    <div class="social-links" style="display: flex; gap: 1rem; align-items: center;">
                        <a class="social-link" href="${escapeHTML(data.socialLinks.instagram)}" target="_blank" rel="noopener" title="Instagram" style="width: 40px; height: 40px; padding: 0;">
                            <img src="images/contact us logo/instagram logo.jpg" alt="Instagram" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
                        </a>
                        <a class="social-link" href="${escapeHTML(data.socialLinks.linkedin)}" target="_blank" rel="noopener" title="LinkedIn" style="width: 40px; height: 40px; padding: 0;">
                            <img src="images/contact us logo/linkedin.jpeg" alt="LinkedIn" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
                        </a>
                    </div>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; ${new Date().getFullYear()} Bytes for Better Lives Corporation.</p>
            </div>
        `;
    }

    function renderHomePage() {
        renderHomeStats();
        renderWhatWeDo();
        // Homepage preview stays focused on the top leadership roles.
        renderOfficerGrid("#executive-board-preview", (data.officers || []).slice(0, 3), true);
        renderChapterPreview();
        renderGalleryPreview();
    }

    function renderHomeStats() {
        const root = document.querySelector("#home-impact-stats");
        if (!root) return;

        const stats = [
            { raw: 8450, prefix: "$", suffix: "", label: "Fundraised", note: "for technology access and outreach", decimals: 0 },
            { raw: 2350, prefix: "", suffix: "+", label: "Donations Amassed", note: "games, devices, and supplies", decimals: 0 },
            { raw: 1500, prefix: "", suffix: "+", label: "Students Reached", note: "through education and drives", decimals: 0 },
            { raw: 3500, prefix: "", suffix: "+", label: "Seniors Helped", note: "with tech help and safety lessons", decimals: 0 },
            { raw: 5, prefix: "", suffix: "+", label: "Chapters", note: "active and launching chapter network", decimals: 0 }
        ];

        root.innerHTML = `
            <div class="container">
                <div class="stats-grid">
                    ${stats.map(function (stat) {
                        return `
                            <article class="stat-card">
                                <div class="stat-number animated-counter" data-target="${stat.raw}" data-prefix="${stat.prefix}" data-suffix="${stat.suffix}" data-decimals="${stat.decimals}">0</div>
                                <div class="stat-label">${escapeHTML(stat.label)}</div>
                                <p class="stat-note">${escapeHTML(stat.note)}</p>
                            </article>
                        `;
                    }).join("")}
                </div>
            </div>
        `;
    }

    function renderWhatWeDo() {
        const root = document.querySelector("#what-we-do-grid");
        if (!root) return;

        const services = [
            {
                title: "Senior Tech Help",
                text: "Patient, hands-on help with phones, iPads, laptops, video calls, email, settings, photos, and everyday digital tasks."
            },
            {
                title: "Digital Literacy Presentations",
                text: "Clear lessons that teach students, families, and community members how to use technology with confidence."
            },
            {
                title: "Online Safety Education",
                text: "Practical presentations that help seniors recognize scams, phishing, unsafe links, and privacy risks."
            },
            {
                title: "iPad and Board Game Donations",
                text: "Donation projects that put useful devices, learning tools, and screen-free activities into the hands of children and families."
            },
            {
                title: "Chapter Expansion",
                text: "A responsible chapter model that lets student leaders bring BFBL service projects to new communities with clear status labels."
            }
        ];

        root.innerHTML = services.map(function (service, index) {
            return `
                <article class="service-card">
                    <span class="service-number">${String(index + 1).padStart(2, "0")}</span>
                    <h3>${escapeHTML(service.title)}</h3>
                    <p>${escapeHTML(service.text)}</p>
                </article>
            `;
        }).join("");
    }

    function officerCard(officer, compact) {
        const detailLine = officer.detail ? `<p class="officer-detail">${escapeHTML(officer.detail)}</p>` : "";
        const bioLine = officer.bio
            ? `<p class="officer-bio${compact ? " officer-bio-compact" : ""}">${escapeHTML(officer.bio)}</p>`
            : "";
        return `
            <article class="officer-card">
                <div class="portrait-frame">
                    ${personPhotoMarkup(officer.name, officer.photo, "", "eager", "high")}
                </div>
                <div>
                    <h3>${escapeHTML(officer.name)}</h3>
                    <p class="officer-title">${escapeHTML(officer.title)}</p>
                    ${detailLine}
                </div>
                ${bioLine}
            </article>
        `;
    }

    function renderOfficerGrid(selector, officers, compact) {
        const root = document.querySelector(selector);
        if (!root) return;
        root.innerHTML = (officers || []).map(function (officer) {
            return officerCard(officer, compact);
        }).join("");
    }

    function chapterNameById(id) {
        const c = (data.chapters || []).find(function (ch) { return ch && ch.id === id; });
        return c ? c.name : "";
    }

    // Public-facing display title. Executive-board members show their board title; everyone else
    // shows "Title ⋅ Chapter Name" when they belong to a chapter.
    function memberDisplayTitle(person) {
        if (!person) return "";
        if (person.execBoard) return person.execTitle || person.title || "";
        const base = person.title || "";
        const chName = person.chapter ? chapterNameById(person.chapter) : "";
        if (base && chName) return base + " ⋅ " + chName;
        return base || chName;
    }

    // Public-facing bio. Board members show their separate executive bio (falling back to the
    // regular bio if none); everyone else shows their regular bio.
    function memberDisplayBio(person) {
        if (!person) return "";
        if (person.execBoard) return person.execBio || person.bio || "";
        return person.bio || "";
    }

    // Clone a registry person with its public display title + bio applied (for renderOfficerGrid).
    function withDisplayTitle(person) {
        return Object.assign({}, person, {
            title: memberDisplayTitle(person),
            bio: memberDisplayBio(person)
        });
    }

    function renderHomeChapterOfficers() {
        const root = document.querySelector("#home-chapter-officers");
        if (!root) return;

        root.innerHTML = (data.chapters || []).map(function (chapter) {
            return `
                <article class="chapter-officer-item">
                    <div class="chapter-officer-identity">
                        ${chapterLeadAvatarMarkup(chapter, "chapter-lead-avatars-large")}
                        <div>
                            <h3>${escapeHTML(chapter.leadName)}</h3>
                        </div>
                    </div>
                    <div class="chapter-officer-copy">
                        <div class="chapter-officer-heading">
                            <strong>${escapeHTML(chapter.name)}</strong>
                            ${chapterStatusBadgeMarkup(chapter)}
                        </div>
                        <p class="chapter-officer-people">${escapeHTML(chapterLeadPeopleText(chapter))}</p>
                        <p class="chapter-officer-description">${escapeHTML(chapter.leadBio || chapter.description)}</p>
                    </div>
                </article>
            `;
        }).join("");
    }

    function renderChapterPreview() {
        const root = document.querySelector("#chapters-preview-grid");
        if (!root) return;
        root.innerHTML = (data.chapters || []).slice(0, 3).map(chapterDirectoryCardMarkup).join("");
    }

    function renderChapterDirectoryPage() {
        const root = document.querySelector("#chapters-directory-grid");
        if (!root) return;
        root.innerHTML = (data.chapters || []).map(chapterDirectoryCardMarkup).join("");
    }

    function chapterDirectoryCardMarkup(chapter) {
        const pageHref = chapter.pageHref || `chapter-${chapter.id}.html`;
        const leadNames = chapterLeadPeopleText(chapter);
        return `
            <a class="chapter-card" href="${escapeHTML(pageHref)}" aria-label="View ${escapeHTML(chapter.name)}">
                <div class="chapter-card-header">
                    <div>
                        <h3>${escapeHTML(chapter.name)}</h3>
                        <p>${escapeHTML(chapter.location)}</p>
                    </div>
                    ${chapterStatusBadgeMarkup(chapter)}
                </div>
                <div class="chapter-lead">
                    ${chapterLeadAvatarMarkup(chapter)}
                    <div>
                        <strong>${escapeHTML(chapter.leadName)}</strong>
                    </div>
                </div>
                <p style="color: var(--ink-soft); font-weight: 700; margin: 0;">${escapeHTML(leadNames)}</p>
                <p>${escapeHTML(chapter.description)}</p>
                <span class="btn btn-quiet chapter-actions">View Chapter</span>
            </a>
        `;
    }

    // "Support this Chapter" CTA: use the chapter's own fundraiser link if it has one,
    // otherwise fall back to the site-wide donate URL.
    function chapterSupportUrl(chapter) {
        const fundraisers = Array.isArray(data.fundraisers) ? data.fundraisers : [];
        const chapterFundraiser = fundraisers.find(function (item) {
            return item && item.chapterId === chapter.id && item.url && String(item.url).trim() && String(item.url).trim() !== "#";
        });
        return (chapterFundraiser && String(chapterFundraiser.url).trim()) || donateUrl;
    }

    // Human-readable label for a member category (role) id, from data.categories when available.
    function categoryLabel(id) {
        const cats = Array.isArray(data.categories) ? data.categories : [];
        const found = cats.find(function (c) { return c && c.id === id; });
        if (found) return found.label || found.id;
        const defaults = { founder: "Founders", leadership: "Leadership", design: "Design", volunteer: "Volunteers" };
        if (defaults[id]) return defaults[id];
        return id ? id.charAt(0).toUpperCase() + id.slice(1) : "Members";
    }

    // Render members assigned to this chapter (person.chapter === chapter.id), grouped by their
    // category (roles[0]), into #chapter-members.
    function renderChapterMembersByCategory(chapter) {
        const root = document.querySelector("#chapter-members");
        if (!root) return;

        const people = Array.isArray(data.people) ? data.people : [];
        const members = people.filter(function (p) { return p && p.chapter === chapter.id; });

        if (!members.length) {
            root.innerHTML = `<p class="lead-text">Member roster coming soon.</p>`;
            return;
        }

        const order = Array.isArray(data.categories)
            ? data.categories.map(function (c) { return c && c.id; })
            : [];
        const groups = {};
        members.forEach(function (p) {
            const cat = (Array.isArray(p.roles) && p.roles[0]) ? p.roles[0] : "member";
            (groups[cat] = groups[cat] || []).push(p);
        });

        const catIds = Object.keys(groups).sort(function (a, b) {
            const ia = order.indexOf(a);
            const ib = order.indexOf(b);
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        });

        root.innerHTML = catIds.map(function (cat) {
            const cards = groups[cat].map(function (p) {
                return officerCard({
                    name: p.name,
                    // On a chapter page, board members show their chapter position (regular title)
                    // and regular bio — not their org executive title/bio.
                    title: p.execBoard ? (p.title || "") : memberDisplayTitle(p),
                    detail: p.detail || "",
                    photo: p.photo || "images/logo.avif",
                    bio: p.bio || ""
                }, false);
            }).join("");
            return `
                <h3 class="team-subsection-title">${escapeHTML(categoryLabel(cat))}</h3>
                <div class="officer-grid officer-grid-dense mt-2">${cards}</div>
            `;
        }).join("");
    }

    function renderChapterProfilePage() {
        const chapterId = (document.body && document.body.dataset ? document.body.dataset.chapterId : "") || "";
        if (!chapterId) return;

        ensureChapterProfileLayout();

        const chapter = (data.chapters || []).find(function (item) {
            return item && item.id === chapterId;
        });

        if (!chapter) {
            const missing = document.querySelector("#chapter-not-found");
            if (missing) missing.style.display = "block";
            return;
        }

        const titleEl = document.querySelector("#chapter-page-title");
        if (titleEl) titleEl.textContent = chapter.name;

        const subtitleEl = document.querySelector("#chapter-page-subtitle");
        if (subtitleEl) {
            const statusDetail = chapterStatusDetail(chapter);
            subtitleEl.textContent = statusDetail
                ? `${chapter.location} \u2022 ${statusDetail}`
                : chapter.location;
        }

        const descriptionEl = document.querySelector("#chapter-page-description");
        if (descriptionEl) descriptionEl.textContent = chapter.leadBio || chapter.description || "";

        const actionsEl = document.querySelector("#chapter-page-actions");
        if (actionsEl) {
            actionsEl.innerHTML = `<a href="${escapeHTML(chapterSupportUrl(chapter))}" target="_blank" rel="noopener" class="btn btn-primary">Support this Chapter</a>`;
        }

        renderChapterMembersByCategory(chapter);

        const photoGrid = document.querySelector("#chapter-photo-grid");
        if (photoGrid) {
            const photos = chapter.photos && chapter.photos.length ? chapter.photos : [];
            photoGrid.innerHTML = photos.map(function (photo, index) {
                return imageMarkup(photo, `${chapter.name} photo ${index + 1}`, "", "images/logo.avif");
            }).join("");
        }
    }

    function ensureChapterProfileLayout() {
        // Chapter profile pages are intentionally lightweight shells.
        // If the expected containers aren't present, inject the chapter layout so older pages still render.
        if (document.querySelector("#chapter-page-title")) return;

        const footer = document.querySelector(".footer");
        const main = document.createElement("main");
        main.innerHTML = `
            <section class="hero chapter-hero">
                <div class="hero-content">
                    <p class="eyebrow">Chapter</p>
                    <h1 id="chapter-page-title">Chapter</h1>
                    <p class="hero-subtitle" id="chapter-page-subtitle"></p>
                    <p class="hero-subtitle" id="chapter-page-description"></p>
                    <div class="hero-actions" id="chapter-page-actions"></div>
                </div>
            </section>

            <section class="section">
                <div class="container">
                    <div id="chapter-not-found" class="impact-card" style="display: none;">
                        <h2>Chapter not found</h2>
                        <p class="lead-text">We could not find this chapter. Please return to the chapters directory.</p>
                        <div class="btn-row mt-2">
                            <a href="chapters.html" class="btn btn-primary">All Chapters</a>
                        </div>
                    </div>

                    <div class="section-header">
                        <p class="section-kicker">Members</p>
                        <h2 class="section-title">Chapter members</h2>
                        <p class="section-description">The students leading and volunteering with this chapter.</p>
                    </div>
                    <div id="chapter-members"></div>
                </div>
            </section>

            <section class="section surface-band">
                <div class="container">
                    <div class="section-header">
                        <p class="section-kicker">Gallery</p>
                        <h2 class="section-title">Chapter highlights</h2>
                        <p class="section-description">A few moments from chapter events and community outreach.</p>
                    </div>
                    <div class="chapter-photo-grid" id="chapter-photo-grid" aria-label="Chapter photos"></div>
                </div>
            </section>
        `;

        if (footer && footer.parentNode) {
            footer.parentNode.insertBefore(main, footer);
        } else {
            document.body.appendChild(main);
        }
    }

    function renderGalleryPreview() {
        const root = document.querySelector("#gallery-preview-grid");
        if (!root) return;
        root.innerHTML = (data.gallery || []).slice(0, 3).map(storyCardMarkup).join("");
    }

    function renderLeadershipPage() {
        const mainCard = document.querySelector("#main-chapter-card");
        const mainOfficers = document.querySelector("#main-chapter-officers");
        const chapterGrid = document.querySelector("#leadership-chapters-grid");
        const allOfficers = document.querySelector("#all-officers-grid");

        // Backwards-compatible support for older leadership layouts.
        if (!mainCard && !mainOfficers && !chapterGrid && !allOfficers) {
            renderOfficerGrid("#executive-board-grid", data.officers || [], false);

            const chapterLeaders = document.querySelector("#chapter-leaders-grid");
            if (!chapterLeaders) return;

            chapterLeaders.innerHTML = (data.chapters || []).map(function (chapter) {
                return `
                    <article class="leader-card">
                        <div class="chapter-lead">
                            ${chapterLeadAvatarMarkup(chapter)}
                            <div>
                                <h3>${escapeHTML(chapter.leadName)}</h3>
                            </div>
                        </div>
                        ${chapterStatusBadgeMarkup(chapter)}
                        <p><strong>${escapeHTML(chapter.name)}</strong> - ${escapeHTML(chapter.location)}</p>
                        <p>${escapeHTML(chapterLeadPeopleText(chapter))}</p>
                        <p>${escapeHTML(chapter.description)}</p>
                    </article>
                `;
            }).join("");
            return;
        }

        const mainChapter = (data.chapters || []).find(function (chapter) {
            return chapter && chapter.id === "ahs";
        });

        if (mainCard && mainChapter) {
            mainCard.innerHTML = mainChapterSummaryMarkup(mainChapter);
        }

        const foundersGrid = document.querySelector("#founders-grid");
        if (foundersGrid) {
            renderOfficerGrid("#founders-grid", data.founders || [], false);
        }

        if (mainOfficers) {
            renderOfficerGrid("#main-chapter-officers", data.officers || [], false);
        }

        if (chapterGrid) {
            chapterGrid.innerHTML = (data.chapters || [])
                .filter(function (chapter) { return chapter && chapter.id !== "ahs"; })
                .map(leadershipChapterCardMarkup)
                .join("");
        }

        if (allOfficers) {
            const directory = allOfficerDirectory();
            allOfficers.innerHTML = directory.map(personCardMarkup).join("");
        }
    }

    function mainChapterSummaryMarkup(chapter) {
        return `
            <article class="chapter-summary-card">
                <div class="chapter-card-header">
                    <div>
                        <p class="kicker-small">Founding Chapter</p>
                        <h3>${escapeHTML(chapter.name)}</h3>
                        <p class="chapter-location">${escapeHTML(chapter.location)}</p>
                    </div>
                    ${chapterStatusBadgeMarkup(chapter)}
                </div>
                <div class="chapter-lead mt-1">
                    ${chapterLeadAvatarMarkup(chapter)}
                    <div>
                        <strong>${escapeHTML(chapterLeadPeopleText(chapter))}</strong>
                        <p class="chapter-lead-note">Executive board leadership</p>
                    </div>
                </div>
                <p class="mt-1">${escapeHTML(chapter.description)}</p>
                <div class="btn-row mt-2">
                    <a href="chapters.html#${escapeHTML(chapter.id)}" class="btn btn-quiet">View Chapter</a>
                    <a href="chapters.html#start-chapter" class="btn btn-secondary">Start a Chapter</a>
                </div>
            </article>
        `;
    }

    function leadershipChapterCardMarkup(chapter) {
        return `
            <article class="chapter-card chapter-card-link">
                <div class="chapter-card-header">
                    <div>
                        <h3>${escapeHTML(chapter.name)}</h3>
                        <p>${escapeHTML(chapter.location)}</p>
                    </div>
                    ${chapterStatusBadgeMarkup(chapter)}
                </div>
                <div class="chapter-lead">
                    ${chapterLeadAvatarMarkup(chapter)}
                    <div>
                        <strong>${escapeHTML(chapter.leadName)}</strong>
                    </div>
                </div>
                <p>${escapeHTML(chapter.description)}</p>
                <div class="btn-row mt-1">
                    <a class="btn btn-quiet" href="chapters.html#${escapeHTML(chapter.id)}">View Chapter</a>
                </div>
            </article>
        `;
    }

    function allOfficerDirectory() {
        const people = [];

        (data.officers || []).forEach(function (officer) {
            if (!officer || !officer.name) return;
            people.push({
                key: `officer:${officer.name}`,
                name: officer.name,
                title: memberDisplayTitle(officer),
                detail: officer.detail || "AHS Chapter",
                photo: officer.photo,
                fallbackPhoto: officer.fallbackPhoto || "images/logo.avif",
                bio: memberDisplayBio(officer)
            });
        });

        (data.chapters || [])
            .filter(function (chapter) { return chapter && chapter.id !== "ahs"; })
            .forEach(function (chapter) {
                chapterLeadPeople(chapter).forEach(function (person) {
                    if (!person || !person.name) return;
                    people.push({
                        key: `chapter:${chapter.id}:${person.name}`,
                        name: person.name,
                        title: chapter.name,
                        detail: chapterStatusDetail(chapter),
                        photo: person.photo || chapter.leadPhoto || "images/logo.avif",
                        fallbackPhoto: "images/logo.avif",
                        bio: chapter.leadBio || chapter.description || ""
                    });
                });
            });

        // De-dupe by name + title while preserving order.
        const seen = new Set();
        return people.filter(function (person) {
            const id = `${person.name}::${person.title}`;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    }

    function personCardMarkup(person) {
        return `
            <article class="person-card">
                ${personPhotoMarkup(person.name, person.photo, "person-avatar", "eager")}
                <div class="person-meta">
                    <div class="person-header">
                        <h3>${escapeHTML(person.name)}</h3>
                        ${person.detail ? `<span class="person-pill">${escapeHTML(person.detail)}</span>` : ""}
                    </div>
                    <p class="person-role">${escapeHTML(person.title)}</p>
                    ${person.bio ? `<p class="person-bio">${escapeHTML(person.bio)}</p>` : ""}
                </div>
            </article>
        `;
    }

    function renderChaptersPage() {
        const summary = document.querySelector("#chapter-summary");
        const mapRoot = document.querySelector("#chapter-map");
        const gridRoot = document.querySelector("#chapter-grid");
        const detailRoot = document.querySelector("#chapter-detail");
        if (!summary && !mapRoot && !gridRoot && !detailRoot) return;

        const activeCount = activeChapters().length;
        const pipelineCount = pipelineChapters().length;
        setText("#active-chapter-count", activeCount);
        setText("#pipeline-chapter-count", pipelineCount);

        if (summary) {
            summary.innerHTML = `
                <article class="impact-card">
                    <div class="stat-number" id="active-chapter-count">${activeCount}</div>
                    <div class="stat-label">Active Chapters</div>
                    <p>Only chapters marked as Active are counted here.</p>
                </article>
                <article class="impact-card">
                    <div class="stat-number" id="pipeline-chapter-count">${pipelineCount}</div>
                    <div class="stat-label">Launching or Prospective</div>
                    <p>These chapters are clearly labeled while they develop.</p>
                </article>
                <article class="impact-card chapter-model">
                    <h3>Chapter Model</h3>
                    <p>BFBL chapters are student-led service teams that bring senior tech help, digital literacy education, online safety presentations, and donation projects to local communities.</p>
                </article>
            `;
        }

        if (mapRoot) {
            mapRoot.innerHTML = createWorldMapSvg() + (data.chapters || []).map(function (chapter) {
                const pos = coordinatesToPercent(chapter.coordinates);
                return `
                    <button class="map-pin ${statusClass(chapter.status)}" style="--x: ${pos.x}%; --y: ${pos.y}%;" data-chapter-select="${escapeHTML(chapter.id)}" aria-label="View ${escapeHTML(chapter.name)}">
                        <span>${escapeHTML(chapter.name)}</span>
                    </button>
                `;
            }).join("");
        }

        // Leaflet map
        var leafletEl = document.querySelector("#leaflet-map");
        if (leafletEl && typeof L !== "undefined") {
            var map = L.map("leaflet-map", { scrollWheelZoom: false }).setView([30, 0], 2);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 18
            }).addTo(map);
            (data.chapters || []).forEach(function (chapter) {
                if (!chapter.coordinates) return;
                var marker = L.marker([chapter.coordinates.lat, chapter.coordinates.lng]).addTo(map);
                const popupStatus = chapterStatusDetail(chapter);
                const popupStatusLine = popupStatus
                    ? "<br><em>" + escapeHTML(popupStatus) + "</em>"
                    : "";
                marker.bindPopup("<strong>" + escapeHTML(chapter.name) + "</strong><br>" + escapeHTML(chapter.location) + popupStatusLine);
                marker.on("click", function () {
                    selectChapter(chapter.id, true);
                });
            });
        }

        const indexRoot = document.querySelector("#chapter-map-index");
        if (indexRoot) {
            indexRoot.innerHTML = `
                <h3>Chapter Directory</h3>
                <p>Use the map pins or chapter cards to view details.</p>
                <div class="map-index-list">
                    ${(data.chapters || []).map(function (chapter) {
                        return `
                            <button class="map-index-button" data-chapter-select="${escapeHTML(chapter.id)}">
                                <strong>${escapeHTML(chapter.name)}</strong>
                                <span>${escapeHTML(chapter.location)}</span>
                                ${chapterStatusBadgeMarkup(chapter)}
                            </button>
                        `;
                    }).join("")}
                </div>
            `;
        }

        if (gridRoot) {
            gridRoot.innerHTML = (data.chapters || []).map(chapterCardMarkup).join("");
        }

        const flipGrid = document.querySelector("#chapter-flip-grid");
        if (flipGrid) {
            flipGrid.innerHTML = (data.chapters || [])
                .filter(function (chapter) { return chapter.id !== "ahs"; })
                .map(chapterFlipCardMarkup).join("");
            resizeFlipCardsToFitBackContent(flipGrid);
        }

        bindChapterButtons(document, true);
        const hash = (window.location.hash || "").replace("#", "").trim();
        const hashChapter = hash
            ? (data.chapters || []).find(function (chapter) { return chapter && chapter.id === hash; })
            : null;

        const defaultChapter = hashChapter || activeChapters()[0] || (data.chapters || [])[0];
        if (defaultChapter) selectChapter(defaultChapter.id, false);
    }

    function createWorldMapSvg() {
        return `<img src="images/world-map.svg" class="map-svg" alt="" aria-hidden="true" />`;
    }

    function resizeFlipCardsToFitBackContent(root) {
        const scope = root || document;
        const cards = scope.querySelectorAll(".flip-card");
        if (!cards.length) return;

        cards.forEach(function (card) {
            const front = card.querySelector(".flip-card-front");
            const back = card.querySelector(".flip-card-back");
            if (!front || !back) return;

            // Reset any previous inline height before measuring.
            card.style.height = "";

            const baseHeight = 440;
            const nextHeight = Math.max(baseHeight, front.scrollHeight, back.scrollHeight);
            card.style.height = `${nextHeight}px`;
        });
    }

    function coordinatesToPercent(coords) {
        const lat = Number(coords && coords.lat) || 0;
        const lng = Number(coords && coords.lng) || 0;
        const x = Math.min(96, Math.max(4, ((lng + 180) / 360) * 100));
        const y = Math.min(94, Math.max(6, ((90 - lat) / 180) * 100));
        return { x: x.toFixed(2), y: y.toFixed(2) };
    }

    function chapterCardMarkup(chapter) {
        return `
            <article class="chapter-card" role="button" tabindex="0" data-chapter-select="${escapeHTML(chapter.id)}">
                <div class="chapter-card-header">
                    <div>
                        <h3>${escapeHTML(chapter.name)}</h3>
                        <p>${escapeHTML(chapter.location)}</p>
                    </div>
                    ${chapterStatusBadgeMarkup(chapter)}
                </div>
                <div class="chapter-lead">
                    ${chapterLeadAvatarMarkup(chapter)}
                    <div>
                        <strong>${escapeHTML(chapter.leadName)}</strong>
                    </div>
                </div>
                ${chapter.leadBio ? `<p style="color: var(--ink-soft); font-style: italic; font-size: 0.9rem;">${escapeHTML(chapter.leadBio)}</p>` : ""}
                <p>${escapeHTML(chapter.description)}</p>
                <span class="btn btn-quiet chapter-actions">View Chapter</span>
            </article>
        `;
    }

    function chapterFlipCardMarkup(chapter) {
        const photo = chapter.photos && chapter.photos[0] ? chapter.photos[0] : "images/logo.avif";
        return `
            <div class="flip-card" role="button" tabindex="0" aria-pressed="false" data-flip-card="${escapeHTML(chapter.id)}">
                <div class="flip-card-inner">
                    <!-- Front Side -->
                    <div class="flip-card-front">
                        <div class="flip-card-image-container">
                            <img src="${escapeHTML(photo)}" alt="${escapeHTML(chapter.name)}" class="flip-card-image" onerror="this.src='images/logo.avif'">
                            ${chapterStatusBadgeMarkup(chapter)}
                        </div>
                        <div class="flip-card-front-content">
                            <h3>${escapeHTML(chapter.name)}</h3>
                            <p class="flip-card-location">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="location-icon" style="vertical-align: middle; margin-right: 4px; color: var(--green);"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>${escapeHTML(chapter.location)}
                            </p>
                            <p class="flip-card-desc">${escapeHTML(chapter.description)}</p>
                            <div class="flip-hint">
                                <span class="flip-hint-touch">Tap to Reveal President</span>
                                <span class="flip-hint-hover">Hover to Reveal President</span>
                                <svg class="flip-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 6px;"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            </div>
                        </div>
                    </div>
                    <!-- Back Side -->
                    <div class="flip-card-back">
                    <div class="flip-card-back-header">
                            ${chapterLeadAvatarMarkup(chapter, "chapter-lead-avatars-flip")}
                            <div class="flip-card-lead-meta">
                                <h4>${escapeHTML(chapter.leadName)}</h4>
                            </div>
                        </div>
                        <div class="flip-card-back-content">
                            <p class="flip-card-lead-list">${escapeHTML(chapterLeadPeopleText(chapter))}</p>
                            <p class="flip-card-bio">${escapeHTML(chapter.leadBio || 'Leading chapter initiatives and community projects.')}</p>
                            ${chapter.instagram ? `
                                <a href="${escapeHTML(chapter.instagram)}" target="_blank" rel="noopener noreferrer" class="instagram-btn" onclick="event.stopPropagation();">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="instagram-svg" style="vertical-align: middle; margin-right: 6px;"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                                    Follow Instagram
                                </a>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function bindChapterButtons(root, shouldScroll) {
        root.querySelectorAll("[data-chapter-select]").forEach(function (element) {
            if (element.dataset.chapterBound) return;
            element.dataset.chapterBound = "true";
            element.addEventListener("click", function () {
                selectChapter(element.dataset.chapterSelect, shouldScroll);
            });
            if (element.tagName !== "BUTTON") {
                element.addEventListener("keydown", function (event) {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    selectChapter(element.dataset.chapterSelect, shouldScroll);
                });
            }
        });
    }

    function selectChapter(id, shouldScroll) {
        const chapter = (data.chapters || []).find(function (item) {
            return item.id === id;
        });
        const detailRoot = document.querySelector("#chapter-detail");
        if (!chapter || !detailRoot) return;

        document.querySelectorAll("[data-chapter-select]").forEach(function (button) {
            button.classList.toggle("active", button.dataset.chapterSelect === id);
        });

        const photos = chapter.photos && chapter.photos.length ? chapter.photos : ["images/logo.avif"];
        detailRoot.innerHTML = `
            <div class="chapter-detail-grid">
                <div>
                    ${chapterStatusBadgeMarkup(chapter)}
                    <h2>${escapeHTML(chapter.name)}</h2>
                    <p class="lead-text">${escapeHTML(chapter.location)}</p>
                    <div class="chapter-lead mt-2">
                        ${chapterLeadAvatarMarkup(chapter)}
                        <div>
                            <strong>${escapeHTML(chapter.leadName)}</strong>
                        </div>
                    </div>
                    <p class="mt-2" style="color: var(--ink-soft); font-weight: 700;">${escapeHTML(chapterLeadPeopleText(chapter))}</p>
                    ${chapter.leadBio ? `<p class="mt-2" style="color: var(--ink-soft); font-style: italic;">${escapeHTML(chapter.leadBio)}</p>` : ""}
                    <p class="mt-2">${escapeHTML(chapter.description)}</p>
                </div>
                <div class="chapter-photo-grid">
                    ${photos.map(function (photo, index) {
                        return imageMarkup(photo, `${chapter.name} photo ${index + 1}`, "", "images/logo.avif");
                    }).join("")}
                </div>
            </div>
        `;

        initImageFallbacks(detailRoot);
        if (shouldScroll) {
            detailRoot.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    function renderGalleryPage() {
        const root = document.querySelector("#gallery-grid");
        if (!root) return;
        root.innerHTML = (data.gallery || []).map(storyCardMarkup).join("");
    }

    function renderInitiativesPage() {
        const fundraiserGrid = document.querySelector("#fundraiser-grid");
        if (!fundraiserGrid) return;

        const fundraisers = Array.isArray(data.fundraisers) ? data.fundraisers : [];
        fundraiserGrid.innerHTML = fundraisers.map(fundraiserCardMarkup).join("");
    }

    function fundraiserCardMarkup(fundraiser) {
        const url = (fundraiser && fundraiser.url ? String(fundraiser.url) : "").trim();
        const hasUrl = url && url !== "#" && url.toLowerCase() !== "tbd";

        const cta = hasUrl
            ? `<a class="btn btn-primary" href="${escapeHTML(url)}" target="_blank" rel="noopener">Open GoFundMe</a>`
            : `<span class="btn btn-secondary" aria-disabled="true" style="opacity: 0.7; cursor: not-allowed;">GoFundMe Link (Coming Soon)</span>`;

        return `
            <article class="card">
                <div class="card-media" style="height: 320px;">
                    ${imageMarkup(fundraiser.image, fundraiser.alt || fundraiser.title, "clickable-image", "images/logo.avif")}
                </div>
                <div class="card-content">
                    <h3 class="card-title">${escapeHTML(fundraiser.title)}</h3>
                    ${fundraiser.by ? `<p style="margin: 0; color: var(--ink-soft); font-weight: 800;">Led by ${escapeHTML(fundraiser.by)}</p>` : ""}
                    ${fundraiser.description ? `<p class="card-description">${escapeHTML(fundraiser.description)}</p>` : ""}
                    <div class="btn-row">
                        ${cta}
                        ${fundraiser.chapterHref ? `<a class="btn btn-quiet" href="${escapeHTML(fundraiser.chapterHref)}">View Chapter</a>` : ""}
                    </div>
                </div>
            </article>
        `;
    }

    function renderTeamPage() {
        const foundersRoot = document.querySelector("#team-founders-grid");
        const execRoot = document.querySelector("#team-executive-grid");
        const designRoot = document.querySelector("#team-design-grid");
        const clubRoot = document.querySelector("#team-club-officers-grid");
        const chapterRoot = document.querySelector("#team-chapter-leaders-grid");
        const volunteerRoot = document.querySelector("#team-volunteers-grid");

        if (!foundersRoot && !execRoot && !clubRoot && !chapterRoot && !volunteerRoot) return;

        if (foundersRoot) {
            renderOfficerGrid("#team-founders-grid", data.founders || [], false);
        }

        if (execRoot) {
            // Executive board: the first 3 leadership people plus the design team, in one row.
            // This section always shows each member's executive bio (falling back to regular bio).
            const execBoard = (data.officers || []).slice(0, 3).concat(data.design || []).map(function (p) {
                return Object.assign({}, p, {
                    title: memberDisplayTitle(p),
                    bio: p.execBio || p.bio || ""
                });
            });
            renderOfficerGrid("#team-executive-grid", execBoard, false);
        }

        if (designRoot) {
            // Design is now merged into the executive board grid above; leave any
            // standalone design grid empty.
            renderOfficerGrid("#team-design-grid", [], false);
        }

        if (clubRoot) {
            renderOfficerGrid("#team-club-officers-grid", (data.officers || []).slice(3).map(withDisplayTitle), false);
        }

        if (chapterRoot) {
            const chapterLeads = [];
            (data.chapters || [])
                .filter(function (chapter) { return chapter && chapter.id !== "ahs"; })
                .forEach(function (chapter) {
                    chapterLeadPeople(chapter).forEach(function (person) {
                        chapterLeads.push({
                            key: `chapter:${chapter.id}:${person.name}`,
                            name: person.name,
                            title: chapter.name,
                            detail: chapterStatusDetail(chapter),
                            photo: person.photo || chapter.leadPhoto || "images/logo.avif",
                            fallbackPhoto: "images/logo.avif",
                            bio: chapter.leadBio || chapter.description || ""
                        });
                    });
                });

            chapterRoot.innerHTML = chapterLeads.map(personCardMarkup).join("");
        }

        if (volunteerRoot) {
            const volunteers = Array.isArray(data.volunteers) ? data.volunteers : [];
            volunteerRoot.innerHTML = volunteers.map(function (volunteer) {
                return personCardMarkup({
                    key: `volunteer:${volunteer.name}`,
                    name: volunteer.name,
                    title: memberDisplayTitle(volunteer) || "Volunteer",
                    detail: volunteer.detail || "",
                    photo: volunteer.photo || "images/logo.avif",
                    fallbackPhoto: volunteer.fallbackPhoto || "images/logo.avif",
                    bio: memberDisplayBio(volunteer)
                });
            }).join("");

            const emptyState = document.querySelector("#team-volunteers-empty");
            if (emptyState) {
                emptyState.style.display = volunteers.length ? "none" : "block";
            }
        }
    }

    function storyCardMarkup(story) {
        return `
            <article class="story-card" role="button" tabindex="0" aria-pressed="false">
                <div class="story-card-inner">
                    <div class="story-face story-front">
                        ${imageMarkup(story.image, story.alt || story.title, "", "images/logo.avif")}
                        <span class="story-overlay-label">Tap to view story</span>
                    </div>
                    <div class="story-face story-back">
                        <span class="story-category">${escapeHTML(story.category)}</span>
                        <h3>${escapeHTML(story.title)}</h3>
                        <p>${escapeHTML(story.description)}</p>
                        <dl>
                            <div><dt>Date</dt><dd>${escapeHTML(story.date)}</dd></div>
                            <div><dt>Location</dt><dd>${escapeHTML(story.location)}</dd></div>
                            <div><dt>Related Chapter</dt><dd>${escapeHTML(story.relatedChapter)}</dd></div>
                        </dl>
                        <span class="tap-copy">Tap again to return to photo</span>
                    </div>
                </div>
            </article>
        `;
    }

    function initStoryCards() {
        document.addEventListener("click", function (event) {
            const card = event.target.closest(".story-card");
            if (!card) return;
            toggleStoryCard(card);
        });

        document.addEventListener("keydown", function (event) {
            const card = event.target.closest(".story-card");
            if (card && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                toggleStoryCard(card);
                return;
            }

            if (event.key !== "Escape") return;
            document.querySelectorAll(".story-card.is-flipped").forEach(function (card) {
                card.classList.remove("is-flipped");
                card.setAttribute("aria-pressed", "false");
            });
        });
    }

    function toggleStoryCard(card) {
        const flipped = card.classList.toggle("is-flipped");
        card.setAttribute("aria-pressed", flipped ? "true" : "false");
    }

    function initFlipCards() {
        // Touch-friendly flip behavior for chapter "expanding chapters" cards.
        // These cards are informational; they should not scroll the page to the chapter detail view.
        const clickFlip = window.matchMedia && window.matchMedia("(hover: none), (pointer: coarse)").matches;

        if (clickFlip) {
            document.addEventListener("click", function (event) {
                const card = event.target.closest(".flip-card");
                if (!card) return;
                if (event.target.closest("a, button")) return;
                toggleFlipCard(card);
            });
        }

        document.addEventListener("keydown", function (event) {
            const card = event.target.closest(".flip-card");
            if (card && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                toggleFlipCard(card);
                return;
            }

            if (event.key !== "Escape") return;
            document.querySelectorAll(".flip-card.is-flipped").forEach(function (card) {
                card.classList.remove("is-flipped");
                card.setAttribute("aria-pressed", "false");
            });
        });
    }

    function toggleFlipCard(card) {
        const flipped = card.classList.toggle("is-flipped");
        card.setAttribute("aria-pressed", flipped ? "true" : "false");
    }

    function initMobileNavigation() {
        const hamburger = document.querySelector(".hamburger");
        const navMenu = document.querySelector(".nav-menu");
        if (!hamburger || !navMenu) return;

        hamburger.setAttribute("aria-label", "Open navigation menu");
        hamburger.setAttribute("aria-expanded", "false");

        hamburger.addEventListener("click", function () {
            const isOpen = navMenu.classList.toggle("active");
            hamburger.classList.toggle("active", isOpen);
            hamburger.setAttribute("aria-expanded", isOpen ? "true" : "false");
            document.body.classList.toggle("nav-open", isOpen);
        });

        navMenu.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", function () {
                navMenu.classList.remove("active");
                hamburger.classList.remove("active");
                hamburger.setAttribute("aria-expanded", "false");
                document.body.classList.remove("nav-open");
            });
        });
    }

    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
            anchor.addEventListener("click", function (event) {
                const target = document.querySelector(anchor.getAttribute("href"));
                if (!target) return;
                event.preventDefault();
                target.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        });
    }

    function initRevealEffects() {
        const targets = document.querySelectorAll(".service-card, .officer-card, .chapter-officer-item, .chapter-card, .leader-card, .story-card, .card, .team-member, .feature-box");
        if (!("IntersectionObserver" in window)) return;
        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("reveal-in");
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });

        targets.forEach(function (target) {
            const rect = target.getBoundingClientRect();
            const alreadyVisible = rect.top < (window.innerHeight - 24) && rect.bottom > 24;
            if (alreadyVisible) {
                target.classList.add("reveal-in");
                return;
            }

            target.classList.add("reveal-ready");
            observer.observe(target);
        });
    }

    function initImageFallbacks(root) {
        const scope = root || document;
        scope.querySelectorAll("img").forEach(function (img) {
            if (!img.hasAttribute("loading")) img.setAttribute("loading", "lazy");
            if (img.dataset.fallbackReady) return;
            img.dataset.fallbackReady = "true";

            function syncStoryCardAspect() {
                const card = img.closest(".story-card");
                if (!card || !img.closest(".story-front")) return;
                if (!img.naturalWidth || !img.naturalHeight) return;
                const ratio = `${img.naturalWidth} / ${img.naturalHeight}`;
                card.style.aspectRatio = ratio;
                const inner = card.querySelector(".story-card-inner");
                if (inner) inner.style.aspectRatio = ratio;
            }

            img.addEventListener("load", syncStoryCardAspect, { once: true });
            if (img.complete) syncStoryCardAspect();

            img.addEventListener("error", function () {
                const current = img.getAttribute("src") || "";
                const normalized = normalizeLegacyImagePath(current);
                if (!img.dataset.normalizedTried && normalized && normalized !== current) {
                    img.dataset.normalizedTried = "true";
                    img.src = normalized;
                    return;
                }

                if (img.dataset.initialsFallback) {
                    const span = document.createElement("span");
                    const cls = img.getAttribute("class");
                    span.className = cls ? `avatar-initials ${cls}` : "avatar-initials";
                    span.setAttribute("role", "img");
                    const name = img.dataset.name || "";
                    span.setAttribute("aria-label", name || "Member");
                    span.textContent = personInitials(name);
                    if (img.parentNode) img.parentNode.replaceChild(span, img);
                    return;
                }

                const fallback = img.dataset.fallback || "images/logo.avif";
                if (!img.dataset.fallbackTried && current !== fallback) {
                    img.dataset.fallbackTried = "true";
                    img.src = fallback;
                    return;
                }

                img.style.objectFit = "contain";
                img.style.padding = "12px";
                img.style.background = "var(--surface)";
            });
        });
    }

    function normalizeLegacyImagePath(src) {
        if (!src || /^(https?:|data:|blob:)/i.test(src)) return src;
        if (!src.includes("images/") && !src.includes("/images/")) return src;
        try {
            return decodeURI(src).replace(/\\/g, "/").toLowerCase();
        } catch (error) {
            return src.replace(/%20/gi, " ").toLowerCase();
        }
    }

    function initCarousels() {
        document.querySelectorAll(".carousel-container").forEach(function (carousel) {
            const slides = Array.from(carousel.querySelectorAll(".carousel-slide"));
            const prevBtn = carousel.querySelector(".carousel-arrow.prev");
            const nextBtn = carousel.querySelector(".carousel-arrow.next");
            const dotsContainer = carousel.querySelector(".carousel-dots");
            if (!slides.length) return;

            let currentSlide = 0;
            slides.forEach(function (slide, index) {
                slide.classList.toggle("active", index === 0);
            });

            if (dotsContainer && !dotsContainer.children.length && slides.length > 1) {
                slides.forEach(function (_, index) {
                    const dot = document.createElement("button");
                    dot.type = "button";
                    dot.className = "carousel-dot" + (index === 0 ? " active" : "");
                    dot.setAttribute("aria-label", `Go to slide ${index + 1}`);
                    dot.addEventListener("click", function () {
                        showSlide(index);
                    });
                    dotsContainer.appendChild(dot);
                });
            }

            function showSlide(index) {
                slides.forEach(function (slide) {
                    slide.classList.remove("active");
                    const video = slide.querySelector("video");
                    if (video) video.pause();
                });
                currentSlide = (index + slides.length) % slides.length;
                slides[currentSlide].classList.add("active");
                if (dotsContainer) {
                    dotsContainer.querySelectorAll(".carousel-dot").forEach(function (dot, dotIndex) {
                        dot.classList.toggle("active", dotIndex === currentSlide);
                    });
                }
            }

            if (slides.length <= 1) {
                if (prevBtn) prevBtn.style.display = "none";
                if (nextBtn) nextBtn.style.display = "none";
                return;
            }

            if (prevBtn) prevBtn.addEventListener("click", function () { showSlide(currentSlide - 1); });
            if (nextBtn) nextBtn.addEventListener("click", function () { showSlide(currentSlide + 1); });
        });
    }

    function initLightbox() {
        if (!document.querySelector(".lightbox")) {
            document.body.insertAdjacentHTML("beforeend", `
                <div class="lightbox" role="dialog" aria-modal="true" aria-label="Image viewer">
                    <button class="lightbox-close" type="button" aria-label="Close image viewer">x</button>
                    <div class="lightbox-content">
                        <button class="lightbox-nav lightbox-prev" type="button" aria-label="Previous image">&lt;</button>
                        <button class="lightbox-nav lightbox-next" type="button" aria-label="Next image">&gt;</button>
                    </div>
                    <div class="lightbox-counter"></div>
                </div>
            `);
        }

        const lightbox = document.querySelector(".lightbox");
        const lightboxContent = lightbox.querySelector(".lightbox-content");
        const closeButton = lightbox.querySelector(".lightbox-close");
        const prevButton = lightbox.querySelector(".lightbox-prev");
        const nextButton = lightbox.querySelector(".lightbox-next");
        const counter = lightbox.querySelector(".lightbox-counter");
        let galleryItems = [];
        let currentIndex = 0;

        document.querySelectorAll(".clickable-image").forEach(function (media) {
            if (media.dataset.lightboxBound) return;
            media.dataset.lightboxBound = "true";
            media.addEventListener("click", function (event) {
                event.stopPropagation();
                const group = media.closest(".carousel-container, [data-lightbox-group]");
                galleryItems = group ? Array.from(group.querySelectorAll(".clickable-image")) : [media];
                currentIndex = Math.max(0, galleryItems.indexOf(media));
                showLightbox();
            });
        });

        function showLightbox() {
            const item = galleryItems[currentIndex];
            if (!item) return;

            lightboxContent.querySelectorAll("img, video").forEach(function (node) {
                node.remove();
            });

            if (item.tagName === "VIDEO") {
                const video = document.createElement("video");
                const source = item.querySelector("source");
                video.src = item.currentSrc || (source && source.src) || item.src;
                video.controls = true;
                video.autoplay = true;
                lightboxContent.insertBefore(video, nextButton);
            } else {
                const image = document.createElement("img");
                image.src = item.currentSrc || item.src;
                image.alt = item.alt || "Gallery image";
                image.dataset.fallback = item.dataset.fallback || "images/logo.avif";
                lightboxContent.insertBefore(image, nextButton);
                initImageFallbacks(lightboxContent);
            }

            counter.textContent = `${currentIndex + 1} / ${galleryItems.length}`;
            prevButton.style.display = galleryItems.length > 1 ? "inline-flex" : "none";
            nextButton.style.display = galleryItems.length > 1 ? "inline-flex" : "none";
            lightbox.classList.add("active");
            document.body.classList.add("modal-open");
        }

        function closeLightbox() {
            lightbox.classList.remove("active");
            document.body.classList.remove("modal-open");
            const video = lightbox.querySelector("video");
            if (video) video.pause();
        }

        function nextImage() {
            currentIndex = (currentIndex + 1) % galleryItems.length;
            showLightbox();
        }

        function prevImage() {
            currentIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
            showLightbox();
        }

        closeButton.addEventListener("click", closeLightbox);
        nextButton.addEventListener("click", nextImage);
        prevButton.addEventListener("click", prevImage);
        lightbox.addEventListener("click", function (event) {
            if (event.target === lightbox) closeLightbox();
        });
        document.addEventListener("keydown", function (event) {
            if (!lightbox.classList.contains("active")) return;
            if (event.key === "Escape") closeLightbox();
            if (event.key === "ArrowRight" && galleryItems.length > 1) nextImage();
            if (event.key === "ArrowLeft" && galleryItems.length > 1) prevImage();
        });
    }

    function initCounters() {
        if (!("IntersectionObserver" in window)) return;
        const counters = document.querySelectorAll('.animated-counter');
        if (!counters.length) return;

        const formatCache = new Map();
        function formatValue(value, decimals) {
            const key = String(decimals);
            let formatter = formatCache.get(key);
            if (!formatter) {
                formatter = new Intl.NumberFormat("en-US", {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals
                });
                formatCache.set(key, formatter);
            }
            return formatter.format(value);
        }

        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                if (el.dataset.animated) return;
                el.dataset.animated = "true";
                observer.unobserve(el);

                const target = parseFloat(el.getAttribute('data-target')) || 0;
                const prefix = el.getAttribute('data-prefix') || "";
                const suffix = el.getAttribute('data-suffix') || "";
                const decimals = parseInt(el.getAttribute('data-decimals'), 10) || 0;
                const duration = 2000;
                const startTime = performance.now();

                function update(currentTime) {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const easeOut = 1 - Math.pow(1 - progress, 3);
                    const current = target * easeOut;

                    el.textContent = prefix + formatValue(current, decimals) + suffix;

                    if (progress < 1) {
                        requestAnimationFrame(update);
                    } else {
                        el.textContent = prefix + formatValue(target, decimals) + suffix;
                    }
                }
                requestAnimationFrame(update);
            });
        }, { threshold: 0.1 });

        counters.forEach(function (counter) {
            observer.observe(counter);
        });
    }

    function initMembersSlider() {
        const slider = document.querySelector("[data-members-slider]");
        if (!slider) return;

        const viewport = slider.querySelector(".members-viewport");
        const track = slider.querySelector(".members-track");
        const prevButton = slider.querySelector(".members-arrow.prev");
        const nextButton = slider.querySelector(".members-arrow.next");
        if (!viewport || !track || !prevButton || !nextButton) return;

        // Populate the "All Members" list from the central registry (data.people) when empty.
        if (!track.querySelector(".members-chip, li") && Array.isArray(data.people)) {
            track.innerHTML = data.people.map(function (person) {
                return `<li class="members-chip">${escapeHTML(person.name)}</li>`;
            }).join("");
        }

        const chips = track.querySelectorAll(".members-chip, li");
        const countEl = document.querySelector("[data-members-count]");
        if (countEl) countEl.textContent = `(${chips.length})`;

        function scrollStep(direction) {
            const step = Math.max(220, Math.floor(viewport.clientWidth * 0.8));
            viewport.scrollBy({ left: direction * step, behavior: "smooth" });
        }

        prevButton.addEventListener("click", function () { scrollStep(-1); });
        nextButton.addEventListener("click", function () { scrollStep(1); });

        let updateRaf = null;
        function scheduleUpdateButtons() {
            if (updateRaf) return;
            updateRaf = window.requestAnimationFrame(function () {
                updateRaf = null;
                const maxScroll = viewport.scrollWidth - viewport.clientWidth;
                prevButton.disabled = viewport.scrollLeft <= 1;
                nextButton.disabled = viewport.scrollLeft >= maxScroll - 1;
            });
        }

        scheduleUpdateButtons();
        viewport.addEventListener("scroll", scheduleUpdateButtons, { passive: true });
        window.addEventListener("resize", scheduleUpdateButtons);
    }
})();

window.openEmailModal = function() {
    const modal = document.getElementById("email-modal");
    if (modal) modal.classList.add("active");
};

window.closeEmailModal = function() {
    const modal = document.getElementById("email-modal");
    if (modal) modal.classList.remove("active");
};

window.submitEmailForm = async function(event) {
    event.preventDefault();
    const btn = document.getElementById("submit-email-btn");
    const status = document.getElementById("email-status");
    const email = document.getElementById("sender-email").value;
    const message = document.getElementById("sender-message").value;

    btn.disabled = true;
    btn.textContent = "Sending...";
    status.textContent = "";

    try {
        const response = await fetch("https://formsubmit.co/ajax/bytesforbetterlives@gmail.com", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                _subject: "New Chapter Interest Form Submission",
                email: email,
                message: message
            })
        });

        if (response.ok) {
            status.style.color = "var(--green)";
            status.textContent = "Email sent successfully! We will get back to you soon.";
            document.getElementById("email-form").reset();
            setTimeout(closeEmailModal, 3000);
        } else {
            const errorText = await response.text();
            throw new Error(errorText);
        }
    } catch (error) {
        console.error(error);
        status.style.color = "var(--red)";
        status.textContent = "Failed to send email. Please try again or email us directly.";
    } finally {
        btn.disabled = false;
        btn.textContent = "Send Email";
    }
};
