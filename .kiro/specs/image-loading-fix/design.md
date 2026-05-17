# Image Loading Fix Bugfix Design

## Overview

The Bytes for Better Lives website suffers from systematic image loading failures caused by path mismatches between HTML/JavaScript references and the actual file system structure. The bug manifests in three primary ways: (1) case sensitivity mismatches where HTML uses uppercase folder/file names but the file system uses lowercase, (2) URL encoding mismatches where HTML uses `%20` for spaces but the file system uses literal spaces, and (3) missing or incorrect file references. This fix will systematically correct all image paths across HTML files and data.js to match the actual file system structure, ensuring all images load correctly while preserving existing functionality.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when image paths in HTML/JS don't match actual file system paths due to case sensitivity, URL encoding, or incorrect references
- **Property (P)**: The desired behavior when image paths are referenced - images should load successfully by matching actual file system structure
- **Preservation**: Existing correctly-loading images, navigation, styling, and JavaScript functionality that must remain unchanged by the fix
- **Case Sensitivity Mismatch**: When HTML references use different letter casing than actual folder/file names (e.g., `Donations/` vs `donations/`)
- **URL Encoding Mismatch**: When HTML uses `%20` for spaces but file system uses literal spaces (e.g., `Christmas%20Haiti` vs `christmas haiti`)
- **Path Format**: The structure of image references, either absolute (`/images/`) or relative (`images/`)

## Bug Details

### Bug Condition

The bug manifests when HTML files (index.html, gallery.html, donations.html) or data.js reference image paths that don't match the actual file system structure. The image loading system fails to find files due to case sensitivity differences, URL encoding mismatches, or incorrect file references.

**Formal Specification:**
```
FUNCTION isBugCondition(imagePath)
  INPUT: imagePath of type String (from HTML src attribute or data.js)
  OUTPUT: boolean
  
  actualFileSystem := getActualFileSystemStructure()
  
  RETURN (
    // Case 1: Uppercase folder names in path but lowercase in file system
    (imagePath CONTAINS 'Donations/' AND actualFileSystem HAS 'donations/') OR
    (imagePath CONTAINS 'Past%20Events/' AND actualFileSystem HAS 'past events/') OR
    (imagePath CONTAINS 'Contact%20Us%20logo/' AND actualFileSystem HAS 'contact us logo/') OR
    
    // Case 2: URL-encoded spaces in path but literal spaces in file system
    (imagePath CONTAINS '%20' AND actualFileSystem HAS literal spaces) OR
    
    // Case 3: Incorrect case for file extensions
    (imagePath ENDS_WITH '.JPG' AND actualFileSystem HAS '.jpg') OR
    
    // Case 4: Referenced file doesn't exist
    (NOT fileExists(imagePath)) OR
    
    // Case 5: Inconsistent path format (absolute vs relative)
    (imagePath STARTS_WITH '/images/' AND currentPage NOT IN rootDirectory)
  )
END FUNCTION
```

### Examples

- **Case Sensitivity**: `images/Donations/Christmas%20Haiti%201.jpeg` fails because actual path is `images/donations/christmas haiti 1.jpeg`
- **URL Encoding**: `images/Donations/Nicklaus%201.JPG` fails because actual file is `images/donations/nicklaus 1.jpg`
- **Missing Files**: `/images/team/andrey.jpg` fails because file doesn't exist (only `.avif` fallback exists)
- **Path Format**: `/images/team/andrey.jpg` may fail on non-root pages due to absolute path
- **Mixed Issues**: `images/Past%20Events/Mamma%20Curry.jpeg` fails due to both uppercase folder name and URL encoding (actual: `images/past events/mamma curry.jpeg`)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Images that are already loading correctly with proper paths must continue to work
- The website's `.avif` format images (logo.avif, hero-bg.avif) must continue to load correctly
- Navigation, styling, and JavaScript functionality must remain unchanged
- Carousel functionality, modal displays, and interactive features must continue to work
- Footer social media icons and other correctly-referenced images must remain functional

**Scope:**
All image paths that currently match the file system structure should be completely unaffected by this fix. This includes:
- Correctly-cased paths with literal spaces (e.g., `images/work with seniors/tech help 1.png`)
- Properly-referenced `.avif` files
- Any dynamically-generated content that already uses correct paths
- Non-image-related HTML, CSS, and JavaScript code

## Hypothesized Root Cause

Based on the bug description and file system analysis, the root causes are:

1. **Manual Path Entry Errors**: Developers manually typed image paths with incorrect casing, assuming case-insensitive file systems or not checking actual folder names
   - HTML uses `images/Donations/` but actual folder is `images/donations/`
   - HTML uses `images/Past%20Events/` but actual folder is `images/past events/`

2. **URL Encoding Confusion**: Developers used URL encoding (`%20`) for spaces in file paths, but the file system uses literal spaces
   - HTML uses `Christmas%20Haiti%201.jpeg` but actual file is `christmas haiti 1.jpeg`
   - This suggests copy-pasting from browser URLs or automatic encoding by editors

3. **File Extension Case Inconsistency**: Some references use uppercase extensions (`.JPG`) while actual files use lowercase (`.jpg`)
   - HTML uses `Nicklaus%201.JPG` but actual file is `nicklaus 1.jpg`

4. **Missing File References**: data.js references files that don't exist in the file system
   - References `/images/team/*.jpg` files that don't exist
   - Only `.avif` fallback files are present

5. **Path Format Inconsistency**: Mixed use of absolute (`/images/`) and relative (`images/`) paths
   - Absolute paths may fail on non-root pages depending on server configuration

## Correctness Properties

Property 1: Bug Condition - Image Paths Match File System

_For any_ image reference where the path doesn't match the actual file system structure (isBugCondition returns true), the fixed HTML/JavaScript SHALL use the correct lowercase folder names, literal spaces, correct file extensions, and existing file paths that match the actual file system, causing images to load successfully.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

Property 2: Preservation - Correctly-Loading Images

_For any_ image reference where the path already matches the file system structure (isBugCondition returns false), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing correctly-loading images and functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**Files to Modify**:
1. `donations.html` - Fix all image paths in carousel containers
2. `data.js` - Fix image paths in officers array and gallery array
3. `index.html` - Fix any incorrect image paths (if present)
4. `gallery.html` - Verify paths are correct (likely uses data.js)

**Specific Changes**:

1. **Case Sensitivity Corrections**:
   - Replace `images/Donations/` with `images/donations/` throughout all files
   - Replace `images/Past%20Events/` with `images/past events/` throughout all files
   - Replace `images/Contact%20Us%20logo/` with `images/contact us logo/` throughout all files
   - Replace `images/Work%20with%20Kids/` with `images/work with kids/` throughout all files

2. **URL Encoding Removal**:
   - Replace all `%20` with literal spaces in image paths
   - Examples:
     - `Christmas%20Haiti%201.jpeg` → `christmas haiti 1.jpeg`
     - `Nicklaus%201.JPG` → `nicklaus 1.jpg`
     - `His%20House%201.png` → `his house 1.png`
     - `Sep%20Board%20Game%205.png` → `sep board game 5.png`

3. **File Extension Case Corrections**:
   - Replace `.JPG` with `.jpg` where actual files use lowercase
   - Example: `Nicklaus%201.JPG` → `nicklaus 1.jpg`

4. **Missing File Corrections**:
   - In `data.js`, update officer photo paths to use existing `.avif` fallback files or correct paths
   - Replace `/images/team/andrey.jpg` with `images/our team/andrey vasilyev.avif`
   - Replace `/images/team/jonathan.jpg` with `images/logo.avif` (fallback)
   - Replace `/images/team/joel.jpg` with `images/logo.avif` (fallback)

5. **Path Format Standardization**:
   - Convert all absolute paths (`/images/`) to relative paths (`images/`)
   - This ensures consistency and avoids issues with non-root page locations

6. **Filename Case Corrections**:
   - Ensure all filenames match actual file system casing (all lowercase)
   - Examples:
     - `Christmas Haiti 1.jpeg` → `christmas haiti 1.jpeg`
     - `His House 1.png` → `his house 1.png`
     - `Joe 1.png` → `joe 1.png`

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code by attempting to load broken images, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write automated tests that attempt to load each image path referenced in HTML and data.js, checking if the file exists in the file system with the exact path specified. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Case Sensitivity Test**: Attempt to load `images/Donations/Christmas%20Haiti%201.jpeg` (will fail - folder case mismatch)
2. **URL Encoding Test**: Attempt to load `images/donations/Christmas%20Haiti%201.jpeg` (will fail - URL encoding and case mismatch)
3. **Extension Case Test**: Attempt to load `images/Donations/Nicklaus%201.JPG` (will fail - multiple issues)
4. **Missing File Test**: Attempt to load `/images/team/andrey.jpg` (will fail - file doesn't exist)
5. **Path Format Test**: Verify absolute paths work from all page locations (may fail on non-root pages)

**Expected Counterexamples**:
- Browser console will show 404 errors for images with incorrect paths
- Visual inspection will show broken image icons on donations.html and other pages
- Possible causes: case sensitivity, URL encoding, missing files, path format inconsistency

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL imagePath WHERE isBugCondition(imagePath) DO
  correctedPath := applyPathCorrections(imagePath)
  ASSERT fileExists(correctedPath)
  ASSERT imageLoadsSuccessfully(correctedPath)
END FOR
```

**Test Plan**: After implementing the fix, verify that:
1. All images on donations.html load successfully (no broken images)
2. All images in gallery.html load successfully (dynamically from data.js)
3. All officer photos in data.js reference existing files
4. Browser console shows no 404 errors for image requests
5. Visual inspection confirms all images display correctly

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL imagePath WHERE NOT isBugCondition(imagePath) DO
  ASSERT originalHTML(imagePath) = fixedHTML(imagePath)
  ASSERT imageLoadsSuccessfully(imagePath)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for correctly-loading images, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Logo Preservation**: Verify `images/logo.avif` continues to load correctly after fix
2. **Hero Background Preservation**: Verify `images/hero-bg.avif` continues to load correctly after fix
3. **Correct Path Preservation**: Verify `images/work with seniors/tech help 1.png` continues to load correctly
4. **Navigation Preservation**: Verify all navigation links continue to work correctly
5. **JavaScript Preservation**: Verify carousel functionality, modal displays, and interactive features continue to work

### Unit Tests

- Test each corrected image path individually to verify file exists
- Test case sensitivity corrections (uppercase → lowercase)
- Test URL encoding removal (`%20` → literal space)
- Test file extension case corrections (`.JPG` → `.jpg`)
- Test missing file corrections (non-existent → existing fallback)
- Test path format standardization (absolute → relative)

### Property-Based Tests

- Generate random image paths from HTML/data.js and verify they match file system structure
- Generate random combinations of case, encoding, and format to verify all load correctly
- Test that all images across multiple pages load successfully
- Test that no 404 errors occur for any image requests

### Integration Tests

- Load donations.html and verify all carousel images display correctly
- Load gallery.html and verify all dynamically-generated images display correctly
- Load index.html and verify all images (hero, logo, officer photos) display correctly
- Test navigation between pages and verify images load correctly on all pages
- Test carousel functionality with corrected image paths
- Test modal/lightbox functionality with corrected image paths
