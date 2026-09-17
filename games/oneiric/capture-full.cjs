// Full Director's Cut playthrough capture
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots-directors-cut');
const URL = 'http://localhost:3000';

async function checkPort(port) {
  return new Promise(resolve => {
    const req = http.get(`http://localhost:${port}`, res => resolve(true));
    req.on('error', () => resolve(false));
    req.setTimeout(400, () => { req.destroy(); resolve(false); });
  });
}

async function main() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  let serverProcess = null;
  const isRunning = await checkPort(3000);
  if (!isRunning) {
    console.log('Starting dev server on port 3000...');
    serverProcess = spawn('npx', ['vite', '--port', '3000', '--strictPort'], {
      cwd: __dirname,
      shell: true,
      stdio: 'ignore'
    });
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      if (await checkPort(3000)) break;
    }
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.error('[Browser Error]', msg.text());
    }
  });

  console.log('Loading ONEIRIC Director\'s Cut...');
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 1. Title screen
  let ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '01-title.png'), ss);
  console.log('✓ 01-title captured');

  // 2. How to play
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '02-howto.png'), ss);
  console.log('✓ 02-howto captured');

  // 3. Start run & Descent
  await page.keyboard.press('Space');
  await page.waitForTimeout(3600); // wait for descent

  // 4. Layer 1 — Surreal Brutalist Void
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '03-layer1-surreal-void.png'), ss);
  console.log('✓ 03-layer1-surreal-void captured');

  // 5. Test Lucid Surge (Space)
  console.log('Testing Lucid Surge [Space]...');
  await page.keyboard.press('Space');
  await page.waitForTimeout(120);
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '04-lucid-surge.png'), ss);
  console.log('✓ 04-lucid-surge captured');

  // 6. Test Sonic Echo Lure (F)
  console.log('Testing Sonic Echo Lure [F]...');
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(400);
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '05-sonic-echo-lure.png'), ss);
  console.log('✓ 05-sonic-echo-lure captured');

  // 7. Check Totem (T)
  console.log('Checking Totem [T]...');
  await page.keyboard.press('KeyT');
  await page.waitForTimeout(600);
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '06-totem-check.png'), ss);
  console.log('✓ 06-totem-check captured');
  await page.waitForTimeout(2000);

  // 8. Test Memory Resonance
  console.log('Testing Memory Resonance...');
  await page.evaluate(() => {
    const o = window.__oneiric;
    const room = o.currentRoom;
    if (room && o.state) {
      let mem = room.objects.find(obj => obj.type === 'memory');
      if (!mem) {
        mem = {
          id: 999,
          type: 'memory',
          x: o.state.player.x + 10,
          y: o.state.player.y + 10,
          radius: 16,
          collected: false,
          memoryKind: 'heirloom',
        };
        room.objects.push(mem);
      }
      o.state.player.x = mem.x;
      o.state.player.y = mem.y;
    }
  });
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(500);
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '07-memory-resonance.png'), ss);
  console.log('✓ 07-memory-resonance captured');

  // 9. Descend to Layer 2
  console.log('Descending to Layer 2...');
  await page.evaluate(() => window.__oneiric?.descendDeeper());
  await page.waitForTimeout(3400);
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '08-layer2.png'), ss);
  console.log('✓ 08-layer2 captured');

  // 10. Descend to Layer 3
  console.log('Descending to Layer 3...');
  await page.evaluate(() => window.__oneiric?.descendDeeper());
  await page.waitForTimeout(3400);
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '09-layer3.png'), ss);
  console.log('✓ 09-layer3 captured');

  // 11. Kick Sequence
  console.log('Triggering Kick sequence...');
  await page.evaluate(() => window.__oneiric?.forceWin());
  await page.waitForTimeout(800);
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '10-kick-sequence.png'), ss);
  console.log('✓ 10-kick-sequence captured');

  // 12. Atelier Shop
  console.log('Opening Atelier...');
  await page.evaluate(() => window.__oneiric?.returnToAtelier());
  await page.waitForTimeout(600);
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '11-atelier-blueprints.png'), ss);
  console.log('✓ 11-atelier-blueprints captured');

  console.log(`\nVerification Complete! Errors: ${errors.length}`);
  await browser.close();
  if (serverProcess) serverProcess.kill();
  process.exit(errors.length === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
