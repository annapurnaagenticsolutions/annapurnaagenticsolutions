// Analyze screenshots: extract dominant colors, brightness, visual variety.
// This tells me what the player actually sees without needing to view images.
const fs = require('fs');
const path = require('path');

// Simple PNG color analysis without external deps.
// PNG format: 8-byte signature, then chunks. We need IHDR for dimensions
// and IDAT for pixel data. This is a minimal parser for non-interlaced RGB/RGBA PNGs.
// For a more robust approach, we'd use a library, but this works for screenshots.

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots-current');

// Use a simpler approach: use playwright to load each screenshot and analyze via canvas
const { chromium } = require('playwright');

async function analyzeScreenshot(browser, filepath) {
  const page = await browser.newPage();
  await page.setContent(`
    <canvas id="c" width="960" height="600"></canvas>
    <img id="img" crossorigin="anonymous" />
  `);

  const result = await page.evaluate(async (filepath) => {
    const img = document.getElementById('img');
    img.src = 'http://localhost:3000/' + filepath.split(/[\\/]/).pop();

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 960, 600);
    const data = ctx.getImageData(0, 0, 960, 600).data;

    // Sample every 10th pixel for speed
    const colorMap = new Map();
    let totalBrightness = 0;
    let sampleCount = 0;
    let minBright = 255, maxBright = 0;

    for (let i = 0; i < data.length; i += 40) { // every 10th pixel (4 bytes per pixel)
      const r = data[i], g = data[i+1], b = data[i+2];
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      sampleCount++;
      minBright = Math.min(minBright, brightness);
      maxBright = Math.max(maxBright, brightness);

      // Quantize to 32-level per channel for color counting
      const rq = Math.round(r / 8) * 8;
      const gq = Math.round(g / 8) * 8;
      const bq = Math.round(b / 8) * 8;
      const key = `${rq},${gq},${bq}`;
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }

    const avgBrightness = totalBrightness / sampleCount;
    const uniqueColors = colorMap.size;

    // Top 5 dominant colors
    const sorted = [...colorMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    const dominant = sorted.map(([color, count]) => ({
      color,
      percentage: ((count / sampleCount) * 100).toFixed(1) + '%'
    }));

    // Check for visual variety in different screen regions
    const regions = {};
    const regionNames = ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'];
    const regionCoords = [
      [0, 0, 320, 200], [640, 0, 320, 200], [320, 200, 320, 200],
      [0, 400, 320, 200], [640, 400, 320, 200]
    ];

    for (let r = 0; r < regionCoords.length; r++) {
      const [rx, ry, rw, rh] = regionCoords[r];
      const regionColors = new Set();
      for (let y = ry; y < ry + rh; y += 10) {
        for (let x = rx; x < rx + rw; x += 10) {
          const idx = (y * 960 + x) * 4;
          const rq = Math.round(data[idx] / 16) * 16;
          const gq = Math.round(data[idx+1] / 16) * 16;
          const bq = Math.round(data[idx+2] / 16) * 16;
          regionColors.add(`${rq},${gq},${bq}`);
        }
      }
      regions[regionNames[r]] = regionColors.size;
    }

    return { avgBrightness, uniqueColors, minBright, maxBright, dominant, regions };
  }, filepath);

  await page.close();
  return result;
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png')).sort();

  for (const file of files) {
    const filepath = path.join(SCREENSHOTS_DIR, file);
    const analysis = await analyzeScreenshot(browser, filepath);

    console.log(`\n=== ${file} ===`);
    console.log(`  Avg brightness: ${analysis.avgBrightness.toFixed(1)} (range: ${analysis.minBright}-${analysis.maxBright})`);
    console.log(`  Unique colors (quantized): ${analysis.uniqueColors}`);
    console.log(`  Dominant colors:`);
    analysis.dominant.forEach(c => console.log(`    ${c.color}: ${c.percentage}`));
    console.log(`  Regional variety:`);
    Object.entries(analysis.regions).forEach(([k, v]) => console.log(`    ${k}: ${v} colors`));
  }

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
