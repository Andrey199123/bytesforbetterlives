# Bytes for Better Lives - Enhanced Website

This is a modern, enhanced recreation of the Bytes for Better Lives nonprofit website with improved UI/UX while maintaining all original content.

## 🎨 Features

### Enhanced UI/UX
- **Modern Design**: Clean, professional design with gradient accents and smooth animations
- **Responsive Layout**: Fully responsive design that works on desktop, tablet, and mobile
- **Smooth Animations**: Fade-in animations, counter animations for statistics, and smooth scrolling
- **Interactive Elements**: Hover effects, animated cards, and mobile-friendly navigation
- **Enhanced Typography**: Clear hierarchy with modern fonts and proper spacing

### Technical Features
- **Mobile-First Design**: Hamburger menu for mobile devices
- **Performance Optimized**: Fast loading times with optimized CSS and JavaScript
- **Accessibility**: Semantic HTML and proper ARIA labels
- **SEO Friendly**: Meta tags and proper heading structure
- **Cross-Browser Compatible**: Works on all modern browsers
- **Image Gallery & Lightbox**: Click-through photo galleries with fullscreen viewer
  - Click any image to open fullscreen lightbox
  - Navigate with arrow keys or on-screen buttons
  - Supports images and videos
  - Shows image counter (e.g., "3 / 5")
  - Press ESC to close

## 📁 File Structure

```
BBL Website/
├── index.html              # Home page
├── past-events.html        # Past events and initiatives
├── work-with-seniors.html  # Senior citizen programs
├── work-with-kids.html     # Youth programs
├── donations.html          # Donation drives
├── impact.html            # Impact statistics and partners
├── team.html              # Team member profiles
├── contact.html           # Contact information
├── styles.css             # Main stylesheet
├── script.js              # Interactive functionality
├── images/                # Images folder (add your images here)
└── README.md              # This file
```

## 🚀 Getting Started

### Option 1: Open Directly
1. Simply open `index.html` in your web browser
2. All pages are linked and navigation works locally

### Option 2: Use a Local Server (Recommended)
```bash
# Using Python 3
python3 -m http.server 8000

# Using Python 2
python -m SimpleHTTPServer 8000

# Using Node.js (if you have http-server installed)
npx http-server
```

Then open `http://localhost:8000` in your browser.

## 📸 Adding Images

The website currently uses emoji placeholders. To add real images:

1. Create an `images/` folder in the same directory as `index.html`
2. Add your images with descriptive names:
   - `hero-bg.jpg` - Hero section background
   - `team-pranav.jpg` - Team member photos
   - `team-aaron.jpg`
   - `team-alexey.jpg`
   - `team-ethan.jpg`
   - `team-andrey.jpg`
   - `event-*.jpg` - Event photos
   - `partner-*.png` - Partner logos

3. Update the HTML to reference your images:
   ```html
   <!-- Replace emoji placeholders with: -->
   <img src="images/team-pranav.jpg" alt="Pranav Rai">
   ```

## 🎯 Content Verification

All content matches the original website:

### ✅ Home Page (index.html)
- Hero section with "About Us"
- Impact statistics (8.4K+ Fundraised, 1000+ Donations, 600+ Students, 1500+ Seniors)
- Four action cards (Donate, Volunteer, Fundraise, Chapter)
- Contact information

### ✅ Past Events (past-events.html)
- September Board Game Drive
- Lotus House
- Digital Safety lectures
- Personalized Tech Assistance
- His House Children's Home donations
- Joe DiMaggio's Children Hospital donations
- Friendly Feud Trivia Nights
- Tech Workshops
- Support in Haiti

### ✅ Work With Seniors (work-with-seniors.html)
- Digital Safety programs
- Tech Help at Palomino Gardens

### ✅ Work With Kids (work-with-kids.html)
- Trivia Nights ($3,500 raised)
- Workshops on game development
- Support in Haiti

### ✅ Our Donations (donations.html)
- September Board Game Drive (350+ games)
- His House Children's Home (70+ games)
- Joe DiMaggio's Children Hospital (200+ games)

### ✅ Our Impact (impact.html)
- Impact statistics
- Partner organizations list

### ✅ Meet the Team (team.html)
- Pranav Rai - Co-Founder & President
- Aaron Pinto - Co-Founder & President
- Alexey Guydouk - VP of Fundraising
- Ethan Chen - VP of Outreach
- Andrey Vasilyev - VP of Operations

### ✅ Contact Us (contact.html)
- Social media (@bytesforbetterlives)
- Email (bytesforbetterlives@gmail.com)
- Get Involved cards

## 🎨 Customization

### Colors
Edit the CSS variables in `styles.css`:
```css
:root {
    --primary-color: #2563eb;     /* Main blue */
    --secondary-color: #10b981;   /* Green accent */
    --accent-color: #f59e0b;      /* Orange accent */
}
```

### Fonts
The site uses system fonts by default. To add custom fonts:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

body {
    font-family: 'Inter', sans-serif;
}
```

## 🔗 Links to Update

Before deploying, update these links:
- Social media links in navigation and footer (currently placeholder `#`)
- GoFundMe link (already set to: https://www.gofundme.com/f/help-provide-ipads-to-local-schools)
- Instagram handle verification
- Add any additional social media profiles

## 📱 Mobile Responsiveness

The site is fully responsive with breakpoints at:
- Desktop: 1400px max-width
- Tablet: 768px and below
- Mobile: 480px and below

## 🌐 Deployment Options

### Option 1: Netlify (Recommended - Free)
1. Drag and drop the entire folder to Netlify
2. Your site will be live instantly

### Option 2: GitHub Pages (Free)
1. Create a GitHub repository
2. Push all files
3. Enable GitHub Pages in repository settings

### Option 3: Traditional Web Hosting
1. Upload all files via FTP
2. Ensure the server supports HTML/CSS/JS

## 📞 Contact

Email: bytesforbetterlives@gmail.com

## 📄 License

© 2025 Bytes for Better Lives. All rights reserved.

---

**Made with ❤️ for Bytes for Better Lives**
