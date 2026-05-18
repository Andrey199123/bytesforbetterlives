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

    // Edit officer data here. Replace /images/team/*.jpg with final portraits when ready.
    officers: [
        {
            name: "Andrey Vasilyev",
            title: "Co-President",
            photo: "images/team/andrey.jpg",
            fallbackPhoto: "images/team/andrey.jpg",
            bio: "Andrey helps guide Bytes for Better Lives strategy, technology projects, and responsible chapter expansion.",
            contact: "Officer contact or profile link placeholder"
        },
        {
            name: "Jonathan Wu",
            title: "Co-President",
            photo: "images/team/jonathan.jpg",
            fallbackPhoto: "images/team/jonathan.jpg",
            bio: "Jonathan supports program leadership, outreach partnerships, and service planning across senior and youth initiatives.",
            contact: "Officer contact or profile link placeholder"
        },
        {
            name: "Joel Cardenas",
            title: "Vice President",
            photo: "images/team/joel-cardenas.jpg",
            fallbackPhoto: "images/team/joel-cardenas.jpg",
            bio: "Joel helps coordinate volunteers, chapter operations, and community service projects for Bytes for Better Lives.",
            contact: "Officer contact or profile link placeholder"
        }
    ],

    // Edit chapter data here. Use status exactly as "Active", "Launching", or "Prospective".
    chapters: [
        {
            id: "ahs",
            name: "AHS Chapter",
            location: "South Florida, United States",
            status: "Active",
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
                    title: "Vice President",
                    photo: "images/team/joel-cardenas.jpg"
                }
            ],
            leadBio: "The founding executive board manages outreach, events, and partnerships across South Florida.",
            coordinates: { lat: 26.1224, lng: -80.1373 },
            description: "Original chapter focused on senior tech help, children's donations, and digital literacy outreach.",
            photos: [
                "images/work with seniors/tech help 1.png",
                "images/past events/digital safety 2.avif",
                "images/work with kids/ipad 1.jpeg"
            ]
        },
        {
            id: "cypress",
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
                "images/work with kids/trivia night 1.png"
            ]
        },
        {
            id: "new-york",
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
            id: "russia",
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
            image: "images/work with seniors/tech help 1.png",
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
            image: "images/past events/sep board game 1.png",
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
            image: "images/past events/lotus house.png",
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
            image: "images/past events/his house 1.png",
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
            image: "images/past events/joe 1.png",
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
            image: "images/work with kids/trivia night 1.png",
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
