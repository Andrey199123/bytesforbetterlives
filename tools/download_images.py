#!/usr/bin/env python3
"""
Image Downloader for Bytes for Better Lives Website
Downloads images from the original Wix website
"""

import requests
from bs4 import BeautifulSoup
import os
from urllib.parse import urljoin, urlparse
import time

# Resolve website paths independently of the caller's working directory.
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public'))
# Create images directory
os.makedirs('images', exist_ok=True)

def download_image(url, folder, filename):
    """Download an image from URL and save it"""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        filepath = os.path.join(folder, filename)
        with open(filepath, 'wb') as f:
            f.write(response.content)
        print(f"✓ Downloaded: {filename}")
        return True
    except Exception as e:
        print(f"✗ Failed to download {filename}: {e}")
        return False

def scrape_images(url):
    """Scrape images from the website"""
    print(f"\nScraping images from: {url}\n")
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        image_count = 0
        
        # Find all img tags
        for img in soup.find_all('img'):
            src = img.get('src') or img.get('data-src')
            if src:
                # Make absolute URL
                img_url = urljoin(url, src)
                
                # Skip tiny images (likely icons)
                if 'tiny' in img_url.lower() or 'icon' in img_url.lower():
                    continue
                
                # Generate filename
                parsed = urlparse(img_url)
                filename = os.path.basename(parsed.path)
                
                # If no extension, add .jpg
                if not os.path.splitext(filename)[1]:
                    filename += '.jpg'
                
                # Download
                if download_image(img_url, 'images', filename):
                    image_count += 1
                    time.sleep(0.5)  # Be polite
        
        # Also check for background images in style attributes
        for element in soup.find_all(style=True):
            style = element.get('style', '')
            if 'background-image' in style or 'background:' in style:
                # Extract URL from style
                import re
                urls = re.findall(r'url\(["\']?(.*?)["\']?\)', style)
                for bg_url in urls:
                    bg_url = urljoin(url, bg_url)
                    filename = f"bg-{image_count}.jpg"
                    if download_image(bg_url, 'images', filename):
                        image_count += 1
                        time.sleep(0.5)
        
        print(f"\n{'='*50}")
        print(f"Total images downloaded: {image_count}")
        print(f"{'='*50}\n")
        
    except Exception as e:
        print(f"Error scraping website: {e}")

def main():
    """Main function"""
    print("=" * 50)
    print("BYTES FOR BETTER LIVES - IMAGE DOWNLOADER")
    print("=" * 50)
    
    pages = [
        'https://bytesforbetterlives.wixsite.com/bfbl',
        'https://bytesforbetterlives.wixsite.com/bfbl/past-events',
        'https://bytesforbetterlives.wixsite.com/bfbl/our-work-with-seniors-1',
        'https://bytesforbetterlives.wixsite.com/bfbl/our-work-with-kids-1',
        'https://bytesforbetterlives.wixsite.com/bfbl/our-donations',
        'https://bytesforbetterlives.wixsite.com/bfbl/team-3',
        'https://bytesforbetterlives.wixsite.com/bfbl/team-1',
        'https://bytesforbetterlives.wixsite.com/bfbl/contact-us',
    ]
    
    for page in pages:
        scrape_images(page)
        time.sleep(1)  # Be polite between pages
    
    print("\n✓ Image download complete!")
    print(f"Images saved to: {os.path.abspath('images')}/\n")

if __name__ == '__main__':
    main()
