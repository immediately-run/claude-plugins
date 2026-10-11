// Open a Grove report on immediately.run in a private headless Chromium, wait for
// the report to render, report what the reader would see, and screenshot every
// section.
//
//   node check-render.cjs <present-url> <out-dir> [width] [height]
//
// <present-url>  the `immediately.run dev --json` url with /edit/ swapped for
//                /present/, or a published https://immediately.run/present/github/… url
// <out-dir>      where the screenshots go (created if missing)
// width/height   viewport, default 1400×900; use 390 844 for a phone
//
// Environment:
//   POLARITY=light|dark  switch polarity through the reader's theme menu
//   THEME=<label>        switch look through the same menu: Archive, Journal,
//                        Editorial, or the default's label
// Both pick what a reader would; the report's own `theme:` frontmatter is the
// default they start from.
//   PLAYWRIGHT_CORE      path to a playwright-core install (default: resolve
//                        `playwright-core` from here or the working directory)
//   CHROME               path to a Chrome/Chromium binary (default: Playwright's
//                        own browser, then the usual system locations)
//   HTTPS_PROXY          honoured when set (cloud sandboxes route through one)
//
// Exit code 0 = rendered with no report errors; 1 = it did not render or Grove
// reported a problem (the reasons are printed).
const fs = require('fs');
const path = require('path');

function loadPlaywright() {
  if (process.env.PLAYWRIGHT_CORE) return require(path.resolve(process.env.PLAYWRIGHT_CORE));
  try {
    return require(require.resolve('playwright-core', { paths: [__dirname, process.cwd()] }));
  } catch {
    console.error(
      'playwright-core not found. Install it into a scratch directory and point PLAYWRIGHT_CORE at it:\n' +
        '  npm install --prefix <scratch>/pw playwright-core\n' +
        '  PLAYWRIGHT_CORE=<scratch>/pw/node_modules/playwright-core node check-render.cjs …',
    );
    process.exit(2);
  }
}

function findBrowser(chromium) {
  if (process.env.CHROME) return process.env.CHROME;
  try {
    const p = chromium.executablePath();
    if (p && fs.existsSync(p)) return p;
  } catch {}
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  const found = candidates.find((c) => fs.existsSync(c));
  if (!found) {
    console.error('No Chrome or Chromium found. Set CHROME=<path to the browser binary>.');
    process.exit(2);
  }
  return found;
}

const { chromium } = loadPlaywright();

(async () => {
  const [url, outDir, w = '1400', h = '900'] = process.argv.slice(2);
  if (!url || !outDir) {
    console.error('usage: node check-render.cjs <present-url> <out-dir> [width] [height]');
    process.exit(2);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const browser = await chromium.launch({
    executablePath: findBrowser(chromium),
    headless: true,
    ...(proxy ? { proxy: { server: proxy, bypass: '127.0.0.1,localhost' } } : {}),
    // Chrome 142+ asks before a public page fetches http://127.0.0.1 (the dev
    // server); these switch that prompt off for this private instance only.
    args: ['--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessRespectPreflightResults,BlockInsecurePrivateNetworkRequests'],
  });
  const context = await browser.newContext({ viewport: { width: +w, height: +h } });
  const page = await context.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`[console] ${m.text().slice(0, 300)}`); });
  page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message.slice(0, 300)}`));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // The report renders inside the sandbox frame; wait for its title.
  let frame = null;
  for (let i = 0; i < 90 && !frame; i++) {
    await page.waitForTimeout(1000);
    for (const f of page.frames()) {
      if (!f.url().includes('sandbox.')) continue;
      try { if (await f.evaluate(() => !!document.querySelector('main h1, article h1, h1'))) frame = f; } catch {}
    }
  }
  if (!frame) {
    await page.screenshot({ path: path.join(outDir, 'not-rendered.png') });
    console.log(`NOT RENDERED after 90 s — see ${path.join(outDir, 'not-rendered.png')}`);
    console.log(problems.join('\n'));
    await browser.close();
    process.exit(1);
  }
  await page.waitForTimeout(3000);

  // Switch look and polarity through the reader's own theme menu, the way a
  // reader would (the host ignores the browser's colour scheme).
  const { POLARITY, THEME } = process.env;
  if (POLARITY || THEME) {
    // DOM clicks, not pointer clicks: the menu's scrim sits over its own rows in a
    // headless viewport and would swallow a synthetic pointer event.
    const pick = async (selector, label) => {
      await frame.evaluate(() => document.querySelector('.grove-theme-control')?.click());
      await page.waitForTimeout(300);
      const hit = await frame.evaluate(({ selector, label }) => {
        const b = [...document.querySelectorAll(selector)].find((x) => x.innerText.trim().toLowerCase() === label.toLowerCase());
        b?.click();
        return !!b;
      }, { selector, label });
      if (!hit) console.log(`no "${label}" in the theme menu`);
      await page.waitForTimeout(300);
      await frame.evaluate(() => document.querySelector('.gtm__scrim')?.click());
      await page.waitForTimeout(600);
    };
    if (THEME) await pick('.gtm__row', THEME);
    if (POLARITY) await pick('.gtm__seg button', POLARITY);
    console.log('look:', await frame.evaluate(() => {
      const r = document.querySelector('.grove-root');
      return `${r?.getAttribute('data-grove-theme') || 'default'} / ${r?.getAttribute('data-theme')}`;
    }));
  }

  const seen = await frame.evaluate(() => {
    const text = document.body.innerText;
    const headings = [...document.querySelectorAll('h1, h2')].map((x) => `${x.tagName.toLowerCase()} ${x.textContent.replace(/^#/, '').trim()}`);
    const imgs = [...document.images];
    // Grove names a failed MDX compile, a missing import or a rejected stylesheet
    // on the page instead of throwing; catch its wording.
    const errorLines = text.split('\n').filter((l) => /could not|couldn't|failed to|error|not found|unexpected|missing asset/i.test(l)).slice(0, 10);
    return {
      title: document.querySelector('h1')?.textContent?.trim(),
      headings,
      imagesLoaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
      imagesTotal: imgs.length,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      sidebarEntries: [...document.querySelectorAll('nav a, aside a')].map((a) => a.textContent.trim()).filter(Boolean).slice(0, 20),
      errorLines,
    };
  });
  console.log(JSON.stringify(seen, null, 2));

  // One screenshot at the top, then one per h2 section.
  await page.screenshot({ path: path.join(outDir, '00-top.png') });
  const count = await frame.evaluate(() => document.querySelectorAll('h2').length);
  for (let i = 0; i < count; i++) {
    await frame.evaluate((n) => document.querySelectorAll('h2')[n].scrollIntoView({ block: 'start' }), i);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, `${String(i + 1).padStart(2, '0')}-section.png`) });
  }
  console.log(`screenshots: ${count + 1} in ${outDir}`);

  // Host noise that is not the report's: App Check / reCAPTCHA in headless,
  // anonymous 401/403s from host telemetry, the sandbox's storage-access refusal.
  const own = problems.filter((p) => !/appcheck|app-check|recaptcha|status of 40[13]|requestStorageAccess/i.test(p));
  console.log(own.length ? `ERRORS:\n${own.join('\n')}` : 'no report errors in the console');
  await browser.close();
  process.exit(own.length || seen.errorLines.length || seen.horizontalOverflow || seen.imagesLoaded < seen.imagesTotal ? 1 : 0);
})();
