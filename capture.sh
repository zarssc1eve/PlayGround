#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

: "${CAPTURE_URL:?Set CAPTURE_URL}" 
: "${CAPTURE_DIR:?Set CAPTURE_DIR}"

/usr/bin/time -p mkdir -p "$CAPTURE_DIR"

RUNTIME="$HOME/.local/share/omgithub-playwright"
CONFIG="$RUNTIME/linux.json"

if [[ ! -f "$CONFIG" ]] || [[ ! -d "$RUNTIME/node_modules/playwright" ]]; then
  echo "Playwright runtime is unavailable." >&2
  exit 75
fi

/usr/bin/time -p node <<'NODE'
const { chromium } = require(process.env.HOME + '/.local/share/omgithub-playwright/node_modules/playwright');
const fs = require('fs');

(async () => {
  const runtime = process.env.HOME + '/.local/share/omgithub-playwright';
  const url = process.env.CAPTURE_URL;
  const output = process.env.CAPTURE_DIR;
  const config = JSON.parse(fs.readFileSync(runtime + '/linux.json', 'utf8'));
  if (process.platform === 'linux') process.env.DISPLAY ||= ':' + fs.readFileSync(runtime + '/display', 'utf8').trim();

  let browser;
  const transient = error => { error.exitCode = 75; throw error; };

  try {
    browser = await chromium.launch({...config.browser.launchOptions, timeout: 30000}).catch(transient);

    for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 }).catch(transient);
      const page = await context.newPage();
      page.setDefaultTimeout(30000);

      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));

      let response;
      try {
        response = await page.goto(url, { waitUntil: 'load', timeout: 45000 });
      } catch (error) {
        transient(error);
      }

      if (!response) throw Object.assign(new Error('No navigation response'), { exitCode: 75 });
      if (!response.ok()) {
        const status = response.status();
        throw Object.assign(new Error(`HTTP ${status} loading preview`), {
          exitCode: [408, 429, 500, 502, 503, 504].includes(status) ? 75 : 1
        });
      }

      await page.locator('body').waitFor({ state: 'visible', timeout: 30000 });
      await page.waitForFunction(() => document.fonts ? document.fonts.status === 'loaded' : true, null, { timeout: 30000 });
      await page.waitForTimeout(1500);

      // Capture the actual title screen, or the active game if it has started.
      await page.screenshot({ path: `${output}/final-${name}.png`, timeout: 30000 });

      if (!fs.existsSync(`${output}/final-${name}.png`)) {
        throw new Error(`Screenshot was not created: final-${name}.png`);
      }
      if (pageErrors.length) {
        console.error(`Page errors (${name}): ${pageErrors.join('; ')}`);
      }

      await context.close();
    }
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = error.exitCode || 1;
  } finally {
    await browser?.close().catch(error => { console.error(error); process.exitCode ||= 75; });
  }
})();
NODE
