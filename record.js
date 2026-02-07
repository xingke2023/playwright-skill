#!/usr/bin/env node
/**
 * Playwright Recorder for Claude Code
 *
 * Records browser interactions and generates executable Playwright scripts.
 * Perfect for documenting workflows, creating automation templates, or
 * capturing complex multi-step processes.
 *
 * Usage:
 *   node record.js [URL] [options]
 *
 * Options:
 *   --output <file>       Output file path (default: /tmp/recorded-script-TIMESTAMP.js)
 *   --browser <type>      Browser to use: chromium, firefox, webkit (default: chromium)
 *   --device <name>       Emulate mobile device (e.g., "iPhone 13")
 *   --viewport <WxH>      Custom viewport size (e.g., "1920x1080")
 *   --lang <code>         Generated code language: javascript, python (default: javascript)
 *   --load-storage <file> Load authentication state from file (e.g., auth.json)
 *
 * Examples:
 *   node record.js https://example.com
 *   node record.js http://localhost:3000 --output /tmp/my-workflow.js
 *   node record.js --device "iPhone 13"
 *   node record.js https://example.com/dashboard --load-storage auth.json
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Change to skill directory for proper module resolution
process.chdir(__dirname);

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    url: null,
    output: null,
    browser: 'chromium',
    device: null,
    viewport: null,
    lang: 'javascript',
    loadStorage: null,
    edit: false,
    editor: process.env.EDITOR || process.env.VISUAL || 'nano',
    run: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--output' || arg === '-o') {
      config.output = args[++i];
    } else if (arg === '--browser' || arg === '-b') {
      config.browser = args[++i];
    } else if (arg === '--device' || arg === '-d') {
      config.device = args[++i];
    } else if (arg === '--viewport' || arg === '-v') {
      config.viewport = args[++i];
    } else if (arg === '--lang' || arg === '-l') {
      config.lang = args[++i];
    } else if (arg === '--load-storage' || arg === '-s') {
      config.loadStorage = args[++i];
    } else if (arg === '--edit' || arg === '-e') {
      config.edit = true;
    } else if (arg === '--editor') {
      config.editor = args[++i];
    } else if (arg === '--run' || arg === '-r') {
      config.run = true;
    } else if (!arg.startsWith('--') && !config.url) {
      config.url = arg;
    }
  }

  return config;
}

/**
 * Generate default output filename
 */
function generateOutputFilename() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  return `/tmp/recorded-script-${timestamp}-${Date.now()}.js`;
}

/**
 * Check if Playwright is installed
 */
function checkPlaywrightInstalled() {
  try {
    require.resolve('playwright');
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Install Playwright if missing
 */
function installPlaywright() {
  console.log('📦 Playwright not found. Installing...');
  try {
    execSync('npm install', { stdio: 'inherit', cwd: __dirname });
    execSync('npx playwright install chromium', { stdio: 'inherit', cwd: __dirname });
    console.log('✅ Playwright installed successfully\n');
    return true;
  } catch (e) {
    console.error('❌ Failed to install Playwright:', e.message);
    console.error('Please run manually: cd', __dirname, '&& npm run setup');
    return false;
  }
}

/**
 * Post-process the generated script
 */
function postProcessScript(filepath, originalUrl) {
  try {
    let content = fs.readFileSync(filepath, 'utf8');

    // Check if fs module is already imported
    const hasFsImport = /const\s+fs\s*=\s*require\(['"]fs['"]\)/.test(content);

    // Add parameterized URL constant at the top
    const urlComment = originalUrl
      ? `// Target URL (auto-detected or user-provided)\nconst TARGET_URL = '${originalUrl}';\n\n`
      : `// Target URL - Update this to match your environment\nconst TARGET_URL = 'http://localhost:3000';\n\n`;

    // Find where to insert the URL constant (after imports, before main code)
    const importRegex = /const \{ chromium.*?\} = require\('playwright'\);/;
    const match = content.match(importRegex);

    if (match) {
      const insertPosition = match.index + match[0].length;

      // Always add fs import (unless already present)
      let additionalImports = '';
      if (!hasFsImport) {
        additionalImports = "\nconst fs = require('fs');";
      }

      content = content.slice(0, insertPosition) + additionalImports + '\n\n' + urlComment + content.slice(insertPosition);
    } else {
      // If no imports found, add at the beginning
      content = urlComment + content;
    }

    // Replace hardcoded URLs with TARGET_URL variable
    if (originalUrl) {
      const urlPattern = new RegExp(originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      content = content.replace(urlPattern, 'TARGET_URL');
    }

    // Add helpful comments
    const header = `// ============================================
// Recorded Playwright Script
// Generated: ${new Date().toISOString()}
// ============================================
// This script was recorded using Playwright Codegen.
// You can edit it to customize the automation behavior.
//
// To run this script:
//   cd ${__dirname} && node run.js ${filepath}
//
// To modify and re-record:
//   cd ${__dirname} && node record.js ${originalUrl || ''}
// ============================================

`;

    content = header + content;

    // Write the updated content
    fs.writeFileSync(filepath, content, 'utf8');

    return true;
  } catch (e) {
    console.error('⚠️  Warning: Could not post-process script:', e.message);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🎬 Playwright Recorder - Record Browser Interactions\n');

  // Check Playwright installation
  if (!checkPlaywrightInstalled()) {
    const installed = installPlaywright();
    if (!installed) {
      process.exit(1);
    }
  }

  // Parse arguments
  const config = parseArgs();

  // Generate output filename if not provided
  if (!config.output) {
    config.output = generateOutputFilename();
  }

  // Ensure output directory exists
  const outputDir = path.dirname(config.output);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Build codegen command
  const codegenArgs = [
    'npx',
    'playwright',
    'codegen',
    '--target', config.lang,
    '--output', config.output,
    '--browser', config.browser
  ];

  if (config.device) {
    codegenArgs.push('--device', config.device);
  }

  if (config.viewport) {
    codegenArgs.push('--viewport-size', config.viewport);
  }

  if (config.loadStorage) {
    // Verify storage file exists
    const storagePath = path.resolve(config.loadStorage);
    if (!fs.existsSync(storagePath)) {
      console.error(`❌ Error: Storage file not found: ${storagePath}`);
      console.error('   Please ensure the file exists or remove the --load-storage parameter\n');
      process.exit(1);
    }

    // Auto-convert cookies.json format if needed
    try {
      const storageContent = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
      let finalStoragePath = storagePath;

      // Check if it's a simple cookie array (needs conversion)
      if (Array.isArray(storageContent)) {
        console.log('🔄 Detected cookie array format, converting to storage state...');

        // Convert to storage state format
        const storageState = {
          cookies: storageContent,
          origins: []
        };

        // Save to temporary file
        const tempStoragePath = path.join(__dirname, '.tmp-storage-state.json');
        fs.writeFileSync(tempStoragePath, JSON.stringify(storageState, null, 2), 'utf8');
        finalStoragePath = tempStoragePath;

        console.log('✅ Format converted successfully');
      } else if (!storageContent.cookies) {
        // Invalid format
        console.error(`❌ Error: Invalid storage file format`);
        console.error('   Expected: { "cookies": [...] } or [...]');
        console.error('   Got:', typeof storageContent);
        process.exit(1);
      }

      codegenArgs.push('--load-storage', finalStoragePath);
    } catch (e) {
      console.error(`❌ Error: Failed to parse storage file: ${e.message}`);
      process.exit(1);
    }
  }

  if (config.url) {
    codegenArgs.push(config.url);
  }

  // Display configuration
  console.log('📋 Recording Configuration:');
  console.log(`   URL: ${config.url || '(will start with about:blank)'}`);
  console.log(`   Browser: ${config.browser}`);
  console.log(`   Output: ${config.output}`);
  console.log(`   Language: ${config.lang}`);
  if (config.device) {
    console.log(`   Device: ${config.device}`);
  }
  if (config.viewport) {
    console.log(`   Viewport: ${config.viewport}`);
  }
  if (config.loadStorage) {
    console.log(`   🍪 Load Storage: ${config.loadStorage} (cookies will be loaded)`);
  }
  console.log('');
  console.log('🎥 Recording started! A browser window will open.');
  console.log('   ├─ Perform your actions in the browser');
  console.log('   ├─ The script will be generated automatically');
  console.log('   └─ Close the browser window when done');
  console.log('');
  console.log('💡 Tips:');
  console.log('   • Click, type, navigate normally');
  console.log('   • Use the inspector toolbar to select elements');
  console.log('   • Press Record to pause/resume recording');
  console.log('   • Generated script will be saved to:', config.output);
  console.log('');
  console.log('Press Ctrl+C to cancel\n');
  console.log('─'.repeat(60));
  console.log('');

  // Execute codegen
  const child = spawn(codegenArgs[0], codegenArgs.slice(1), {
    stdio: 'inherit',
    cwd: __dirname,
    shell: true
  });

  child.on('exit', (code) => {
    // Clean up temporary storage file if created
    const tempStoragePath = path.join(__dirname, '.tmp-storage-state.json');
    if (fs.existsSync(tempStoragePath)) {
      try {
        fs.unlinkSync(tempStoragePath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    if (code === 0) {
      console.log('');
      console.log('─'.repeat(60));
      console.log('');
      console.log('✅ Recording completed successfully!');
      console.log('');

      // Post-process the generated script
      console.log('📝 Post-processing script...');
      const processed = postProcessScript(config.output, config.url);

      if (processed) {
        console.log('   • Added URL parameterization');
        console.log('   • Added helpful comments and headers');
        console.log('   • Auto-imported fs module');
      }

      console.log('');
      console.log('📄 Script saved to:', config.output);
      console.log('');
      console.log('🚀 To run the recorded script:');
      console.log(`   cd ${__dirname} && node run.js ${config.output}`);
      console.log('');
      console.log('✏️  To edit the script:');
      console.log(`   nano ${config.output}`);
      console.log('');
      console.log('🔄 To re-record from the same URL:');
      console.log(`   cd ${__dirname} && node record.js ${config.url || ''}`);
      console.log('');

    } else if (code !== null) {
      console.error('');
      console.error('❌ Recording failed with exit code:', code);
      process.exit(code);
    }
  });

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n\n⚠️  Recording cancelled by user');
    child.kill();

    // Clean up temporary storage file if created
    const tempStoragePath = path.join(__dirname, '.tmp-storage-state.json');
    if (fs.existsSync(tempStoragePath)) {
      try {
        fs.unlinkSync(tempStoragePath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    process.exit(0);
  });
}

// Run main function
main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
