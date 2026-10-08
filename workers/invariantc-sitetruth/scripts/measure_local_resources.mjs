#!/usr/bin/env node
/** Local-only resource proxy: compiled WASM through the HTTP handler in Node, never a deployed Worker. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {dirname,join} from 'node:path';
import {cpus} from 'node:os';
import {performance} from 'node:perf_hooks';
import {createHandler} from '../worker/src/handler.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const outputDir=join(root,'target');
const outputPath=join(outputDir,'local-resource-measurement.json');
const wasmPath=join(root,'worker','pkg','invariantc_bg.wasm');
const bindingsPath=join(root,'worker','pkg','invariantc_bg.js');
const repetitions=Number.parseInt(process.env.INVARIANTC_BENCH_REPETITIONS||'50',10);
if(!Number.isInteger(repetitions)||repetitions<1||repetitions>1000) throw new Error('INVARIANTC_BENCH_REPETITIONS must be an integer from 1 to 1000');

let bindings;
try { bindings=await import(pathToFileURL(bindingsPath).href); }
catch(error) { throw new Error('Compiled Worker WASM is missing; run npm run build:wasm first.',{cause:error}); }
const wasmBytes=await readFile(wasmPath);
const module=await WebAssembly.compile(wasmBytes);
const instance=new WebAssembly.Instance(module,{'./invariantc_bg.js':bindings});
bindings.__wbg_set_wasm(instance.exports);
const testKey=`stp_${'a'.repeat(22)}_${'b'.repeat(43)}`;
const testTenant={tenantId:'local-benchmark',requestsPerMinute:1000,requestsPerDay:100000,maxConcurrent:100};
const handler=createHandler(bindings.check_json,{
  authenticate:async request=>request.headers.get('authorization')===`Bearer ${testKey}`?testTenant:null,
  reserve:async()=>({allowed:true,minuteRemaining:999,dayRemaining:99999,minuteResetAtMs:Date.now()+60000}),
  release:async()=>({released:true}),
});
const manifest=JSON.parse(await readFile(join(root,'corpus','manifest.json'),'utf8'));
const fixtures=[];
for(const entry of manifest.cases) {
  const fixture=JSON.parse(await readFile(join(root,'corpus',entry.file),'utf8'));
  const body=JSON.stringify({contract:fixture.contract,observations:fixture.observations});
  fixtures.push({entry,body,requestBytes:Buffer.byteLength(body)});
}
if(fixtures.length===0) throw new Error('Corpus manifest contains no cases');

const key=testKey;
const makeRequest=body=>new Request('https://invariantc.test/v1/check',{
  method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},body,
});
const invoke=async fixture=>{
  const response=await handler(makeRequest(fixture.body),{DB:{},TENANT_QUOTA:{}});
  if(response.status!==200) throw new Error(`Handler returned HTTP ${response.status} for ${fixture.entry.id}`);
  const payload=await response.json();
  if(payload.report?.outcome!==fixture.entry.expected_outcome) throw new Error(`Unexpected outcome for ${fixture.entry.id}`);
};
const memory=()=>process.memoryUsage();
const memSnapshot=()=>{
  const m=memory();
  return {rss_bytes:m.rss,heap_used_bytes:m.heapUsed,external_bytes:m.external,array_buffers_bytes:m.arrayBuffers};
};
const percentile=(sorted,p)=>sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)];

const before=memSnapshot();
for(const fixture of fixtures) for(let i=0;i<5;i++) await invoke(fixture);
globalThis.gc?.();
const afterWarmup=memSnapshot();
const peak={...afterWarmup};
const latencies=[];
const cpuBefore=process.cpuUsage();
const started=performance.now();
let requests=0;
for(let round=0;round<repetitions;round++) {
  for(const fixture of fixtures) {
    const t0=performance.now();
    await invoke(fixture);
    latencies.push(performance.now()-t0);
    requests++;
  }
  if(round%5===0) {
    const current=memSnapshot();
    for(const key of Object.keys(peak)) peak[key]=Math.max(peak[key],current[key]);
  }
}
const elapsedMs=performance.now()-started;
const cpu=process.cpuUsage(cpuBefore);
const finalMemory=memSnapshot();
globalThis.gc?.();
const afterGc=memSnapshot();
latencies.sort((a,b)=>a-b);
const requestSizes=fixtures.map(f=>f.requestBytes).sort((a,b)=>a-b);
const families={};
for(const {entry} of fixtures) families[entry.family]=(families[entry.family]||0)+1;
const result={
  label:'local synthetic measurement; not a Cloudflare Workerd or production benchmark',
  runtime:{node:process.version,platform:process.platform,arch:process.arch,cpu:cpus()[0]?.model||'unknown'},
  evaluator:{case_count:fixtures.length,case_families:families,wasm_bytes:wasmBytes.byteLength,wasm_linear_memory_bytes:instance.exports.memory.buffer.byteLength},
  workload:{warmup_rounds_per_case:5,measured_rounds_per_case:repetitions,requests,request_bytes:{min:requestSizes[0],median:percentile(requestSizes,.5),max:requestSizes.at(-1)}},
  timing:{elapsed_ms:Number(elapsedMs.toFixed(3)),requests_per_second:Number((requests/(elapsedMs/1000)).toFixed(2)),latency_ms:{p50:Number(percentile(latencies,.5).toFixed(4)),p95:Number(percentile(latencies,.95).toFixed(4)),max:Number(latencies.at(-1).toFixed(4))},process_cpu_ms:{user:Number((cpu.user/1000).toFixed(3)),system:Number((cpu.system/1000).toFixed(3)),total:Number(((cpu.user+cpu.system)/1000).toFixed(3)),per_request:Number(((cpu.user+cpu.system)/1000/requests).toFixed(5))}},
  process_memory_bytes:{before,after_warmup:afterWarmup,peak_sampled_during_measured_run:peak,after_measured_run:finalMemory,after_optional_gc:afterGc,rss_delta_after_gc:afterGc.rss_bytes-before.rss_bytes},
  explicit_gc_available:typeof globalThis.gc==='function',
  notes:['Handler requests and compiled WASM execute in-process under Node; no socket or Workerd isolate is measured.','RSS/heap deltas are process-level observations and are not per-request memory attribution.','Bundle size must be collected separately from Wrangler dry-run output.'],
};
await mkdir(outputDir,{recursive:true});
await writeFile(outputPath,`${JSON.stringify(result,null,2)}\n`,'utf8');
console.log(JSON.stringify({output:outputPath,...result},null,2));
