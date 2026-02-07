#!/usr/bin/env node
/**
 * Convert a recorded Playwright script to headless mode
 * Useful for running scripts on servers without GUI
 *
 * Usage:
 *   node convert-to-headless.js <input-script.js> [output-script.js]
 */

const fs = require('fs');
const path = require('path');

function convertToHeadless(inputPath, outputPath) {
  if (!fs.existsSync(inputPath)) {
    console.error('❌ Error: Input file not found:', inputPath);
    process.exit(1);
  }

  let content = fs.readFileSync(inputPath, 'utf8');

  // Convert headless: false to headless: true
  content = content.replace(
    /headless:\s*false/g,
    'headless: true'
  );

  // If no headless option exists, add it
  if (!content.includes('headless:')) {
    content = content.replace(
      /chromium\.launch\(\{/g,
      'chromium.launch({ headless: true,'
    );
    content = content.replace(
      /firefox\.launch\(\{/g,
      'firefox.launch({ headless: true,'
    );
    content = content.replace(
      /webkit\.launch\(\{/g,
      'webkit.launch({ headless: true,'
    );
    content = content.replace(
      /chromium\.launch\(\)/g,
      'chromium.launch({ headless: true })'
    );
    content = content.replace(
      /firefox\.launch\(\)/g,
      'firefox.launch({ headless: true })'
    );
    content = content.replace(
      /webkit\.launch\(\)/g,
      'webkit.launch({ headless: true })'
    );
  }

  // Add a comment at the top
  const header = `// ============================================
// Converted to HEADLESS mode for server execution
// Original script: ${path.basename(inputPath)}
// Converted: ${new Date().toISOString()}
// ============================================
// This script runs in headless mode (no visible browser)
// Perfect for server environments without GUI
// ============================================

`;

  content = header + content;

  fs.writeFileSync(outputPath, content, 'utf8');
  console.log('✅ Converted to headless mode');
  console.log('📄 Input:  ', inputPath);
  console.log('📄 Output: ', outputPath);
  console.log('');
  console.log('🚀 Run with:');
  console.log(`   cd ${__dirname} && node run.js ${outputPath}`);
}

// Parse arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: node convert-to-headless.js <input-script.js> [output-script.js]');
  console.log('');
  console.log('Example:');
  console.log('  node convert-to-headless.js /tmp/recorded-script.js /tmp/headless-script.js');
  process.exit(1);
}

const inputPath = path.resolve(args[0]);
const outputPath = args[1]
  ? path.resolve(args[1])
  : inputPath.replace(/\.js$/, '-headless.js');

convertToHeadless(inputPath, outputPath);
