// Bytes for Better Lives site data
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
            title: "Cypress Bay Chapter Fundraiser",
            by: "Dhava Rajamanikandan",
            description: "Support the Cypress Bay Chapter's ongoing tech access and digital literacy work led by Dhava.",
            chapterId: "cypress",
            url: "",
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
            url: "",
            image: "images/team/joel-cardenas.jpg",
            alt: "Joel Cardenas portrait",
            chapterHref: "chapter-ahs.html"
        }
    ],

    // Edit founder data here.
    founders: [
        {
            name: "Aaron Pinto",
            title: "Co-Founder",
            photo: "images/team/aaron-pinto.jpg",
            fallbackPhoto: "images/logo.avif",
            detail: "",
            bio: "Aaron co-founded Bytes for Better Lives to bridge the digital divide through service, education, and donations.",
            contact: ""
        },
        {
            name: "Pranav Rai",
            title: "Co-Founder",
            photo: "images/team/pranav-rai.jpg",
            fallbackPhoto: "images/logo.avif",
            detail: "",
            bio: "Pranav co-founded Bytes for Better Lives to help seniors and children build practical technology skills and access.",
            contact: ""
        }
    ],

    // Edit officer data here.
    // Notes:
    // - The first few entries are featured on the homepage "Executive Board" preview.
    // - Add `detail` for things like school + grade (kept optional so we don't show placeholder text on the live site).
    // - You can swap portrait paths later without changing any page layout.
    officers: [
        {
            name: "Andrey Vasilyev",
            title: "Co-President",
            photo: "images/team/andrey.jpg",
            fallbackPhoto: "images/team/andrey.jpg",
            detail: "",
            bio: "Andrey helps guide Bytes for Better Lives strategy, technology projects, and responsible chapter expansion.",
            contact: "Officer contact or profile link placeholder"
        },
        {
            name: "Jonathan Wu",
            title: "Co-President",
            photo: "images/team/jonathan.jpg",
            fallbackPhoto: "images/team/jonathan.jpg",
            detail: "",
            bio: "Jonathan supports program leadership, outreach partnerships, and service planning across senior and youth initiatives.",
            contact: "Officer contact or profile link placeholder"
        },
        {
            name: "Joel Cardenas",
            title: "VP of Outreach",
            photo: "images/team/joel-cardenas.jpg",
            fallbackPhoto: "images/team/joel-cardenas.jpg",
            detail: "",
            bio: "Joel helps coordinate volunteers, chapter operations, and community service projects for Bytes for Better Lives.",
            contact: "Officer contact or profile link placeholder"
        },
        {
            name: "Daniel Zhao",
            title: "VP of Activities",
            photo: "images/team/daniel-zhao.jpg",
            fallbackPhoto: "images/logo.avif",
            detail: "",
            bio: "Daniel supports activity planning, volunteer coordination, and service event execution across BFBL programs.",
            contact: ""
        },
        {
            name: "Troy Qian",
            title: "Secretary",
            // TODO: replace with Troy's portrait when available.
            photo: "images/logo.avif",
            fallbackPhoto: "images/logo.avif",
            detail: "",
            bio: "Troy supports documentation, meeting notes, and consistent communication across officer and chapter operations.",
            contact: ""
        },
        {
            name: "Siddarth Gupta",
            title: "Treasurer",
            // TODO: replace with Siddarth's portrait when available.
            photo: "images/logo.avif",
            fallbackPhoto: "images/logo.avif",
            detail: "",
            bio: "Siddarth supports fundraising tracking, donation logistics, and responsible resource planning for BFBL service work.",
            contact: ""
        },
        {
            name: "Lucas Calderon",
            title: "Historian",
            // TODO: replace with Lucas's portrait when available.
            photo: "images/logo.avif",
            fallbackPhoto: "images/logo.avif",
            detail: "",
            bio: "Lucas supports photo documentation, event recaps, and storytelling that highlights measurable community impact.",
            contact: ""
        },
        {
            name: "Parth Bhalerao",
            title: "ICC Rep",
            // TODO: replace with Parth's portrait when available.
            photo: "images/logo.avif",
            fallbackPhoto: "images/logo.avif",
            detail: "",
            bio: "Parth supports coordination with school leadership and ensures service events align with student organization standards.",
            contact: ""
        }
    ],

    // Edit volunteer data here.
    // This is meant for students who volunteer and support BFBL events/initiatives (not officers).
    volunteers: [
        { name: "Alexey Guydouk", title: "Volunteer", detail: "", photo: "images/our team/alexey guydouk.avif", fallbackPhoto: "images/logo.avif", bio: "" },
        { name: "Pranav Rai", title: "Co-Founder", detail: "", photo: "images/team/pranav-rai.jpg", fallbackPhoto: "images/logo.avif", bio: "" },
        { name: "Aaron Pinto", title: "Co-Founder", detail: "", photo: "images/team/aaron-pinto.jpg", fallbackPhoto: "images/logo.avif", bio: "" },
        { name: "Troy Qian", title: "Volunteer", detail: "", photo: "images/logo.avif", fallbackPhoto: "images/logo.avif", bio: "" },
        { name: "Ethan Chen", title: "Volunteer", detail: "", photo: "images/our team/ethan chen.avif", fallbackPhoto: "images/logo.avif", bio: "" },
        { name: "Parth Balerao", title: "Volunteer", detail: "", photo: "images/logo.avif", fallbackPhoto: "images/logo.avif", bio: "" },
        { name: "Andrey Vasilyev", title: "Co-President", detail: "", photo: "images/team/andrey.jpg", fallbackPhoto: "images/team/andrey.jpg", bio: "" },
        { name: "Jonathan Wu", title: "Co-President", detail: "", photo: "images/team/jonathan.jpg", fallbackPhoto: "images/team/jonathan.jpg", bio: "" },
        { name: "Joel Cardenas", title: "VP of Outreach", detail: "", photo: "images/team/joel-cardenas.jpg", fallbackPhoto: "images/team/joel-cardenas.jpg", bio: "" },
        { name: "Dhava Rajamanikandan", title: "Chapter President", detail: "", photo: "images/team/dhava-rajamanikandan.jpg", fallbackPhoto: "images/team/dhava-rajamanikandan.jpg", bio: "" },
        { name: "Elie Ciril", title: "Volunteer", detail: "", photo: "images/logo.avif", fallbackPhoto: "images/logo.avif", bio: "" },
        { name: "Daniel Zhao", title: "VP of Activities", detail: "", photo: "images/team/daniel-zhao.jpg", fallbackPhoto: "images/logo.avif", bio: "" },
        { name: "Lucas Calderon", title: "Historian", detail: "", photo: "images/logo.avif", fallbackPhoto: "images/logo.avif", bio: "" },
        { name: "Anish Immadi", title: "Volunteer", detail: "", photo: "images/logo.avif", fallbackPhoto: "images/logo.avif", bio: "" },
        { name: "Siddarth Gupta", title: "Treasurer", detail: "", photo: "images/logo.avif", fallbackPhoto: "images/logo.avif", bio: "" },
        { name: "Mateo Calderon", title: "Volunteer", detail: "", photo: "images/logo.avif", fallbackPhoto: "images/logo.avif", bio: "" },
        { name: "Aniket Shukla", title: "Volunteer", detail: "", photo: "images/logo.avif", fallbackPhoto: "images/logo.avif", bio: "" },
        { name: "Zayn Charania", title: "Volunteer", detail: "", photo: "images/logo.avif", fallbackPhoto: "images/logo.avif", bio: "" },
        { name: "Ipek", title: "Volunteer", detail: "", photo: "images/logo.avif", fallbackPhoto: "images/logo.avif", bio: "" },
        { name: "Platon Panov", title: "Chapter President", detail: "", photo: "images/team/platon-panov.jpg", fallbackPhoto: "images/team/platon-panov.jpg", bio: "" },
        { name: "Troye Kim", title: "Chapter President", detail: "", photo: "images/team/troye-kim.jpg", fallbackPhoto: "images/team/troye-kim.jpg", bio: "" },
        { name: "Aashvik Garimella", title: "Volunteer", detail: "", photo: "images/logo.avif", fallbackPhoto: "images/logo.avif", bio: "" }
    ],

    // Edit chapter data here. Use status exactly as "Active", "Launching", or "Prospective".
    chapters: [
        {
            id: "ahs",
            pageHref: "chapter-ahs.html",
            name: "AHS Chapter",
            location: "South Florida, United States",
            status: "Active",
            statusTag: "Executive",
            leadName: "Executive Board",
            leadTitle: "Executive Board",
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
            leadBio: "The founding executive board manages outreach, events, and partnerships across South Florida.",
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
                "images/past events/workshops 1.png",
                "images/work with kids/trivia night 1.avif"
            ]
        },
        {
            id: "new-york",
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
            pageHref: "chapter-coral-springs.html",
            name: "Coral Springs Chapter",
            location: "Coral Springs, Florida, United States",
            status: "Launching",
            leadName: "Baylee Effendi",
            leadTitle: "Chapter President",
            leadPhoto: "images/team/baylee-effendi.png",
            leadPeople: [
                {
                    name: "Baylee Effendi",
                    title: "Chapter President",
                    photo: "images/team/baylee-effendi.png"
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
            id: "turkiye",
            pageHref: "chapter-turkiye.html",
            name: "Türkiye Chapter",
            location: "Türkiye",
            status: "Launching",
            leadName: "Turkey",
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
