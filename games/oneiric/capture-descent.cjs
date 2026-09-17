// Capture the descent animation at multiple progress points
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots-descent');
const URL = 'http://localhost:3000';

async function main() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });

  console.log('Loading game...');
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Start a run
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
  await page.keyboard.press('Space');
  await page.waitForTimeout(3500); // wait for initial descent (3s)

  // Now in Layer 1. Trigger a descent to Layer 2.
  await page.evaluate(() => window.__oneiric?.descendDeeper());

  // Capture at different progress points
  const progressPoints = [
    { name: '00-start', delay: 0 },
    { name: '10-pullback', delay: 300 },
    { name: '20-pullback', delay: 600 },
    { name: '30-dissolve', delay: 900 },
    { name: '40-dissolve', delay: 1200 },
    { name: '50-dissolve-peak', delay: 1500 },
    { name: '60-fall', delay: 1800 },
    { name: '70-fall', delay: 2100 },
    { name: '75-impact', delay: 2250 },
    { name: '80-impact', delay: 2400 },
    { name: '90-settle', delay: 2700 },
    { name: '95-settle', delay: 2850 },
    { name: '99-done', delay: 2990 },
  ];

  for (const point of progressPoints) {
    await page.waitForTimeout(point.delay === 0 ? 50 : point.delay - (progressPoints[progressPoints.indexOf(point) - 1]?.delay || 0));
    const ss = await page.screenshot({ type: 'png' });
    const filename = `descent-${point.name}.png`;
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, filename), ss);
    const sizeKB = (ss.length / 1024).toFixed(1);
    console.log(`  ${filename}: ${sizeKB} KB`);
  }

  // Check final state
  const stateInfo = await page.evaluate(() => {
    const api = window.__oneiric;
    if (!api) return null;
    return {
      phase: api.state.phase,
      layer: api.state.currentLayer,
      stability: api.state.stability.toFixed(1),
    };
  });
  console.log(`\nFinal state: ${JSON.stringify(stateInfo)}`);

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
