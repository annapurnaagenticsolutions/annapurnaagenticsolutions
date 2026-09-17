// Analyze all screenshots in a directory
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function analyze(browser, filepath) {
  const buf = fs.readFileSync(filepath);
  const base64 = buf.toString('base64');
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
    let blackPixels = 0;

    for (let i = 0; i < data.length; i += 40) {
      const r = data[i], g = data[i+1], b = data[i+2];
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      sampleCount++;
      if (brightness < 5) blackPixels++;
      const rq = Math.round(r / 8) * 8;
      const gq = Math.round(g / 8) * 8;
      const bq = Math.round(b / 8) * 8;
      const key = `${rq},${gq},${bq}`;
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }

    const avgBrightness = totalBrightness / sampleCount;
    const blackPct = (blackPixels / sampleCount * 100).toFixed(1);
    const uniqueColors = colorMap.size;
    const sorted = [...colorMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const dominant = sorted.map(([color, count]) => `${color}(${((count / sampleCount) * 100).toFixed(1)}%)`).join(', ');

    return { avgBrightness, uniqueColors, blackPct, dominant };
  }, dataUrl);

  await page.close();
  return result;
}

async function main() {
  const dir = process.argv[2] || 'screenshots-full';
  const dirPath = path.join(__dirname, dir);

  const browser = await chromium.launch({ headless: true });

  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.png')).sort();
  console.log(`Analyzing ${files.length} screenshots in ${dir}...\n`);

  for (const file of files) {
    const filepath = path.join(dirPath, file);
    const sizeKB = (fs.statSync(filepath).size / 1024).toFixed(1);
    const a = await analyze(browser, filepath);
    console.log(`${file} (${sizeKB} KB)`);
    console.log(`  Brightness: ${a.avgBrightness.toFixed(1)} | Colors: ${a.uniqueColors} | Black: ${a.blackPct}%`);
    console.log(`  Dominant: ${a.dominant}`);
    console.log();
  }

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
