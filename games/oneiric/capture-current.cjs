// Capture screenshots of the current game state at each phase.
// Uses Playwright to load the game and interact with it via the debug API.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots-current');
const URL = 'http://localhost:3000';

async function main() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });

  // Collect console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  console.log('Loading game...');
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Title screen
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-title.png') });
  console.log('Captured: title');

  // How to play
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-howto.png') });
  console.log('Captured: howto');

  // Start run
  await page.keyboard.press('Space');
  await page.waitForTimeout(3000); // wait for descent
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-layer1.png') });
  console.log('Captured: layer1');

  // Move around a bit to see the world
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('KeyW');
    await page.waitForTimeout(50);
  }
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-layer1-moved.png') });
  console.log('Captured: layer1 moved');

  // Use debug API to descend to layer 2
  await page.evaluate(() => {
    const api = window.__oneiric;
    if (api) api.descendDeeper();
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-layer2.png') });
  console.log('Captured: layer2');

  // Descend to layer 3
  await page.evaluate(() => {
    const api = window.__oneiric;
    if (api) api.descendDeeper();
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-layer3.png') });
  console.log('Captured: layer3');

  // Force win (triggers kick sequence)
  await page.evaluate(() => {
    const api = window.__oneiric;
    if (api) api.forceWin();
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-kick.png') });
  console.log('Captured: kick sequence');

  // Force limbo
  await page.evaluate(() => {
    const api = window.__oneiric;
    if (api) {
      api.state.stability = 0;
    }
  });
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    // Manually enter limbo since stability was set to 0
    const api = window.__oneiric;
    if (api) {
      // The update loop should have triggered limbo, but let's check
    }
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-limbo.png') });
  console.log('Captured: limbo');

  // Print file sizes for comparison
  console.log('\n--- Screenshot sizes ---');
  const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
  for (const f of files) {
    const stat = fs.statSync(path.join(SCREENSHOTS_DIR, f));
    console.log(`${f}: ${(stat.size / 1024).toFixed(1)} KB`);
  }

  if (errors.length > 0) {
    console.log('\n--- Console errors ---');
    errors.forEach(e => console.log(`  ${e}`));
  } else {
    console.log('\nNo console errors.');
  }

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
