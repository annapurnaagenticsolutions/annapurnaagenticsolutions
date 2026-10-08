#!/usr/bin/env node
import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {extractObservations, validateSpec, validateTarget} from './observation.mjs';

function parseArgs(args) {
  const parsed={};
  for(let i=0;i<args.length;i++) {
    const k=args[i];
    if (k==='--attest-ownership') { parsed.attestOwnership=true; continue; }
    if (!['--spec','--url','--observations','--evidence','--allow-origin'].includes(k)) throw new Error(`Unsupported argument ${k}`);
    if (!args[i+1] || args[i+1].startsWith('--')) throw new Error(`Missing value for ${k}`);
    parsed[k.slice(2).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=args[++i];
  }
  if (!parsed.spec || !parsed.observations) throw new Error('Required: --spec CAPTURE.json --observations OUTPUT.json');
  return parsed;
}

export async function collectWithPlaywright(spec, opts={}) {
  const {url,local}=validateTarget(opts.url || spec.url,{...opts,externalCaptureEnabled:false});
  if (!local) throw new Error('External website capture is disabled until the reviewed browser egress policy is available.');
  if (process.getuid?.() === 0) throw new Error('Refusing to launch Chromium as root because its sandbox would not isolate page content.');
  let chromium=opts.chromium;
  if (!chromium) {
    try {
      const mod=process.env.PLAYWRIGHT_MODULE_PATH || 'playwright';
      ({chromium}=await import(mod));
    } catch { throw new Error('Playwright unavailable. Install playwright locally (npm install and npx playwright install chromium), or supply PLAYWRIGHT_MODULE_PATH.'); }
  }
  const launchOptions={headless:true,chromiumSandbox:true};
  if(process.env.CHROMIUM_EXECUTABLE_PATH) launchOptions.executablePath=process.env.CHROMIUM_EXECUTABLE_PATH;
  const browser=await chromium.launch(launchOptions);
  try {
    const context=await browser.newContext({serviceWorkers:'block', acceptDownloads:false, ignoreHTTPSErrors:false});
    try {
      const page=await context.newPage();
      page.setDefaultTimeout(10000);
      // A context-level route also covers pages opened as popups. Keep every
      // request inside the one approved local origin; page-level routing alone
      // does not provide a context-wide boundary.
      await context.route('**/*',route=> {
        const target=route.request().url();
        let other;
        try { other=new URL(target); } catch { return route.abort(); }
        if (other.origin !== url.origin || !['http:','https:'].includes(other.protocol)) return route.abort();
        return route.continue();
      });
      await page.goto(url.toString(),{waitUntil:'domcontentloaded',timeout:15000});
      if (new URL(page.url()).origin !== url.origin) throw new Error('Cross-origin redirect is not permitted');
      for (const action of spec.actions || []) {
        if (action.kind !== 'click') throw new Error('Unsupported interaction');
        await page.locator(action.selector).click({timeout:5000});
        if (new URL(page.url()).origin !== url.origin) throw new Error('Interaction navigated outside allowed origin');
      }
      return await extractObservations(page,spec);
    } finally { await context.close(); }
  } finally { await browser.close(); }
}

async function main() {
  const args=parseArgs(process.argv.slice(2));
  const spec=validateSpec(JSON.parse(await readFile(resolve(args.spec),'utf8')));
  const captured=await collectWithPlaywright(spec,{url:args.url,allowOrigin:args.allowOrigin,attestOwnership:args.attestOwnership});
  await writeFile(resolve(args.observations),JSON.stringify(captured.observations,null,2)+'\n',{flag:'wx',mode:0o600});
  if (args.evidence) await writeFile(resolve(args.evidence),JSON.stringify(captured.evidence,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log('Capture complete. Observations saved locally; no screenshots, cookies or full DOM snapshots collected.');
}
if (process.argv[1] && import.meta.url===new URL(`file://${resolve(process.argv[1])}`).href) main().catch(e=>{console.error(e.message); process.exitCode=1;});
