import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {dirname,join} from 'node:path';
import test from 'node:test';
import {createHandler} from '../worker/src/handler.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const wasmPath=join(root,'worker','pkg','invariantc_bg.wasm');
const bindingsPath=join(root,'worker','pkg','invariantc_bg.js');
let bindings;
try {
  bindings=await import(pathToFileURL(bindingsPath).href);
} catch (error) {
  throw new Error('Compiled Worker WASM is missing; run npm run build:wasm before npm run test:wasm-worker.',{cause:error});
}
const wasmBytes=await readFile(wasmPath);
const module=await WebAssembly.compile(wasmBytes);
const instance=new WebAssembly.Instance(module,{'./invariantc_bg.js':bindings});
bindings.__wbg_set_wasm(instance.exports);
const testKey=`stp_${'a'.repeat(22)}_${'b'.repeat(43)}`;
const testTenant={tenantId:'wasm-integration',requestsPerMinute:10,requestsPerDay:100,maxConcurrent:2};
const handler=createHandler(bindings.check_json,{
  authenticate:async request=>request.headers.get('authorization')===`Bearer ${testKey}`?testTenant:null,
  reserve:async()=>({allowed:true,minuteRemaining:9,dayRemaining:99,minuteResetAtMs:Date.now()+60000}),
  release:async()=>({released:true}),
});
const manifest=JSON.parse(await readFile(join(root,'corpus','manifest.json'),'utf8'));
const fixtureByOutcome=new Map();
for(const entry of manifest.cases) if(!fixtureByOutcome.has(entry.expected_outcome)) fixtureByOutcome.set(entry.expected_outcome,entry);
const env={DB:{},TENANT_QUOTA:{}};

async function invoke(entry,key=testKey) {
  const fixture=JSON.parse(await readFile(join(root,'corpus',entry.file),'utf8'));
  const request=new Request('https://invariantc.test/v1/check',{
    method:'POST',
    headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},
    body:JSON.stringify({contract:fixture.contract,observations:fixture.observations}),
  });
  const response=await handler(request,env);
  return {response,body:await response.json(),fixture};
}

for(const outcome of ['pass','fail','unknown']) {
  const entry=fixtureByOutcome.get(outcome);
  if(!entry) throw new Error(`Corpus is missing a ${outcome} fixture`);
  test(`compiled WASM Worker handler returns a real ${outcome} report`,async()=>{
    const {response,body,fixture}=await invoke(entry);
    assert.equal(response.status,200);
    assert.equal(body.ok,true);
    assert.equal(body.report.outcome,outcome);
    assert.match(body.report.contract_sha256,/^[a-f0-9]{64}$/);
    assert.match(body.report.observation_sha256,/^[a-f0-9]{64}$/);
    assert.ok(Array.isArray(body.report.results));
    const serialized=JSON.stringify(body);
    assert.equal(Object.hasOwn(body,'observations'),false,'response must not expose the raw observations object');
    assert.equal(serialized.includes(JSON.stringify(fixture.observations)),false,'response must not disclose the raw observations payload');
  });
}

test('compiled WASM Worker handler keeps the authentication gate',async()=>{
  const entry=fixtureByOutcome.get('pass');
  const fixture=JSON.parse(await readFile(join(root,'corpus',entry.file),'utf8'));
  const request=new Request('https://invariantc.test/v1/check',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({contract:fixture.contract,observations:fixture.observations}),
  });
  const result=await handler(request,env);
  assert.equal(result.status,401);
  assert.deepEqual(await result.json(),{error:'Unauthorized'});
});
