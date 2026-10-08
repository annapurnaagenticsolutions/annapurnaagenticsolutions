/** Offline: run all labelled corpus fixtures in native Rust and node-target WASM; compare reports. */
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url);
let wasm;
try {wasm=require('../wasm-node/invariantc.js')} catch {throw new Error('Build nodejs WASM first: wasm-pack build --release --target nodejs --out-dir wasm-node --out-name invariantc --features wasm');}
const canonicalize=value=>Array.isArray(value)?value.map(canonicalize):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonicalize(value[key])])):value;
const binary=resolve(process.env.INVARIANTC_BINARY || `target/release/invariantc${process.platform==='win32'?'.exe':''}`);
const manifest=JSON.parse(await readFile('corpus/manifest.json','utf8'));
const tmp=await mkdtemp(join(tmpdir(),'invariantc-parity-'));
try {
 let checked=0;
 for (const entry of manifest.cases) {
   const fixture=JSON.parse(await readFile(join('corpus',entry.file),'utf8'));
   const contract=JSON.stringify(fixture.contract), obs=JSON.stringify(fixture.observations);
   const viaWasm=JSON.parse(wasm.check_json(contract,obs));
   if (!viaWasm.ok) throw new Error(`WASM contract failed: ${entry.id}`);
   if (viaWasm.report.outcome!==entry.expected_outcome) throw new Error(`WASM label mismatch: ${entry.id}`);
   const contractFile=join(tmp,'contract.json'),obsFile=join(tmp,'observations.json');
   await writeFile(contractFile,contract);await writeFile(obsFile,obs);
   const result=spawnSync(binary,['check',contractFile,'--observations',obsFile],{encoding:'utf8',maxBuffer:1024*1024});
   if(![0,2,3].includes(result.status)) throw new Error(`Native CLI failed for ${entry.id}: ${result.stderr}`);
   const viaNative=JSON.parse(result.stdout);
   if(JSON.stringify(canonicalize(viaNative))!==JSON.stringify(canonicalize(viaWasm.report))) throw new Error(`Native/WASM report mismatch: ${entry.id}`);
   checked++;
 }
 console.log(`PASS: ${checked} native-vs-WASM parity cases`);
} finally {await rm(tmp,{recursive:true,force:true});}
