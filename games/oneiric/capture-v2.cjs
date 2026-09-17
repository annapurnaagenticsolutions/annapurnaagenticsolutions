// Capture and analyze using Playwright screenshots (compositor-level capture).
// This is more reliable than reading from the WebGL canvas.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots-current');
const URL = 'http://localhost:3000';

async function analyzeScreenshot(browser, screenshotBuffer) {
  const base64 = screenshotBuffer.toString('base64');
  const dataUrl = `data:image/png;base64,${base64}`;

  const page = await browser.newPage();
  await page.setContent(`<canvas id="c" width="960" height="600"></canvas><img id="img" crossorigin="anonymous"/>`);

  const result = await page.evaluate(async (url) => {
    const img = document.getElementById('img');
    img.src = url;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });

    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 960, 600);
    const data = ctx.getImageData(0, 0, 960, 600).data;

    const colorMap = new Map();
    let totalBrightness = 0;
    let sampleCount = 0;
    let minBright = 255, maxBright = 0;

    for (let i = 0; i < data.length; i += 40) {
      const r = data[i], g = data[i+1], b = data[i+2];
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      sampleCount++;
      minBright = Math.min(minBright, brightness);
      maxBright = Math.max(maxBright, brightness);
      const rq = Math.round(r / 8) * 8;
      const gq = Math.round(g / 8) * 8;
      const bq = Math.round(b / 8) * 8;
      const key = `${rq},${gq},${bq}`;
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }

    const avgBrightness = totalBrightness / sampleCount;
    const uniqueColors = colorMap.size;
    const sorted = [...colorMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const dominant = sorted.map(([color, count]) => ({
      color, percentage: ((count / sampleCount) * 100).toFixed(1) + '%'
    }));

    // Regional analysis
    const regions = {};
    const regionNames = ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'];
    const regionCoords = [[0,0,320,200],[640,0,320,200],[320,200,320,200],[0,400,320,200],[640,400,320,200]];
    for (let r = 0; r < regionCoords.length; r++) {
      const [rx, ry, rw, rh] = regionCoords[r];
      const regionColors = new Set();
      let regionBrightness = 0;
      let regionSamples = 0;
      for (let y = ry; y < ry + rh; y += 5) {
        for (let x = rx; x < rx + rw; x += 5) {
          const idx = (y * 960 + x) * 4;
          const rq = Math.round(data[idx] / 16) * 16;
          const gq = Math.round(data[idx+1] / 16) * 16;
          const bq = Math.round(data[idx+2] / 16) * 16;
          regionColors.add(`${rq},${gq},${bq}`);
          regionBrightness += (data[idx] + data[idx+1] + data[idx+2]) / 3;
          regionSamples++;
        }
      }
      regions[regionNames[r]] = { colors: regionColors.size, brightness: (regionBrightness / regionSamples).toFixed(1) };
    }

    return { avgBrightness, uniqueColors, minBright, maxBright, dominant, regions };
  }, dataUrl);

  await page.close();
  return result;
}

async function main() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  console.log('Loading game...');
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Title
  let ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '01-title.png'), ss);
  let a = await analyzeScreenshot(browser, ss);
  console.log(`\n=== TITLE ===`);
  console.log(`  Brightness: ${a.avgBrightness.toFixed(1)} | Colors: ${a.uniqueColors} | Range: ${a.minBright.toFixed(0)}-${a.maxBright.toFixed(0)}`);
  console.log(`  Dominant: ${a.dominant.map(c => `${c.color}(${c.percentage})`).join(', ')}`);
  console.log(`  Regions: ${Object.entries(a.regions).map(([k,v]) => `${k}=${v.colors}c/${v.brightness}b`).join(', ')}`);

  // How to play
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '02-howto.png'), ss);
  a = await analyzeScreenshot(browser, ss);
  console.log(`\n=== HOWTO ===`);
  console.log(`  Brightness: ${a.avgBrightness.toFixed(1)} | Colors: ${a.uniqueColors}`);

  // Start run
  await page.keyboard.press('Space');
  await page.waitForTimeout(3000);
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '03-layer1.png'), ss);
  a = await analyzeScreenshot(browser, ss);
  console.log(`\n=== LAYER 1 (Surface) ===`);
  console.log(`  Brightness: ${a.avgBrightness.toFixed(1)} | Colors: ${a.uniqueColors} | Range: ${a.minBright.toFixed(0)}-${a.maxBright.toFixed(0)}`);
  console.log(`  Dominant: ${a.dominant.map(c => `${c.color}(${c.percentage})`).join(', ')}`);
  console.log(`  Regions: ${Object.entries(a.regions).map(([k,v]) => `${k}=${v.colors}c/${v.brightness}b`).join(', ')}`);

  // Move around
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1000);
  await page.keyboard.up('KeyW');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyD');
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '04-layer1-moved.png'), ss);
  a = await analyzeScreenshot(browser, ss);
  console.log(`\n=== LAYER 1 (moved) ===`);
  console.log(`  Brightness: ${a.avgBrightness.toFixed(1)} | Colors: ${a.uniqueColors}`);

  // Layer 2
  await page.evaluate(() => window.__oneiric?.descendDeeper());
  await page.waitForTimeout(2000);
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '05-layer2.png'), ss);
  a = await analyzeScreenshot(browser, ss);
  console.log(`\n=== LAYER 2 (Current) ===`);
  console.log(`  Brightness: ${a.avgBrightness.toFixed(1)} | Colors: ${a.uniqueColors} | Range: ${a.minBright.toFixed(0)}-${a.maxBright.toFixed(0)}`);
  console.log(`  Dominant: ${a.dominant.map(c => `${c.color}(${c.percentage})`).join(', ')}`);
  console.log(`  Regions: ${Object.entries(a.regions).map(([k,v]) => `${k}=${v.colors}c/${v.brightness}b`).join(', ')}`);

  // Layer 3
  await page.evaluate(() => window.__oneiric?.descendDeeper());
  await page.waitForTimeout(2000);
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '06-layer3.png'), ss);
  a = await analyzeScreenshot(browser, ss);
  console.log(`\n=== LAYER 3 (Abyss) ===`);
  console.log(`  Brightness: ${a.avgBrightness.toFixed(1)} | Colors: ${a.uniqueColors} | Range: ${a.minBright.toFixed(0)}-${a.maxBright.toFixed(0)}`);
  console.log(`  Dominant: ${a.dominant.map(c => `${c.color}(${c.percentage})`).join(', ')}`);
  console.log(`  Regions: ${Object.entries(a.regions).map(([k,v]) => `${k}=${v.colors}c/${v.brightness}b`).join(', ')}`);

  // Kick sequence
  await page.evaluate(() => window.__oneiric?.forceWin());
  await page.waitForTimeout(500);
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '07-kick.png'), ss);
  a = await analyzeScreenshot(browser, ss);
  console.log(`\n=== KICK SEQUENCE ===`);
  console.log(`  Brightness: ${a.avgBrightness.toFixed(1)} | Colors: ${a.uniqueColors}`);
  console.log(`  Dominant: ${a.dominant.map(c => `${c.color}(${c.percentage})`).join(', ')}`);

  if (errors.length > 0) {
    console.log(`\n--- Console errors (${errors.length}) ---`);
    errors.forEach(e => console.log(`  ${e}`));
  } else {
    console.log('\nNo console errors.');
  }

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
