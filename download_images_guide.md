# Guide: Download Images from Original Website

Since Wix websites dynamically load images and use complex CDN URLs, the easiest way to get the images is to download them manually from your browser. Here's how:

## Method 1: Right-Click Save (Easiest)

### For Desktop/Laptop:
1. Open the original website: https://bytesforbetterlives.wixsite.com/bfbl
2. Navigate to each page
3. Right-click on any image → "Save Image As..."
4. Save to the `images/` folder with a descriptive name

### Recommended Images to Download:

#### Home Page
- Background/hero images
- Any icons or graphics

#### Team Page (https://bytesforbetterlives.wixsite.com/bfbl/team-1)
- Team member photos:
  - Pranav Rai → save as `team-pranav.jpg`
  - Aaron Pinto → save as `team-aaron.jpg`
  - Alexey Guydouk → save as `team-alexey.jpg`
  - Ethan Chen → save as `team-ethan.jpg`
  - Andrey Vasilyev → save as `team-andrey.jpg`

#### Past Events Page
- Event photos → save as `event-[name].jpg`

#### Impact Page
- Partner logos → save as `partner-[name].png`

---

## Method 2: Browser Developer Tools (Advanced)

### Step-by-Step:

1. **Open Developer Tools**
   - Chrome/Edge: Press `F12` or `Cmd+Option+I` (Mac)
   - Firefox: Press `F12` or `Cmd+Option+I` (Mac)

2. **Go to the Network Tab**
   - Click the "Network" tab
   - Filter by "Img" to see only images

3. **Browse the Website**
   - Navigate through all pages
   - Watch images load in the Network tab

4. **Download Images**
   - Right-click on any image in the Network tab
   - Select "Open in new tab"
   - Save the image from the new tab

---

## Method 3: Page Source (Most Complete)

### Chrome/Edge/Firefox:

1. **View Page Source**
   - Right-click anywhere → "View Page Source"
   - Or press `Cmd+Option+U` (Mac) / `Ctrl+U` (Windows)

2. **Search for Image URLs**
   - Press `Cmd+F` / `Ctrl+F`
   - Search for: `.jpg`, `.png`, `.webp`
   - Copy image URLs

3. **Download with curl**
   ```bash
   cd images
   curl -O [IMAGE_URL]
   ```

---

## Method 4: Screenshot High-Quality Images

If you can't download an image directly:

### macOS:
1. Press `Cmd+Shift+4`
2. Press `Space` to capture a window
3. Click on the browser window
4. Crop and save

### Windows:
1. Press `Windows+Shift+S`
2. Select the area to capture
3. Save from clipboard

---

## Quick Alternative: Contact the Team

Since this is your organization's website, you likely have access to the original image files. Consider:

1. **Check your Google Drive/Dropbox** - Original photos might be there
2. **Ask team members** - They may have the photos on their devices
3. **Email the webmaster** - bytesforbetterlives@gmail.com

---

## After Downloading Images

1. Place all images in the `images/` folder
2. Rename them appropriately:
   - `team-[name].jpg`
   - `event-[event-name].jpg`
   - `partner-[partner-name].png`

3. Update HTML files to reference the images:
   ```html
   <!-- Instead of emoji placeholders -->
   <div class="team-photo">👨‍💼</div>
   
   <!-- Use actual images -->
   <img src="images/team-pranav.jpg" alt="Pranav Rai" class="team-photo">
   ```

---

## Image Optimization

After downloading, optimize images for web:

### Using Online Tools:
- **TinyPNG** - https://tinypng.com (drag & drop)
- **Squoosh** - https://squoosh.app (by Google)

### Using Command Line:
```bash
# Install ImageMagick
brew install imagemagick

# Resize and compress
convert input.jpg -resize 800x800 -quality 85 output.jpg
```

---

## Need Help?

If you're having trouble downloading images, you can:
1. Keep the emoji placeholders (they actually look quite modern!)
2. Use stock photos from:
   - **Unsplash** - https://unsplash.com (free, high-quality)
   - **Pexels** - https://pexels.com (free)
3. Take new photos at your next event

---

**Note:** The current website works perfectly with emoji placeholders. Only add real images when you have high-quality photos available!
