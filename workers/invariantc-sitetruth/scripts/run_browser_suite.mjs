#!/usr/bin/env node
/** End-to-end native Rust + real Playwright verification of six synthetic localhost scenarios.
 * Never scans external URLs, does not retain raw captures or run paid APIs.
 */
import {spawn,spawnSync} from 'node:child_process';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {collectWithPlaywright} from '../collector/cli.mjs';
import {validatePair} from '../collector/pairing.mjs';
const base=new URL('../',import.meta.url);
const cases=[
 ['apples-bad','fail','examples/apples.contract.json'],
 ['apples-good','pass','examples/apples.contract.json'],
 ['apples-click','fail','examples/apples.contract.json'],
 ['apples-unknown','unknown','examples/apples.contract.json'],
 ['cart-bad','fail','examples/browser_capture/cart.contract.json'],
 ['cart-good','pass','examples/browser_capture/cart.contract.json']
];
const binary=resolve(process.env.INVARIANTC_BINARY||`target/debug/invariantc${process.platform==='win32'?'.exe':''}`);
const server=spawn(process.execPath,['scenarios/demo/server.mjs'],{stdio:['ignore','ignore','pipe']});
let serverFailure=null,serverStderr='',lastProbeError='';
server.stderr.setEncoding('utf8');
server.stderr.on('data',chunk=>{if(serverStderr.length<4096)serverStderr+=chunk.slice(0,4096-serverStderr.length);});
server.once('error',error=>{serverFailure=error;});
server.once('exit',(code,signal)=>{if(!serverFailure)serverFailure=new Error(`demo server exited before readiness (code=${code}, signal=${signal})`);});
const tmp=await mkdtemp(join(tmpdir(),'invariantc-e2e-'));
try {
  let running=false;
  for(let i=0;i<25;i++) {
    if(serverFailure)break;
    try {const r=await fetch('http://127.0.0.1:4173/apples-bad.html');if(r.status===200){running=true;break;}}catch(error){lastProbeError=error.cause?.code?`${error.cause.code}: ${error.cause.message}`:error.message;}
    await new Promise(r=>setTimeout(r,100));
  }
  if(!running) throw new Error(`Local demo server did not start: ${serverFailure?.message||serverStderr.trim()||lastProbeError||'readiness probe timed out'}`);
  for(const [name,want,contractPath] of cases) {
    const contract=JSON.parse(await readFile(contractPath,'utf8'));
    const spec=JSON.parse(await readFile(`examples/browser_capture/${name}.capture.json`,'utf8'));
    const preflight=validatePair(contract,spec);
    if(!preflight.ok) throw new Error(`${name} invalid capture contract: ${preflight.errors.join('; ')}`);
    const capture=await collectWithPlaywright(spec);
    const contractFile=join(tmp,'contract.json'),obsFile=join(tmp,'obs.json');
    await writeFile(contractFile,JSON.stringify(contract));await writeFile(obsFile,JSON.stringify(capture.observations));
    const run=spawnSync(binary,['check',contractFile,'--observations',obsFile,'--offline'],{encoding:'utf8'});
    if(![0,2,3].includes(run.status)) throw new Error(`${name}: native evaluator error: ${run.stderr}`);
    const report=JSON.parse(run.stdout);
    if(report.outcome!==want) throw new Error(`${name}: expected ${want}, got ${report.outcome}`);
    console.log(`${name}: ${report.outcome.toUpperCase()} ✓`);
  }
  console.log(`PASS: ${cases.length} localhost browser → Rust evaluation cases`);
} finally {server.kill();await rm(tmp,{recursive:true,force:true});}
