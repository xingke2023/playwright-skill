const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  // Configuration from environment variables
  const mode = process.env.MODE || 'save'; // 'save' or 'load'
  const url = process.env.URL || 'https://example.com';
  const headless = process.env.HEADLESS !== 'false';
  const cookieFile = process.env.COOKIE_FILE || path.join(__dirname, 'cookies.json');

  console.log(`🍪 Cookie Management Mode: ${mode}`);
  console.log(`🌐 URL: ${url}`);
  console.log(`📁 Cookie file: ${cookieFile}`);
  console.log(`👻 Headless: ${headless}`);
  console.log('');

  // Launch browser
  const browser = await chromium.launch({
    headless: headless
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  if (mode === 'load') {
    // Load cookies mode
    console.log('📂 Loading cookies from file...');

    if (!fs.existsSync(cookieFile)) {
      console.error(`❌ Cookie file not found: ${cookieFile}`);
      await browser.close();
      process.exit(1);
    }

    const cookies = JSON.parse(fs.readFileSync(cookieFile, 'utf8'));
    await context.addCookies(cookies);
    console.log(`✅ Loaded ${cookies.length} cookies`);
    console.log('');

    // Navigate to URL with loaded cookies
    console.log('🚀 Navigating to URL with cookies...');
    await page.goto(url);
    console.log('✅ Page loaded with cookies');

    // Keep browser open for user interaction
    if (!headless) {
      console.log('');
      console.log('🖱️  Browser is open. Interact with the page as needed.');
      console.log('⏸️  Press Ctrl+C to close when done.');

      // Wait indefinitely until user closes or Ctrl+C
      await new Promise(() => {});
    }
  } else {
    // Save cookies mode
    console.log('🚀 Navigating to URL...');
    await page.goto(url);
    console.log('✅ Page loaded');
    console.log('');

    if (!headless) {
      console.log('🖱️  Browser is open. Please log in or complete any actions.');
      console.log('⏸️  Press Ctrl+C when ready to save cookies.');
      console.log('');

      // Wait for user to complete login/actions
      // In non-headless mode, wait indefinitely until Ctrl+C
      process.on('SIGINT', async () => {
        console.log('');
        console.log('💾 Saving cookies...');

        const cookies = await context.cookies();
        fs.writeFileSync(cookieFile, JSON.stringify(cookies, null, 2), 'utf8');

        console.log(`✅ Saved ${cookies.length} cookies to: ${cookieFile}`);
        console.log('');
        console.log('Cookie details:');
        cookies.forEach(cookie => {
          console.log(`  • ${cookie.name} (domain: ${cookie.domain})`);
        });

        await browser.close();
        process.exit(0);
      });

      // Keep the browser open
      await new Promise(() => {});
    } else {
      // In headless mode, save cookies immediately
      console.log('💾 Saving cookies...');
      const cookies = await context.cookies();
      fs.writeFileSync(cookieFile, JSON.stringify(cookies, null, 2), 'utf8');
      console.log(`✅ Saved ${cookies.length} cookies to: ${cookieFile}`);
    }
  }

  await browser.close();
})();
