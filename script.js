(function () {
    const fallbackData = {
        contactEmail: "bytesforbetterlives@gmail.com",
        donateUrl: "https://www.gofundme.com/f/help-provide-ipads-to-local-schools",
        socialLinks: {
            instagram: "https://www.instagram.com/bytesforbetterlives?igsh=cmgzYzEwczV6YWI1",
            linkedin: "https://www.linkedin.com/company/bytes-for-better-lives/about/"
        },
        officers: [],
        chapters: [],
        gallery: []
    };

    const data = Object.assign({}, fallbackData, window.BFBL_DATA || {});
    const donateUrl = data.donateUrl || fallbackData.donateUrl;
    const contactEmail = data.contactEmail || fallbackData.contactEmail;

    const navItems = [
        { label: "Home", href: "index.html", match: ["", "index.html"] },
        { label: "Work With Seniors", href: "work-with-seniors.html" },
        { label: "Work With Kids", href: "work-with-kids.html" },
        { label: "Our Donations", href: "donations.html" },
        { label: "Ongoing Initiatives", href: "ongoing-initiatives.html" },
        { label: "Our Impact", href: "impact.html" },
        { label: "Leadership", href: "leadership.html", match: ["leadership.html", "team.html"] },
        { label: "Chapters", href: "chapters.html" },
        { label: "Gallery", href: "gallery.html", match: ["gallery.html", "past-events.html"] },
        { label: "Contact Us", href: "contact.html" }
    ];

    document.addEventListener("DOMContentLoaded", function () {
        renderNavigation();
        renderFooter();
        renderHomePage();
        renderLeadershipPage();
        renderChaptersPage();
        renderGalleryPage();
        initMobileNavigation();
        initImageFallbacks();
        initCarousels();
        initLightbox();
        initStoryCards();
        initRevealEffects();
        initBackToTop();
        initSmoothScroll();
        initCounters();
    });

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

    function statusLabel(status) {
        const value = status || "Prospective";
        return `${value} Chapter`;
    }

    function imageMarkup(src, alt, className, fallback) {
        return `<img src="${escapeHTML(src || "images/logo.avif")}" alt="${escapeHTML(alt || "Bytes for Better Lives image")}"${className ? ` class="${escapeHTML(className)}"` : ""} data-fallback="${escapeHTML(fallback || "images/logo.avif")}" loading="lazy">`;
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

        const items = navItems.map(function (item) {
            const matches = item.match || [item.href];
            const isActive = matches.includes(page);
            return `<li><a href="${escapeHTML(item.href)}" class="nav-link${isActive ? " active" : ""}">${escapeHTML(item.label)}</a></li>`;
        }).join("");

        const donateItem = `<li><a href="${escapeHTML(donateUrl)}" target="_blank" rel="noopener" class="btn-donate">Donate</a></li>`;
        menus.forEach(function (menu) {
            menu.innerHTML = items + donateItem;
        });
    }

    function renderFooter() {
        const footerContainer = document.querySelector(".footer .container");
        if (!footerContainer) return;

        const quickLinks = [
            ["Home", "index.html"],
            ["Leadership", "leadership.html"],
            ["Chapters", "chapters.html"],
            ["Gallery", "gallery.html"],
            ["Contact Us", "contact.html"]
        ];

        const programLinks = [
            ["Work With Seniors", "work-with-seniors.html"],
            ["Work With Kids", "work-with-kids.html"],
            ["Our Donations", "donations.html"],
            ["Ongoing Initiatives", "ongoing-initiatives.html"],
            ["Our Impact", "impact.html"]
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
                <p>&copy; ${new Date().getFullYear()} Bytes for Better Lives. Making a difference one byte at a time.</p>
            </div>
        `;
    }

    function renderHomePage() {
        renderHomeStats();
        renderWhatWeDo();
        renderOfficerGrid("#executive-board-preview", data.officers || [], true);
        renderChapterPreview();
        renderGalleryPreview();
    }

    function renderHomeStats() {
        const root = document.querySelector("#home-impact-stats");
        if (!root) return;

        const stats = [
            { raw: 8.8, prefix: "$", suffix: "K+", label: "Fundraised", note: "for technology access and outreach", decimals: 1 },
            { raw: 1000, prefix: "", suffix: "+", label: "Donations Amassed", note: "games, devices, and supplies", decimals: 0 },
            { raw: 600, prefix: "", suffix: "+", label: "Students Reached", note: "through education and drives", decimals: 0 },
            { raw: 1500, prefix: "", suffix: "+", label: "Seniors Helped", note: "with tech help and safety lessons", decimals: 0 },
            { raw: activeChapters().length, prefix: "", suffix: "+", label: "Active Chapters", note: "counted from chapter data", decimals: 0 }
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
        return `
            <article class="officer-card">
                <div class="portrait-frame">
                    ${imageMarkup(officer.photo, `${officer.name} portrait`, "", officer.fallbackPhoto)}
                </div>
                <div>
                    <h3>${escapeHTML(officer.name)}</h3>
                    <p class="officer-title">${escapeHTML(officer.title)}</p>
                </div>
                <p>${escapeHTML(officer.bio)}</p>
                ${compact ? "" : `<p class="contact-placeholder">${escapeHTML(officer.contact || "Contact placeholder")}</p>`}
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

    function renderChapterPreview() {
        const root = document.querySelector("#chapters-preview-grid");
        if (!root) return;
        root.innerHTML = (data.chapters || []).slice(0, 3).map(chapterCardMarkup).join("");
        bindChapterButtons(root, false);
    }

    function renderGalleryPreview() {
        const root = document.querySelector("#gallery-preview-grid");
        if (!root) return;
        root.innerHTML = (data.gallery || []).slice(0, 3).map(storyCardMarkup).join("");
    }

    function renderLeadershipPage() {
        renderOfficerGrid("#executive-board-grid", data.officers || [], false);

        const chapterLeaders = document.querySelector("#chapter-leaders-grid");
        if (!chapterLeaders) return;

        chapterLeaders.innerHTML = (data.chapters || []).map(function (chapter) {
            return `
                <article class="leader-card">
                    <div class="chapter-lead">
                        ${imageMarkup(chapter.leadPhoto, `${chapter.leadName} portrait`, "", "images/logo.avif")}
                        <div>
                            <h3>${escapeHTML(chapter.leadName)}</h3>
                            <p class="leader-role">${escapeHTML(chapter.leadTitle || "Chapter Lead")}</p>
                        </div>
                    </div>
                    <span class="status-badge ${statusClass(chapter.status)}">${escapeHTML(statusLabel(chapter.status))}</span>
                    <p><strong>${escapeHTML(chapter.name)}</strong> - ${escapeHTML(chapter.location)}</p>
                    <p>${escapeHTML(chapter.description)}</p>
                </article>
            `;
        }).join("");
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
                                <span class="status-badge ${statusClass(chapter.status)}">${escapeHTML(statusLabel(chapter.status))}</span>
                            </button>
                        `;
                    }).join("")}
                </div>
            `;
        }

        if (gridRoot) {
            gridRoot.innerHTML = (data.chapters || []).map(chapterCardMarkup).join("");
        }

        bindChapterButtons(document, true);
        const defaultChapter = activeChapters()[0] || (data.chapters || [])[0];
        if (defaultChapter) selectChapter(defaultChapter.id, false);
    }

    function createWorldMapSvg() {
        return `
            <svg class="map-svg" viewBox="0 0 1000 500" aria-hidden="true" focusable="false">
                <path fill="oklch(82% 0.052 160)" d="M102 166c34-49 103-64 160-44 32 12 67 11 99 28 36 19 27 58-4 72-30 13-58 7-82 28-29 26-76 39-112 17-41-25-87-49-61-101Z"/>
                <path fill="oklch(80% 0.045 158)" d="M284 282c32-9 70 12 78 46 10 43-30 79-43 119-6 18-34 15-45 1-24-31-39-71-34-110 3-24 20-49 44-56Z"/>
                <path fill="oklch(82% 0.052 160)" d="M442 147c60-35 142-48 204-13 39 22 73 14 116 17 60 4 105 36 119 82-54 13-103 9-155 2-58-8-105 11-159 21-50 9-118-5-137-56-8-22-6-40 12-53Z"/>
                <path fill="oklch(80% 0.045 158)" d="M536 271c45-9 87 5 116 36 34 37 36 85 15 127-31 12-69-10-80-43-12-36-35-60-63-84-12-10-5-31 12-36Z"/>
                <path fill="oklch(82% 0.052 160)" d="M720 316c39-24 87-19 124 6 30 21 59 45 75 78-38 22-89 13-121-17-25-23-58-30-85-49-9-6-3-13 7-18Z"/>
            </svg>
        `;
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
                    <span class="status-badge ${statusClass(chapter.status)}">${escapeHTML(statusLabel(chapter.status))}</span>
                </div>
                <div class="chapter-lead">
                    ${imageMarkup(chapter.leadPhoto, `${chapter.leadName} portrait`, "", "images/logo.avif")}
                    <div>
                        <strong>${escapeHTML(chapter.leadName)}</strong>
                        <p>${escapeHTML(chapter.leadTitle || "Chapter Lead")}</p>
                    </div>
                </div>
                <p>${escapeHTML(chapter.description)}</p>
                <span class="btn btn-quiet chapter-actions">View Chapter</span>
            </article>
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
        const notActive = chapter.status !== "Active";
        detailRoot.innerHTML = `
            <div class="chapter-detail-grid">
                <div>
                    <span class="status-badge ${statusClass(chapter.status)}">${escapeHTML(statusLabel(chapter.status))}</span>
                    <h2>${escapeHTML(chapter.name)}</h2>
                    <p class="lead-text">${escapeHTML(chapter.location)}</p>
                    <div class="chapter-lead mt-2">
                        ${imageMarkup(chapter.leadPhoto, `${chapter.leadName} portrait`, "", "images/logo.avif")}
                        <div>
                            <strong>${escapeHTML(chapter.leadName)}</strong>
                            <p>${escapeHTML(chapter.leadTitle || "Chapter Lead")}</p>
                        </div>
                    </div>
                    <p class="mt-2">${escapeHTML(chapter.description)}</p>
                    <p class="mt-2"><strong>Coordinates:</strong> ${escapeHTML(chapter.coordinates.lat)}, ${escapeHTML(chapter.coordinates.lng)}</p>
                    ${notActive ? `<p class="chapter-note mt-2">This ${escapeHTML(statusLabel(chapter.status))} is not counted as an active official chapter until it is formally approved.</p>` : ""}
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

    function storyCardMarkup(story) {
        return `
            <article class="story-card" role="button" tabindex="0" aria-pressed="false">
                <div class="story-card-inner">
                    <div class="story-face story-front">
                        ${imageMarkup(story.image, story.alt || story.title, "", "images/logo.avif")}
                        <span class="story-overlay-label">Tap to view story</span>
                        <div class="story-front-content">
                            <span class="story-category">${escapeHTML(story.category)}</span>
                            <h3>${escapeHTML(story.title)}</h3>
                            <p>${escapeHTML(story.location)}</p>
                        </div>
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
        const targets = document.querySelectorAll(".service-card, .officer-card, .chapter-card, .leader-card, .story-card, .card, .team-member, .feature-box");
        if (!("IntersectionObserver" in window)) return;
        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("reveal-in");
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });

        targets.forEach(function (target) {
            target.classList.add("reveal-ready");
            observer.observe(target);
        });
    }

    function initBackToTop() {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "back-to-top";
        button.setAttribute("aria-label", "Back to top");
        button.textContent = "^";
        button.style.cssText = [
            "position:fixed",
            "right:22px",
            "bottom:22px",
            "z-index:999",
            "width:46px",
            "height:46px",
            "border-radius:50%",
            "border:1px solid var(--line)",
            "background:var(--blue)",
            "color:var(--paper)",
            "font-weight:900",
            "box-shadow:var(--shadow-md)",
            "display:none"
        ].join(";");
        document.body.appendChild(button);

        window.addEventListener("scroll", function () {
            button.style.display = window.pageYOffset > 520 ? "inline-flex" : "none";
            button.style.alignItems = "center";
            button.style.justifyContent = "center";
        });

        button.addEventListener("click", function () {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    function initImageFallbacks(root) {
        const scope = root || document;
        scope.querySelectorAll("img").forEach(function (img) {
            if (!img.hasAttribute("loading")) img.setAttribute("loading", "lazy");
            if (img.dataset.fallbackReady) return;
            img.dataset.fallbackReady = "true";
            img.addEventListener("error", function () {
                const current = img.getAttribute("src") || "";
                const normalized = normalizeLegacyImagePath(current);
                if (!img.dataset.normalizedTried && normalized && normalized !== current) {
                    img.dataset.normalizedTried = "true";
                    img.src = normalized;
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
                const carousel = media.closest(".carousel-container");
                galleryItems = carousel ? Array.from(carousel.querySelectorAll(".clickable-image")) : [media];
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

                    el.textContent = prefix + current.toFixed(decimals) + suffix;

                    if (progress < 1) {
                        requestAnimationFrame(update);
                    } else {
                        el.textContent = prefix + target.toFixed(decimals) + suffix;
                    }
                }
                requestAnimationFrame(update);
            });
        }, { threshold: 0.1 });

        counters.forEach(function (counter) {
            observer.observe(counter);
        });
    }
})();
