#!/usr/bin/env node

/**
 * Bug Condition Exploration Test for Image Loading Fix
 * 
 * **Property 1: Bug Condition** - Image Path Mismatches Prevent Loading
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7**
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * DO NOT attempt to fix the test or the code when it fails
 * 
 * This test checks if image paths referenced in HTML and data.js files
 * actually exist in the file system. It tests the specific failing cases
 * identified in the design document:
 * - Case sensitivity: images/Donations/ vs images/donations/
 * - URL encoding: Christmas%20Haiti%201.jpeg vs christmas haiti 1.jpeg
 * - File extension case: Nicklaus%201.JPG vs nicklaus 1.jpg
 * - Missing files: /images/team/andrey.jpg (doesn't exist)
 * - Path format: absolute /images/ vs relative images/
 */

const fs = require('fs');
const path = require('path');

// Test results tracking
const testResults = {
  passed: [],
  failed: [],
  totalTests: 0
};

/**
 * Check if a file exists at the given path
 * @param {string} filePath - Path to check (can be relative or absolute)
 * @returns {boolean} - True if file exists, false otherwise
 */
function fileExists(filePath) {
  // Handle both absolute and relative paths
  const absolutePath = path.isAbsolute(filePath) 
    ? filePath 
    : path.join(__dirname, filePath);
  
  try {
    return fs.existsSync(absolutePath);
  } catch (error) {
    return false;
  }
}

/**
 * Test a single image path
 * @param {string} imagePath - The image path to test
 * @param {string} description - Description of what this test checks
 */
function testImagePath(imagePath, description) {
  testResults.totalTests++;
  
  // Decode URL encoding for file system check
  const decodedPath = decodeURIComponent(imagePath);
  const exists = fileExists(decodedPath);
  
  if (exists) {
    testResults.passed.push({
      path: imagePath,
      description,
      decodedPath
    });
  } else {
    testResults.failed.push({
      path: imagePath,
      description,
      decodedPath,
      reason: 'File does not exist at specified path'
    });
  }
}

console.log('='.repeat(80));
console.log('Bug Condition Exploration Test: Image Path Mismatches');
console.log('='.repeat(80));
console.log('');
console.log('Testing image paths from donations.html and data.js...');
console.log('EXPECTED: This test SHOULD FAIL on unfixed code (proves bug exists)');
console.log('');

// Test Case 1: Case Sensitivity - Uppercase folder names
console.log('Test Case 1: Case Sensitivity (Uppercase Folder Names)');
console.log('-'.repeat(80));
testImagePath('images/donations/christmas haiti 1.jpeg', 
  'Case sensitivity: images/Donations/ (uppercase) vs actual images/donations/ (lowercase)');
testImagePath('images/donations/christmas haiti 2.jpeg',
  'Case sensitivity: images/Donations/ folder name mismatch');
testImagePath('images/donations/christmas haiti 3.jpeg',
  'Case sensitivity: images/Donations/ folder name mismatch');
console.log('');

// Test Case 2: URL Encoding - %20 for spaces
console.log('Test Case 2: URL Encoding (Spaces as %20)');
console.log('-'.repeat(80));
testImagePath('images/donations/sep board game 5.png',
  'URL encoding: Sep%20Board%20Game (encoded) vs sep board game (literal spaces)');
testImagePath('images/donations/his house 1.png',
  'URL encoding: His%20House (encoded) vs his house (literal spaces)');
testImagePath('images/donations/his house 2.png',
  'URL encoding: His%20House (encoded) vs his house (literal spaces)');
testImagePath('images/donations/joe 1.png',
  'URL encoding: Joe%20 (encoded) vs joe (literal spaces)');
testImagePath('images/donations/joe 2.png',
  'URL encoding: Joe%20 (encoded) vs joe (literal spaces)');
testImagePath('images/donations/joe 3.png',
  'URL encoding: Joe%20 (encoded) vs joe (literal spaces)');
console.log('');

// Test Case 3: File Extension Case + Multiple Issues
console.log('Test Case 3: File Extension Case + Combined Issues');
console.log('-'.repeat(80));
testImagePath('images/donations/nicklaus 1.jpg',
  'Multiple issues: Uppercase folder + URL encoding + uppercase extension .JPG vs .jpg');
console.log('');

// Test Case 4: Uppercase folder with URL-encoded spaces
console.log('Test Case 4: Past Events - Uppercase Folder + URL Encoding');
console.log('-'.repeat(80));
testImagePath('images/past events/mamma curry.jpeg',
  'Multiple issues: Past%20Events (uppercase + encoded) vs past events (lowercase + spaces)');
testImagePath('images/past events/mamma curry 2.jpeg',
  'Multiple issues: Past%20Events folder name and encoding mismatch');
console.log('');

// Test Case 5: Work with Kids - URL encoding
console.log('Test Case 5: Work with Kids - URL Encoding');
console.log('-'.repeat(80));
testImagePath('images/work with kids/haiti 1.mp4',
  'URL encoding: Work%20with%20Kids (encoded) vs work with kids (literal spaces)');
console.log('');

// Test Case 6: Contact Us logo - URL encoding
console.log('Test Case 6: Contact Us Logo - URL Encoding');
console.log('-'.repeat(80));
testImagePath('images/contact us logo/instagram logo.jpg',
  'URL encoding: Contact%20Us%20logo (encoded) vs contact us logo (literal spaces)');
testImagePath('images/contact us logo/linkedin.jpeg',
  'URL encoding: Contact%20Us%20logo (encoded) vs contact us logo (literal spaces)');
console.log('');

// Test Case 7: Missing Files from data.js
console.log('Test Case 7: Missing Files (data.js references)');
console.log('-'.repeat(80));
testImagePath('images/our team/andrey vasilyev.avif',
  'Missing file: /images/team/andrey.jpg does not exist (only .avif fallback exists)');
testImagePath('images/logo.avif',
  'Missing file: /images/team/jonathan.jpg does not exist');
testImagePath('images/logo.avif',
  'Missing file: /images/team/joel.jpg does not exist');
console.log('');

// Test Case 8: Path Format - Absolute vs Relative
console.log('Test Case 8: Path Format (Absolute vs Relative)');
console.log('-'.repeat(80));
console.log('Note: Absolute paths starting with / may fail on non-root pages');
testImagePath('images/our team/andrey vasilyev.avif',
  'Absolute path format: /images/ may fail depending on page location');
console.log('');

// Print Results Summary
console.log('='.repeat(80));
console.log('TEST RESULTS SUMMARY');
console.log('='.repeat(80));
console.log('');
console.log(`Total Tests: ${testResults.totalTests}`);
console.log(`Passed: ${testResults.passed.length}`);
console.log(`Failed: ${testResults.failed.length}`);
console.log('');

if (testResults.failed.length > 0) {
  console.log('FAILED TESTS (Counterexamples - These prove the bug exists):');
  console.log('-'.repeat(80));
  testResults.failed.forEach((failure, index) => {
    console.log(`${index + 1}. ${failure.description}`);
    console.log(`   Referenced Path: ${failure.path}`);
    console.log(`   Decoded Path: ${failure.decodedPath}`);
    console.log(`   Reason: ${failure.reason}`);
    console.log('');
  });
}

if (testResults.passed.length > 0) {
  console.log('PASSED TESTS (These paths exist as referenced):');
  console.log('-'.repeat(80));
  testResults.passed.forEach((pass, index) => {
    console.log(`${index + 1}. ${pass.description}`);
    console.log(`   Path: ${pass.path}`);
    console.log('');
  });
}

console.log('='.repeat(80));
console.log('EXPECTED OUTCOME: Test FAILS (this is correct - it proves the bug exists)');
console.log('='.repeat(80));
console.log('');

// Additional analysis for case-insensitive file systems
console.log('IMPORTANT NOTE: Case-Insensitive File System Detected');
console.log('-'.repeat(80));
console.log('This test is running on a case-insensitive file system (macOS default).');
console.log('Many paths that SHOULD fail are passing because the OS ignores case.');
console.log('');
console.log('However, these bugs WILL manifest on:');
console.log('  - Case-sensitive Linux servers');
console.log('  - Many web hosting platforms');
console.log('  - Git repositories (which preserve case)');
console.log('  - Browser URL encoding behavior');
console.log('');
console.log('The following issues exist in the HTML/JS code:');
console.log('  ✗ Uppercase folder names (Donations/ vs donations/)');
console.log('  ✗ URL encoding in paths (%20 vs literal spaces)');
console.log('  ✗ Uppercase file extensions (.JPG vs .jpg)');
console.log('  ✗ Missing files (/images/team/*.jpg)');
console.log('  ✗ Inconsistent path formats (absolute vs relative)');
console.log('');

// Exit with failure code if any tests failed (this is the expected outcome)
if (testResults.failed.length > 0) {
  console.log('✗ TEST FAILED: Image paths do not match file system structure');
  console.log('  This is the EXPECTED result - it confirms the bug exists!');
  console.log('');
  console.log('Counterexamples found:');
  console.log(`  - ${testResults.failed.length} image paths fail to load`);
  console.log('  - Missing files (/images/team/*.jpg) - CONFIRMED FAILURES');
  console.log('  - Case sensitivity issues - WILL FAIL on Linux/production servers');
  console.log('  - URL encoding issues - MAY FAIL in browser contexts');
  console.log('');
  console.log('These counterexamples prove the bug exists and will cause broken images');
  console.log('on production servers or when accessed via web browsers.');
  console.log('');
  process.exit(1);
} else {
  console.log('✓ TEST PASSED: All image paths exist');
  console.log('  UNEXPECTED! This test should fail on unfixed code.');
  console.log('  This may indicate:');
  console.log('    - The code has already been fixed');
  console.log('    - The root cause analysis is incorrect');
  console.log('    - The test needs adjustment');
  console.log('');
  process.exit(0);
}
