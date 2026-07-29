const { chromium } = require('playwright');

const SCRATCH = 'C:\\Users\\parin\\AppData\\Local\\Temp\\claude\\c--Users-parin-analytics-platform\\f47b4c37-114b-44b4-baf1-52ebe22c4d9e\\scratchpad';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

  // 1. Login page screenshot
  await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Sign in to your account');
  await page.screenshot({ path: `${SCRATCH}/login_desktop.png`, fullPage: true });

  // 2. Invalid credentials
  await page.fill('input[name="email"]', 'logintest@example.com');
  await page.fill('input[name="password"]', 'wrongpassword');
  await page.click('button[type="submit"]');
  await page.waitForSelector('text=Invalid email or password', { timeout: 8000 });
  await page.screenshot({ path: `${SCRATCH}/login_error.png`, fullPage: true });
  const errorText = await page.locator('text=Invalid email or password').first().textContent();

  // 3. Valid login
  await page.fill('input[name="password"]', 'testpass123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/projects', { timeout: 10000 }).catch(() => {});
  const urlAfterLogin = page.url();
  const localStorageDump = await page.evaluate(() => localStorage.getItem('stratum-auth'));

  // 4. Reload /login while authenticated -> should bounce to /projects
  await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const urlAfterReloadLogin = page.url();

  // 5. Landing page CTA hrefs
  await page.goto('http://localhost:3002/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${SCRATCH}/landing_desktop.png`, fullPage: false });
  const navGetStarted = await page.locator('header a:has-text("Get Started")').first().getAttribute('href');
  const heroGetStarted = await page.locator('a:has-text("Get Started Free")').last().getAttribute('href');
  const navLogin = await page.locator('header a:has-text("Log in")').first().getAttribute('href');
  const startProject = await page.locator('a:has-text("Start your project")').first().getAttribute('href');

  console.log(JSON.stringify({
    errorText,
    urlAfterLogin,
    localStorageDump,
    urlAfterReloadLogin,
    navGetStarted,
    heroGetStarted,
    navLogin,
    startProject,
    consoleErrors,
  }, null, 2));

  await browser.close();
})().catch((err) => {
  console.error('SCRIPT FAILED', err);
  process.exit(1);
});
