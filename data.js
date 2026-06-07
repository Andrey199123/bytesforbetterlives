// Bytes for Better Lives site data
// Note: this file is the seed / offline fallback — live content comes from Firestore (see CLAUDE.md).
// Edit this file to update officer bios/photos, chapters, chapter leads, and gallery stories.
// Chapter counts are generated from this array, and only status === "Active" counts as an active chapter.
window.BFBL_DATA = {
    contactEmail: "bytesforbetterlives@gmail.com",
    donateUrl: "https://www.gofundme.com/f/help-provide-ipads-to-local-schools",
    socialLinks: {
        instagram: "https://www.instagram.com/bytesforbetterlives?igsh=cmgzYzEwczV6YWI1",
        linkedin: "https://www.linkedin.com/company/bytes-for-better-lives/about/"
    },

    // Featured fundraisers (links can be added later).
    // Tip: Paste GoFundMe links into `url` fields below.
    fundraisers: [
        {
            id: "cypress-bay-dhava",
            title: "Build a Safe Bathroom for Kids in Tamil Nadu",
            by: "Dhava Rajamanikandan",
            description: "Dhava is raising funds to build proper bathroom facilities at Nehruji Higher Secondary School in Tamil Nadu, India, where students currently lack adequate, safe sanitation.",
            chapterId: "cypress",
            url: "https://www.gofundme.com/f/build-a-safe-bathroom-for-kids-in-tamil-nadu",
            image: "images/team/dhava-rajamanikandan.jpg",
            alt: "Dhava Rajamanikandan portrait",
            chapterHref: "chapter-cypress.html"
        },
        {
            id: "peru-joel",
            title: "Peru Fundraiser",
            by: "Joel Cardenas",
            description: "Support Joel's Peru fundraiser and the outreach work it enables.",
            chapterId: "ahs",
            url: "https://www.gofundme.com/f/help-children-gain-access-education-tools-in-peru",
            image: "images/team/joel-cardenas.jpg",
            alt: "Joel Cardenas portrait",
            chapterHref: "chapter-ahs.html"
        }
    ],

    // Current donation drives — shown under "Current fundraisers" on ongoing-initiatives.html
    // (driveCardMarkup into #drives-grid). The "Current drives" section auto-hides while this is
    // empty. Add a drive: { id, title, status, description, url, image, alt }. Live source = Firestore.
    drives: [],

    // ===== CENTRAL MEMBER REGISTRY =====
    // Single source of truth for every member — define each person ONCE here.
    // `roles` controls where they appear on the site:
    //   "leadership" -> Team page Board of Directors > "Leadership" subsection (first 3 also on homepage preview)
    //   "design"     -> Team page Board of Directors > "Design" subsection
    //   "volunteer"  -> Team page "Volunteers" section
    // Everyone listed here also appears in the homepage "All Members" list automatically.
    // A person can hold more than one role, e.g. roles: ["leadership", "design"].
    // NOTE: Founders are hardcoded in script.js (FOUNDERS) — they never change, so they are
    // intentionally NOT in this registry, Firestore, or the admin. Do not re-add them here.
    people: [
        {
            name: "Andrey Vasilyev",
            title: "Co-President",
            photo: "images/team/andrey.jpg",
            fallbackPhoto: "images/team/andrey.jpg",
            detail: "",
            bio: "Andrey helps guide Bytes for Better Lives strategy, technology projects, and responsible chapter expansion.",
            contact: "Officer contact or profile link placeholder",
            roles: ["leadership"]
        },
        {
            name: "Jonathan Wu",
            title: "Co-President",
            photo: "images/team/jonathan.jpg",
            fallbackPhoto: "images/team/jonathan.jpg",
            detail: "",
            bio: "Jonathan supports program leadership, outreach partnerships, and service planning across senior and youth initiatives.",
            contact: "Officer contact or profile link placeholder",
            roles: ["leadership"]
        },
        {
            name: "Joel Cardenas",
            title: "VP of Outreach",
            photo: "images/team/joel-cardenas.jpg",
            fallbackPhoto: "images/team/joel-cardenas.jpg",
            detail: "",
            bio: "Joel helps coordinate volunteers, chapter operations, and community service projects for Bytes for Better Lives.",
            contact: "Officer contact or profile link placeholder",
            roles: ["leadership"]
        },
        {
            name: "Daniel Zhao",
            title: "VP of Activities",
            photo: "images/team/daniel-zhao.jpg",
            fallbackPhoto: "images/logo.avif",
            detail: "",
            bio: "Daniel supports activity planning, volunteer coordination, and service event execution across BFBL programs.",
            contact: "",
            roles: ["leadership"]
        },
        {
            name: "Troy Qian",
            title: "Secretary",
            // TODO: replace with Troy's portrait when available.
            photo: "images/logo.avif",
            fallbackPhoto: "images/logo.avif",
            detail: "",
            bio: "Troy supports documentation, meeting notes, and consistent communication across officer and chapter operations.",
            contact: "",
            roles: ["leadership"]
        },
        {
            name: "Siddarth Gupta",
            title: "Treasurer",
            // TODO: replace with Siddarth's portrait when available.
            photo: "images/logo.avif",
            fallbackPhoto: "images/logo.avif",
            detail: "",
            bio: "Siddarth supports fundraising tracking, donation logistics, and responsible resource planning for BFBL service work.",
            contact: "",
            roles: ["leadership"]
        },
        {
            name: "Lucas Calderon",
            title: "Historian",
            // TODO: replace with Lucas's portrait when available.
            photo: "images/logo.avif",
            fallbackPhoto: "images/logo.avif",
            detail: "",
            bio: "Lucas supports photo documentation, event recaps, and storytelling that highlights measurable community impact.",
            contact: "",
            roles: ["leadership"]
        },
        {
            name: "Parth Bhalerao",
            title: "ICC Rep",
            // TODO: replace with Parth's portrait when available.
            photo: "images/logo.avif",
            fallbackPhoto: "images/logo.avif",
            detail: "",
            bio: "Parth supports coordination with school leadership and ensures service events align with student organization standards.",
            contact: "",
            roles: ["leadership"]
        },
        {
            name: "Petr Kirsanov",
            title: "Creative Director",
            photo: "images/team/petr-kirsanov.jpg",
            fallbackPhoto: "images/team/petr-kirsanov.jpg",
            detail: "",
            bio: "Petr manages the Bytes for Better Lives website and the club's overall brand direction.",
            contact: "Officer contact or profile link placeholder",
            roles: ["design"]
        },
        { name: "Alexey Guydouk", title: "Volunteer", detail: "", photo: "images/our team/alexey guydouk.avif", fallbackPhoto: "images/logo.avif", bio: "", roles: ["volunteer"] },
        { name: "Ethan Chen", title: "Volunteer", detail: "", photo: "images/our team/ethan chen.avif", fallbackPhoto: "images/logo.avif", bio: "", roles: ["volunteer"] },
        { name: "Dhava Rajamanikandan", title: "Chapter President", detail: "", photo: "images/team/dhava-rajamanikandan.jpg", fallbackPhoto: "images/team/dhava-rajamanikandan.jpg", bio: "", roles: ["volunteer"] },
        { name: "Elie Ciril", title: "Volunteer", detail: "", photo: "images/logo.avif", fallbackPhoto: "images/logo.avif", bio: "", roles: ["volunteer"] },
        { name: "Anish Immadi", title: "Volunteer", detail: "", photo: "images/logo.avif", fallbackPhoto: "images/logo.avif", bio: "", roles: ["volunteer"] },
        { name: "Mateo Calderon", title: "Volunteer", detail: "", photo: "images/logo.avif", fallbackPhoto: "images/logo.avif", bio: "", roles: ["volunteer"] },
        { name: "Aniket Shukla", title: "Volunteer", detail: "", photo: "images/logo.avif", fallbackPhoto: "images/logo.avif", bio: "", roles: ["volunteer"] },
        { name: "Zayn Charania", title: "Volunteer", detail: "", photo: "images/logo.avif", fallbackPhoto: "images/logo.avif", bio: "", roles: ["volunteer"] },
        { name: "Ipek", title: "Volunteer", detail: "", photo: "images/logo.avif", fallbackPhoto: "images/logo.avif", bio: "", roles: ["volunteer"] },
        { name: "Platon Panov", title: "Chapter President", detail: "", photo: "images/team/platon-panov.jpg", fallbackPhoto: "images/team/platon-panov.jpg", bio: "", roles: ["volunteer"] },
        { name: "Troye Kim", title: "Chapter President", detail: "", photo: "images/team/troye-kim.jpg", fallbackPhoto: "images/team/troye-kim.jpg", bio: "", roles: ["volunteer"] },
        { name: "Aashvik Garimella", title: "Volunteer", detail: "", photo: "images/logo.avif", fallbackPhoto: "images/logo.avif", bio: "", roles: ["volunteer"] },
        { name: "Baylee Effendi", title: "Chapter President", detail: "", photo: "images/team/baylee-effendi.jpg", fallbackPhoto: "images/logo.avif", bio: "", roles: ["volunteer"] },
        { name: "Jamal Shaer", title: "Chapter President", detail: "", photo: "images/logo.avif", fallbackPhoto: "images/logo.avif", bio: "", roles: ["volunteer"] }
    ],

    // Edit chapter data here. Use status exactly as "Active", "Launching", or "Prospective".
    chapters: [
        {
            id: "ahs",
            // Public subdomain for this chapter (edit to change the chapter URL shown across the site).
            // Example: "ahs" -> https://ahs.bytesforbetterlives.org/
            subdomain: "ahs",
            pageHref: "chapter-ahs.html",
            name: "AHS Chapter",
            location: "South Florida, United States",
            status: "Active",
            statusTag: "Executive",
            leadName: "Board of Directors",
            leadTitle: "Board of Directors",
            leadPhoto: "images/team/andrey.jpg",
            leadPeople: [
                {
                    name: "Andrey Vasilyev",
                    title: "Co-President",
                    photo: "images/team/andrey.jpg"
                },
                {
                    name: "Jonathan Wu",
                    title: "Co-President",
                    photo: "images/team/jonathan.jpg"
                },
                {
                    name: "Joel Cardenas",
                    title: "VP of Outreach",
                    photo: "images/team/joel-cardenas.jpg"
                }
            ],
            leadBio: "The founding board of directors manages outreach, events, and partnerships across South Florida.",
            coordinates: { lat: 26.1224, lng: -80.1373 },
            description: "Original chapter focused on senior tech help, children's donations, and digital literacy outreach.",
            photos: [
                "images/work with seniors/tech help 1.avif",
                "images/past events/digital safety 2.avif",
                "images/work with kids/ipad 1.jpeg"
            ]
        },
        {
            id: "cypress",
            subdomain: "cypress",
            pageHref: "chapter-cypress.html",
            name: "Cypress Bay Chapter",
            location: "Florida, United States",
            status: "Active",
            leadName: "Dhava Rajamanikandan",
            leadTitle: "Chapter President",
            leadPhoto: "images/team/dhava-rajamanikandan.jpg",
            leadPeople: [
                {
                    name: "Dhava Rajamanikandan",
                    title: "Chapter President",
                    photo: "images/team/dhava-rajamanikandan.jpg"
                }
            ],
            leadBio: "Dhava leads the Cypress Bay Chapter's local service projects and digital literacy outreach.",
            instagram: "https://instagram.com/bfbl_cypressbay",
            coordinates: { lat: 26.3017, lng: -80.2551 },
            description: "Local chapter expanding BFBL service projects and digital literacy outreach.",
            photos: [
                "images/past events/workshops 1.jpg",
                "images/work with kids/trivia night 1.avif"
            ]
        },
        {
            id: "new-york",
            subdomain: "new-york",
            pageHref: "chapter-new-york.html",
            name: "New York Chapter",
            location: "New York, United States",
            status: "Active",
            leadName: "Troye Kim",
            leadTitle: "Chapter President",
            leadPhoto: "images/team/troye-kim.jpg",
            leadPeople: [
                {
                    name: "Troye Kim",
                    title: "Chapter President",
                    photo: "images/team/troye-kim.jpg"
                }
            ],
            leadBio: "Troye Kim leads the New York Chapter's outreach and digital literacy service as a student at Stuyvesant High School.",
            coordinates: { lat: 40.7128, lng: -74.0060 },
            description: "Launched chapter based in New York and led by a Stuyvesant High School student, expanding BFBL digital literacy and community service outreach.",
            photos: [
                "images/logo.avif"
            ]
        },
        {
            id: "gainesville",
            subdomain: "gainesville",
            pageHref: "chapter-gainesville.html",
            name: "Gainesville Chapter",
            location: "Gainesville, Florida, United States",
            status: "Launching",
            leadName: "Jamal Shaer",
            leadTitle: "Chapter President",
            leadPhoto: "images/logo.avif",
            leadPeople: [
                {
                    name: "Jamal Shaer",
                    title: "Chapter President",
                    photo: "images/logo.avif"
                }
            ],
            leadBio: "Jamal leads the Gainesville Chapter's outreach and service planning as a student at Buchholz High School.",
            coordinates: { lat: 29.6516, lng: -82.3248 },
            description: "Launching chapter expanding BFBL senior tech help, online safety education, and children's donation drives in Gainesville.",
            photos: [
                "images/logo.avif"
            ]
        },
        {
            id: "coral-springs",
            subdomain: "coral-springs",
            pageHref: "chapter-coral-springs.html",
            name: "Coral Springs Chapter",
            location: "Coral Springs, Florida, United States",
            status: "Launching",
            leadName: "Baylee Effendi",
            leadTitle: "Chapter President",
            leadPhoto: "images/team/baylee-effendi.jpg",
            leadPeople: [
                {
                    name: "Baylee Effendi",
                    title: "Chapter President",
                    photo: "images/team/baylee-effendi.jpg"
                }
            ],
            leadBio: "Baylee leads the Coral Springs Chapter's outreach and service planning as a student at Coral Springs Charter High School.",
            coordinates: { lat: 26.2712, lng: -80.2706 },
            description: "Launching chapter expanding BFBL senior tech help, digital literacy education, and community outreach in Coral Springs.",
            photos: [
                "images/logo.avif"
            ]
        },
        {
            id: "russia",
            subdomain: "russia",
            pageHref: "chapter-russia.html",
            name: "Russia Chapter",
            location: "Russia",
            status: "Launching",
            leadName: "Platon Panov",
            leadTitle: "Chapter President",
            leadPhoto: "images/team/platon-panov.jpg",
            leadPeople: [
                {
                    name: "Platon Panov",
                    title: "Chapter President",
                    photo: "images/team/platon-panov.jpg"
                }
            ],
            leadBio: "Platon leads the Russia Chapter's digital literacy and community service outreach.",
            instagram: "https://www.instagram.com/bytesforbetterlives.russia",
            coordinates: { lat: 55.7558, lng: 37.6173 },
            description: "International chapter exploring digital literacy and community service outreach.",
            photos: [
                "images/logo.avif"
            ]
        },
        {
            id: "turkey",
            // Note: this can be "turkiye" if you prefer that spelling for the URL.
            subdomain: "turkey",
            pageHref: "chapter-turkey.html",
            name: "Turkey Chapter",
            location: "Turkey",
            status: "Launching",
            leadName: "Ipek",
            leadTitle: "Launching Chapter Lead",
            leadPhoto: "images/logo.avif",
            leadBio: "Building a local chapter focused on community service and digital literacy support in Turkey.",
            instagram: "https://instagram.com/bfbl_turkiye",
            coordinates: { lat: 41.0082, lng: 28.9784 },
            description: "Launching chapter focused on local community service and digital literacy support.",
            photos: [
                "images/logo.avif"
            ]
        }
    ],

    // Edit gallery stories here. Add a new object for each photo/story card.
    gallery: [
        {
            id: "senior-tech-help",
            title: "One-on-One Senior Tech Help",
            date: "2025",
            location: "Palomino Gardens, South Florida",
            description: "Volunteers worked directly with senior residents on phones, iPads, laptops, video calls, email, photos, and accessibility settings.",
            relatedChapter: "AHS Chapter",
            category: "Senior Tech Help",
            image: "images/work with seniors/tech help 1.avif",
            alt: "Student volunteer helping a senior resident with technology"
        },
        {
            id: "digital-safety",
            title: "Digital Safety Presentation",
            date: "2025",
            location: "Senior living communities in South Florida",
            description: "Bytes for Better Lives presented practical online safety lessons that helped seniors recognize scams, phishing attempts, and unsafe links.",
            relatedChapter: "AHS Chapter",
            category: "Online Safety Education",
            image: "images/past events/digital safety 2.avif",
            alt: "Digital safety presentation for senior residents"
        },
        {
            id: "september-board-game-drive",
            title: "September Board Game Drive",
            date: "September 2025",
            location: "American Heritage School",
            description: "The school community helped collect hundreds of board games that were prepared for children, families, and community partners.",
            relatedChapter: "AHS Chapter",
            category: "Children's Donations",
            image: "images/past events/sep board game 1.avif",
            alt: "Board games collected during a school donation drive"
        },
        {
            id: "lotus-house",
            title: "Lotus House Outreach",
            date: "2025",
            location: "Lotus House",
            description: "Students combined digital safety, financial literacy, snacks, and donated games to create a warm educational outreach event.",
            relatedChapter: "AHS Chapter",
            category: "Digital Literacy Presentation",
            image: "images/past events/lotus house.avif",
            alt: "Bytes for Better Lives outreach at Lotus House"
        },
        {
            id: "his-house-donation",
            title: "His House Board Game Donation",
            date: "July 2025",
            location: "His House Children's Home",
            description: "BFBL donated board games to create screen-free activities that encourage connection, creativity, and joy for children.",
            relatedChapter: "AHS Chapter",
            category: "Children's Donations",
            image: "images/past events/his house 1.avif",
            alt: "Board game donation at His House Children's Home"
        },
        {
            id: "joe-dimaggio-drive",
            title: "Children's Hospital Game Drive",
            date: "2025",
            location: "Joe DiMaggio Children's Hospital",
            description: "Students organized drives that brought board and card games to children staying at the hospital.",
            relatedChapter: "AHS Chapter",
            category: "Children's Donations",
            image: "images/past events/joe 1.avif",
            alt: "Board games prepared for Joe DiMaggio Children's Hospital"
        },
        {
            id: "trivia-night",
            title: "Friendly Feud Trivia Night",
            date: "2025",
            location: "American Heritage School",
            description: "A student-led fundraiser brought classmates together for team competition while supporting donation and outreach projects.",
            relatedChapter: "AHS Chapter",
            category: "Fundraising",
            image: "images/work with kids/trivia night 1.avif",
            alt: "Students participating in a trivia night fundraiser"
        },
        {
            id: "haiti-support",
            title: "Haiti Support Initiative",
            date: "December 2025",
            location: "House of New Vision and Hope",
            description: "Board games were donated to support children in rural Haiti with accessible, joyful activities that can be shared together.",
            relatedChapter: "AHS Chapter",
            category: "Children's Donations",
            image: "images/donations/christmas haiti 1.jpeg",
            alt: "Donation effort supporting children in Haiti"
        }
    ]
};
