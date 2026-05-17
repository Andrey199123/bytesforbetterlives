#!/bin/bash

# Bytes for Better Lives - Image Downloader
# Downloads images from the original Wix website using wget

echo "=================================================="
echo "BYTES FOR BETTER LIVES - IMAGE DOWNLOADER"
echo "=================================================="
echo ""

# Check if wget is installed
if ! command -v wget &> /dev/null; then
    echo "⚠️  wget is not installed. Installing via Homebrew..."
    if command -v brew &> /dev/null; then
        brew install wget
    else
        echo "❌ Homebrew not found. Please install wget manually:"
        echo "   brew install wget"
        exit 1
    fi
fi

# Create images directory
mkdir -p images
cd images

echo "📥 Downloading website pages to extract image URLs..."
echo ""

# Download pages and extract image URLs
pages=(
    "https://bytesforbetterlives.wixsite.com/bfbl"
    "https://bytesforbetterlives.wixsite.com/bfbl/team-1"
    "https://bytesforbetterlives.wixsite.com/bfbl/past-events"
    "https://bytesforbetterlives.wixsite.com/bfbl/team-3"
)

count=0

for page in "${pages[@]}"; do
    echo "🔍 Scanning: $page"
    
    # Download the page
    temp_file="temp_page_$count.html"
    wget -q -O "$temp_file" "$page"
    
    if [ -f "$temp_file" ]; then
        # Extract image URLs and download them
        grep -oP 'src="[^"]*\.(jpg|jpeg|png|webp|gif)"' "$temp_file" | \
        sed 's/src="//g' | sed 's/"//g' | \
        while read -r img_url; do
            # Make absolute URL if relative
            if [[ ! $img_url =~ ^http ]]; then
                img_url="https://bytesforbetterlives.wixsite.com$img_url"
            fi
            
            # Skip tiny icons
            if [[ $img_url =~ (icon|favicon|tiny|logo\.png) ]]; then
                continue
            fi
            
            # Download image
            filename=$(basename "$img_url" | cut -d'?' -f1)
            if [ ! -f "$filename" ]; then
                echo "  ✓ Downloading: $filename"
                wget -q "$img_url" -O "$filename" 2>/dev/null || echo "  ✗ Failed: $filename"
                sleep 0.5
            fi
        done
        
        # Also try data-src attributes (Wix lazy loading)
        grep -oP 'data-src="[^"]*\.(jpg|jpeg|png|webp|gif)"' "$temp_file" | \
        sed 's/data-src="//g' | sed 's/"//g' | \
        while read -r img_url; do
            if [[ ! $img_url =~ ^http ]]; then
                img_url="https://bytesforbetterlives.wixsite.com$img_url"
            fi
            
            filename=$(basename "$img_url" | cut -d'?' -f1)
            if [ ! -f "$filename" ]; then
                echo "  ✓ Downloading: $filename"
                wget -q "$img_url" -O "$filename" 2>/dev/null || echo "  ✗ Failed: $filename"
                sleep 0.5
            fi
        done
        
        rm "$temp_file"
    fi
    
    ((count++))
    echo ""
done

echo "=================================================="
echo "✅ Image download complete!"
echo "📂 Images saved to: $(pwd)"
echo "=================================================="
echo ""
echo "📝 Next steps:"
echo "1. Review images in the images/ folder"
echo "2. Rename them appropriately (e.g., team-pranav.jpg)"
echo "3. Delete any unwanted images"
echo "4. Update HTML files to reference the images"
echo ""
