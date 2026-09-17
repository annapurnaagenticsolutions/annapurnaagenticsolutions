// Fullscreen & Glassmorphic UI Playthrough Capture (1920x1080)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots-fullscreen');
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
  // Test at standard 1920x1080 Full HD
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.error('[Browser Error]', msg.text());
    }
  });

  console.log('Loading ONEIRIC Fullscreen Edition...');
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 1. Title screen
  let ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '01-title-fullscreen.png'), ss);
  console.log('✓ 01-title-fullscreen captured');

  // 2. Inception Philosophy & 4 Directives Mission Briefing
  await page.keyboard.press('Space');
  await page.waitForTimeout(600);
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '02-intro-briefing.png'), ss);
  console.log('✓ 02-intro-briefing captured');

  // 3. Enter 3D Architect's Gateway Antechamber
  await page.keyboard.press('Space');
  await page.waitForTimeout(1000);
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '03-gateway-antechamber.png'), ss);
  console.log('✓ 03-gateway-antechamber captured');

  // 4. Approach Door A & inspect Target Dossier
  console.log('Approaching Door A...');
  await page.evaluate(() => {
    const door = window.oneiricState?.hubDoors?.[0];
    if (door && window.oneiricState) {
      window.oneiricState.player.x = door.x;
      window.oneiricState.player.y = door.y + 30;
      window.oneiricState.activeHubDoor = door;
    }
  });
  await page.waitForTimeout(500);
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '04-door-dossier-inspect.png'), ss);
  console.log('✓ 04-door-dossier-inspect captured');

  // 5. Press [E] on Door A to descend into selected target's mind
  console.log('Pressing [E] to initiate descent...');
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(3800); // wait for descent impact to finish
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '05-layer1-gameplay.png'), ss);
  console.log('✓ 05-layer1-gameplay captured');

  // 6. Lucid Surge (Space)
  console.log('Testing Lucid Surge [Space]...');
  await page.keyboard.press('Space');
  await page.waitForTimeout(140);
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '06-lucid-surge.png'), ss);
  console.log('✓ 06-lucid-surge captured');

  // 7. Sonic Echo Lure (F)
  console.log('Testing Sonic Echo Lure [F]...');
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(400);
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '07-sonic-echo-lure.png'), ss);
  console.log('✓ 07-sonic-echo-lure captured');

  // 8. Totem Check (T)
  console.log('Checking Totem [T]...');
  await page.keyboard.press('KeyT');
  await page.waitForTimeout(600);
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '08-totem-check.png'), ss);
  console.log('✓ 08-totem-check captured');
  await page.waitForTimeout(1500);

  // 9. Memory Resonance trigger
  console.log('Triggering Memory Resonance...');
  await page.evaluate(() => {
    const mem = window.oneiricState?.layerStack?.[0]?.rooms?.[0]?.objects?.find(o => o.type === 'memory');
    if (mem && window.oneiricState) {
      window.oneiricState.player.x = mem.x;
      window.oneiricState.player.y = mem.y;
    }
  });
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(400);
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '09-memory-resonance.png'), ss);
  console.log('✓ 09-memory-resonance captured');

  // 10. Descend to Layer 2
  console.log('Descending to Layer 2...');
  await page.evaluate(() => {
    const anchor = window.oneiricState?.layerStack?.[0]?.rooms?.[0]?.objects?.find(o => o.type === 'descent-anchor');
    if (anchor && window.oneiricState) {
      window.oneiricState.player.x = anchor.x;
      window.oneiricState.player.y = anchor.y;
    }
  });
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(3800);
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '10-layer2.png'), ss);
  console.log('✓ 10-layer2 captured');

  // 11. Descend to Layer 3
  console.log('Descending to Layer 3...');
  await page.evaluate(() => {
    const anchor = window.oneiricState?.layerStack?.[1]?.rooms?.[0]?.objects?.find(o => o.type === 'descent-anchor');
    if (anchor && window.oneiricState) {
      window.oneiricState.player.x = anchor.x;
      window.oneiricState.player.y = anchor.y;
    }
  });
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(3800);
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '11-layer3.png'), ss);
  console.log('✓ 11-layer3 captured');

  // 12. Enter Limbo
  console.log('Triggering Limbo Void...');
  await page.evaluate(() => {
    if (window.__oneiric) {
      window.__oneiric.state.stability = 0;
    }
  });
  await page.waitForTimeout(600);
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '12-sub-limbo.png'), ss);
  console.log('✓ 12-sub-limbo captured');

  // 13. Navigate to Atelier
  console.log('Navigating to Atelier...');
  await page.goto(`${URL}?phase=atelier`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  ss = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, '13-atelier-blueprints.png'), ss);
  console.log('✓ 13-atelier-blueprints captured');

  await browser.close();
  if (serverProcess) serverProcess.kill();

  console.log('-------------------------------------------');
  console.log(`Finished! Errors encountered: ${errors.length}`);
  if (errors.length > 0) {
    console.error('Errors:', errors);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
