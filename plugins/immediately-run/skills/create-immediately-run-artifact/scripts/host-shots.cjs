// Drive a dev-served app on immediately.run in a PRIVATE headless Chrome (not the
// shared MCP profile), wait for the app to render, report what it sees, and
// screenshot each section.
//
//   node host-shots.cjs <present-url> <out-prefix> <width> <height> <marker-id> [section-id ...]
//
// <present-url>  the `immediately.run dev --json` url with /edit/ swapped for /present/
// <marker-id>    an element id that exists only once the app has rendered (e.g. the
//                first <Section id>); its frame is the app frame
// FORCE_LIGHT=1  sets <html data-theme="light"> in the app frame to check the light
//                palette (the host's theme is its own setting, not prefers-color-scheme)
// PLAYWRIGHT_CORE  path to a playwright-core install (default: resolve `playwright-core`
//                  from this script's or the working directory's node_modules)
// CHROME         path to the Chrome binary (default: the macOS install location)
//
// Local-network access (the page fetching http://127.0.0.1) is a permission prompt
// in Chrome 142+; the flags below switch it off for this private instance only.
const path = require('path');
function loadPlaywright() {
  if (process.env.PLAYWRIGHT_CORE) return require(path.resolve(process.env.PLAYWRIGHT_CORE));
  try {
    return require(require.resolve('playwright-core', { paths: [__dirname, process.cwd()] }));
  } catch {
    console.error('playwright-core not found. Install it somewhere and point PLAYWRIGHT_CORE at it:\n' +
      '  npm install --prefix <scratch>/pw playwright-core\n' +
      '  PLAYWRIGHT_CORE=<scratch>/pw/node_modules/playwright-core node host-shots.cjs …');
    process.exit(2);
  }
}
const { chromium } = loadPlaywright();

(async () => {
  const [url, out, w, h, marker, ...sections] = process.argv.slice(2);
  const browser = await chromium.launch({
    executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessRespectPreflightResults,BlockInsecurePrivateNetworkRequests'],
  });
  const page = await browser.newPage({ viewport: { width: +w, height: +h } });
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`[error] ${m.text().slice(0, 300)}`); });
  page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message.slice(0, 300)}`));
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });

  let frame = null;
  for (let i = 0; i < 60 && !frame; i++) {
    await page.waitForTimeout(1000);
    for (const f of page.frames()) {
      try { if (await f.evaluate((id) => !!document.getElementById(id), marker)) frame = f; } catch {}
    }
  }
  if (!frame) {
    await page.screenshot({ path: `${out}-fail.png` });
    console.log(`APP NEVER RENDERED #${marker} — see ${out}-fail.png\n${problems.join('\n')}`);
    await browser.close();
    process.exit(1);
  }
  await page.waitForTimeout(2500);
  if (process.env.FORCE_LIGHT) await frame.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  const seen = await frame.evaluate(() => ({
    imagesLoaded: [...document.images].filter((i) => i.naturalWidth > 0).length,
    imagesTotal: document.images.length,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
  }));
  console.log(JSON.stringify(seen));
  for (const id of ['top', ...sections]) {
    await frame.evaluate((id) => (id === 'top' ? window.scrollTo(0, 0) : document.getElementById(id)?.scrollIntoView()), id);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}-${id}.png` });
  }
  // Host noise that is not the app's: App Check/recaptcha in headless, telemetry 401s,
  // the sandboxed frame's storage-access refusal.
  const own = problems.filter((p) => !/appcheck|app-check|recaptcha|40[13]|requestStorageAccess/i.test(p));
  console.log(own.length ? own.join('\n') : 'no app errors');
  await browser.close();
})();
