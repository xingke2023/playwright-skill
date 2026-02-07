#!/usr/bin/env node
/**
 * Universal Playwright Executor for Claude Code
 *
 * Executes Playwright automation code from:
 * - File path: node run.js script.js
 * - Inline code: node run.js 'await page.goto("...")'
 * - Stdin: cat script.js | node run.js
 *
 * Ensures proper module resolution by running from skill directory.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Change to skill directory for proper module resolution
process.chdir(__dirname);

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
    console.log('✅ Playwright installed successfully');
    return true;
  } catch (e) {
    console.error('❌ Failed to install Playwright:', e.message);
    console.error('Please run manually: cd', __dirname, '&& npm run setup');
    return false;
  }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    edit: false,
    editor: process.env.EDITOR || process.env.VISUAL || 'nano',
    inspect: false,
    filePath: null,
    codeArgs: []
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--edit' || arg === '-e') {
      config.edit = true;
    } else if (arg === '--editor') {
      config.editor = args[++i];
    } else if (arg === '--inspect' || arg === '-i' || arg === '--debug' || arg === '-d') {
      config.inspect = true;
    } else if (!config.filePath && fs.existsSync(arg)) {
      config.filePath = path.resolve(arg);
    } else {
      config.codeArgs.push(arg);
    }
  }

  return config;
}

/**
 * Open file in editor and wait for user to finish
 */
function openInEditor(filePath, editor) {
  console.log(`✏️  Opening file in ${editor}...`);
  console.log(`📄 File: ${filePath}`);
  console.log('💡 Save and close the editor when done\n');

  try {
    execSync(`${editor} "${filePath}"`, {
      stdio: 'inherit',
      cwd: path.dirname(filePath)
    });
    console.log('\n✅ Editor closed. Proceeding with execution...\n');
    return true;
  } catch (error) {
    console.error(`❌ Failed to open editor: ${error.message}`);
    console.error('💡 You can specify a different editor with --editor <name>');
    console.error('   Examples: --editor vim, --editor code, --editor nano\n');
    return false;
  }
}

/**
 * Get code to execute from various sources
 */
function getCodeToExecute(config) {
  // Case 1: File path provided
  if (config.filePath) {
    console.log(`📄 Executing file: ${config.filePath}`);
    return fs.readFileSync(config.filePath, 'utf8');
  }

  // Case 2: Inline code provided as argument
  if (config.codeArgs.length > 0) {
    console.log('⚡ Executing inline code');
    return config.codeArgs.join(' ');
  }

  // Case 3: Code from stdin
  if (!process.stdin.isTTY) {
    console.log('📥 Reading from stdin');
    return fs.readFileSync(0, 'utf8');
  }

  // No input
  console.error('❌ No code to execute');
  console.error('Usage:');
  console.error('  node run.js script.js              # Execute file');
  console.error('  node run.js --edit script.js       # Edit then execute');
  console.error('  node run.js --editor vim script.js # Use specific editor');
  console.error('  node run.js "code here"            # Execute inline');
  console.error('  cat script.js | node run.js        # Execute from stdin');
  process.exit(1);
}

/**
 * Clean up old temporary execution files from previous runs
 */
function cleanupOldTempFiles() {
  try {
    const files = fs.readdirSync(__dirname);
    const tempFiles = files.filter(f => f.startsWith('.temp-execution-') && f.endsWith('.js'));

    if (tempFiles.length > 0) {
      tempFiles.forEach(file => {
        const filePath = path.join(__dirname, file);
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          // Ignore errors - file might be in use or already deleted
        }
      });
    }
  } catch (e) {
    // Ignore directory read errors
  }
}

/**
 * Inject Inspector pause at the beginning of script
 */
function injectInspectorPause(code) {
  const inspectorCode = `\n  // 🔍 Playwright Inspector - Use the UI to step through and modify actions\n  console.log('\\n🔍 Opening Playwright Inspector...');\n  console.log('   • Click "Step over" to execute each action');\n  console.log('   • Use "Explore" to test selectors');\n  console.log('   • Click "Resume" to continue execution\\n');\n  await page.pause();\n`;

  // Try multiple patterns to find where to insert
  const patterns = [
    // Pattern 1: const page = await context.newPage();
    {
      regex: /(const\s+page\s*=\s*await\s+context\.newPage\(\);)/,
      offset: 0
    },
    // Pattern 2: const page = await browser.newPage();
    {
      regex: /(const\s+page\s*=\s*await\s+browser\.newPage\(\);)/,
      offset: 0
    },
    // Pattern 3: page = await context.newPage();
    {
      regex: /(page\s*=\s*await\s+context\.newPage\(\);)/,
      offset: 0
    }
  ];

  for (const pattern of patterns) {
    const match = code.match(pattern.regex);
    if (match) {
      const insertPosition = match.index + match[0].length + pattern.offset;
      return code.slice(0, insertPosition) + inspectorCode + code.slice(insertPosition);
    }
  }

  // Fallback: Don't inject if we can't find a good spot
  console.warn('⚠️  Warning: Could not find suitable location to inject Inspector pause');
  return code;
}

/**
 * Wrap code in async IIFE if not already wrapped
 */
function wrapCodeIfNeeded(code, enableInspector = false) {
  // Check if code already has require() and async structure
  const hasRequire = code.includes('require(');
  const hasAsyncIIFE = code.includes('(async () => {') || code.includes('(async()=>{');

  // Inject inspector pause if requested
  if (enableInspector) {
    code = injectInspectorPause(code);
  }

  // If it's already a complete script, return as-is (with inspector if added)
  if (hasRequire && hasAsyncIIFE) {
    return code;
  }

  // If it's just Playwright commands, wrap in full template
  if (!hasRequire) {
    const inspectorHint = enableInspector
      ? '\n  // 🔍 Inspector will open automatically after browser launches\n  await page.pause();\n'
      : '';

    return `
const { chromium, firefox, webkit, devices } = require('playwright');
const helpers = require('./lib/helpers');

// Extra headers from environment variables (if configured)
const __extraHeaders = helpers.getExtraHeadersFromEnv();

/**
 * Utility to merge environment headers into context options.
 * Use when creating contexts with raw Playwright API instead of helpers.createContext().
 * @param {Object} options - Context options
 * @returns {Object} Options with extraHTTPHeaders merged in
 */
function getContextOptionsWithHeaders(options = {}) {
  if (!__extraHeaders) return options;
  return {
    ...options,
    extraHTTPHeaders: {
      ...__extraHeaders,
      ...(options.extraHTTPHeaders || {})
    }
  };
}

(async () => {
  try {
    ${inspectorHint}${code}
  } catch (error) {
    console.error('❌ Automation error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
})();
`;
  }

  // If has require but no async wrapper
  if (!hasAsyncIIFE) {
    return `
(async () => {
  try {
    ${code}
  } catch (error) {
    console.error('❌ Automation error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
})();
`;
  }

  return code;
}

/**
 * Main execution
 */
async function main() {
  console.log('🎭 Playwright Skill - Universal Executor\n');

  // Clean up old temp files from previous runs
  cleanupOldTempFiles();

  // Check Playwright installation
  if (!checkPlaywrightInstalled()) {
    const installed = installPlaywright();
    if (!installed) {
      process.exit(1);
    }
  }

  // Parse command line arguments
  const config = parseArgs();

  // Show inspector mode info
  if (config.inspect) {
    console.log('🔍 Inspector Mode Enabled');
    console.log('   Playwright Inspector will open for visual debugging\n');
  }

  // If --edit flag is provided and we have a file, open it in editor first
  if (config.edit && config.filePath) {
    const success = openInEditor(config.filePath, config.editor);
    if (!success) {
      console.error('❌ Failed to edit file. Aborting execution.');
      process.exit(1);
    }
  } else if (config.edit && !config.filePath) {
    console.error('❌ --edit flag requires a file path');
    console.error('Usage: node run.js --edit script.js');
    process.exit(1);
  }

  // Get code to execute
  const rawCode = getCodeToExecute(config);
  const code = wrapCodeIfNeeded(rawCode, config.inspect);

  // Create temporary file for execution
  const tempFile = path.join(__dirname, `.temp-execution-${Date.now()}.js`);

  try {
    // Write code to temp file
    fs.writeFileSync(tempFile, code, 'utf8');

    // Execute the code
    console.log('🚀 Starting automation...\n');
    require(tempFile);

    // Note: Temp file will be cleaned up on next run
    // This allows long-running async operations to complete safely

  } catch (error) {
    console.error('❌ Execution failed:', error.message);
    if (error.stack) {
      console.error('\n📋 Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
