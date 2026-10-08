import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateTarget,extractObservations,validateSpec,decodePointer} from '../collector/observation.mjs';
import {collectWithPlaywright} from '../collector/cli.mjs';

const fakePage=(values)=>({locator:(selector)=>{
  const entries=values[selector]||[];
  return {count:async()=>entries.length,textContent:async()=>entries[0]?.text??null,getAttribute:async(name)=>entries[0]?.attrs?.[name]??null};
}});
const spec={version:1,url:'http://127.0.0.1:4173',sources:[
  {id:'scene',extract:[{pointer:'/objects',kind:'attribute_json',selector:'#scene',attribute:'data-objects'}]},
  {id:'ui',extract:[{pointer:'/label_count',kind:'number_text',selector:'#label'}]}
]};
const attrs={ '#scene':[{attrs:{'data-objects':'[1,2,3,4]'}}], '#label':[{text:'5'}]};

test('collects two independent observations for a mismatch',async()=>{
  const r=await extractObservations(fakePage(attrs),spec);
  assert.deepEqual(r.observations,{scene:{objects:[1,2,3,4]},ui:{label_count:5}});
  assert.equal(r.evidence.length,2);
  assert.equal(JSON.stringify(r.evidence).includes('[1,2,3,4]'),false);
});
test('missing field remains missing rather than fabricated PASS',async()=>{
  const r=await extractObservations(fakePage({'#scene':attrs['#scene']}),spec);
  assert.deepEqual(r.observations.ui,{});
  assert.equal(r.evidence[1].status,'unavailable');
});
test('reject ambiguous repeated selectors',async()=>{
  const r=await extractObservations(fakePage({...attrs,'#label':[{text:'5'},{text:'4'}]}),spec);
  assert.deepEqual(r.observations.ui,{});
});
test('count requires known parent and zero children is observed zero',async()=>{
  const s={version:1,url:spec.url,sources:[{id:'scene',extract:[{pointer:'/count',kind:'count_elements',selector:'.fruit',within:'#container'}]}]};
  assert.deepEqual((await extractObservations(fakePage({'#container':[{text:''}]}),s)).observations,{scene:{count:0}});
  assert.deepEqual((await extractObservations(fakePage({}),s)).observations,{scene:{}});
});
test('strict number extraction declines localized or currency strings',async()=>{
  const s={version:1,url:spec.url,sources:[{id:'ui',extract:[{pointer:'/price',kind:'number_text',selector:'#p'}]}]};
  for (const bad of ['1,200','₹1200','1e5','9007199254740993']) {
    assert.deepEqual((await extractObservations(fakePage({'#p':[{text:bad}]}),s)).observations,{ui:{}},bad);
  }
});
test('unsafe prototype pollution path is rejected',()=>{
  for (const bad of ['/__proto__/pollute','/constructor/key','/x~2y','/']) assert.throws(()=>decodePointer(bad));
});
test('duplicate pointers and duplicate sources rejected',()=>{
  assert.throws(()=>validateSpec({...spec,sources:[...spec.sources,...spec.sources]}));
  assert.throws(()=>validateSpec({...spec,sources:[{...spec.sources[0],extract:[spec.sources[0].extract[0],spec.sources[0].extract[0]]}]}));
});
test('external URLs require exact allow-origin and explicit local operator acknowledgment',()=>{
  assert.throws(()=>validateTarget('https://example.org'));
  assert.throws(()=>validateTarget('https://example.org',{allowOrigin:'https://example.org'}));
  assert.doesNotThrow(()=>validateTarget('https://example.org',{allowOrigin:'https://example.org',attestOwnership:true}));
  assert.throws(()=>validateTarget('https://example.org',{allowOrigin:'https://elsewhere.org',attestOwnership:true}));
});
test('blocks credential-bearing and non-http targets',()=>{
  assert.throws(()=>validateTarget('file:///etc/passwd'));
  assert.throws(()=>validateTarget('http://user:pass@127.0.0.1'));
  assert.doesNotThrow(()=>validateTarget('http://127.0.0.1:4173'));
});

test('local Chromium capture enables its sandbox and applies origin filtering at context scope',async()=>{
  let launchOptions,routePattern,routeHandler;
  const page={
    setDefaultTimeout(){},
    goto:async()=>{},
    url:()=>spec.url,
    locator:()=>({count:async()=>1,textContent:async()=> 'observed'}),
  };
  const context={
    route:async(pattern,handler)=>{routePattern=pattern;routeHandler=handler;},
    newPage:async()=>page,
    close:async()=>{},
  };
  const browser={newContext:async()=>context,close:async()=>{}};
  const chromium={launch:async(options)=>{launchOptions=options;return browser;}};
  const localSpec={version:1,url:spec.url,sources:[{id:'ui',extract:[{pointer:'/value',kind:'text',selector:'#value'}]}]};
  const capture=await collectWithPlaywright(localSpec,{chromium});
  assert.equal(launchOptions.chromiumSandbox,true);
  assert.equal(Object.hasOwn(launchOptions,'args'),false);
  assert.equal(routePattern,'**/*');
  assert.equal(typeof routeHandler,'function');
  assert.deepEqual(capture.observations,{ui:{value:'observed'}});

  let continued=0,aborted=0;
  await routeHandler({request:()=>({url:()=>`${spec.url}/asset.js`}),continue:async()=>{continued+=1;},abort:async()=>{aborted+=1;}});
  await routeHandler({request:()=>({url:()=> 'https://third-party.example/resource.js'}),continue:async()=>{continued+=1;},abort:async()=>{aborted+=1;}});
  assert.equal(continued,1);
  assert.equal(aborted,1);
});

test('external capture fails closed even with a local ownership acknowledgment',async()=>{
  let launched=false;
  const externalSpec={...spec,url:'https://example.org/'};
  await assert.rejects(()=>collectWithPlaywright(externalSpec,{}),/External website capture is disabled/);
  await assert.rejects(()=>collectWithPlaywright(externalSpec,{
    allowOrigin:'https://example.org',attestOwnership:true,
    chromium:{launch:async()=>{launched=true;throw new Error('must not launch');}},
  }),/External website capture is disabled/);
  assert.equal(launched,false);
});

test('refuses to launch the browser as root',async()=>{
  const originalDescriptor=Object.getOwnPropertyDescriptor(process,'getuid');
  Object.defineProperty(process,'getuid',{configurable:true,value:()=>0});
  let launched=false;
  try {
    await assert.rejects(()=>collectWithPlaywright(spec,{
      chromium:{launch:async()=>{launched=true;throw new Error('must not launch');}},
    }),/Refusing to launch Chromium as root/);
    assert.equal(launched,false);
  } finally {
    if (originalDescriptor) Object.defineProperty(process,'getuid',originalDescriptor);
    else delete process.getuid;
  }
});
test('cap field limits',async()=>{
  const s={version:1,url:spec.url,sources:[{id:'ui',extract:[{pointer:'/value',kind:'text',selector:'#text'}]}]};
  const r=await extractObservations(fakePage({'#text':[{text:'a'.repeat(2500)}]}),s);
  assert.deepEqual(r.observations,{ui:{}});
});

test('conflicting parent-child extraction pointers are rejected',()=>{
  const entry={...spec.sources[0],extract:[{...spec.sources[0].extract[0],pointer:'/objects'},{...spec.sources[0].extract[0],pointer:'/objects/count'}]};
  assert.throws(()=>validateSpec({...spec,sources:[entry]}),/Conflicting extraction hierarchy/);
});
