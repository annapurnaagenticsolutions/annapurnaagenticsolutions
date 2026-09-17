import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.window={};
const {runIntelligence,endpointMode,endpointLabel}=await import('../src/core/ai-adapter.js');
test('endpoint mode is truthful without configuration',()=>{assert.equal(endpointMode(),'local');assert.equal(endpointLabel(),'Local engine');});
test('versus is deterministic and bounded',async()=>{const a=await runIntelligence('versus',{a:'water',b:'fire'}),b=await runIntelligence('versus',{a:'water',b:'fire'});assert.deepEqual(a,b);assert.ok(['water','fire'].includes(a.winner));assert.ok(a.probability>=50&&a.probability<=100);assert.equal(a._provider,'deterministic-local');});
test('persuasion increases but stays bounded',async()=>{const r=await runIntelligence('persuade',{claim:'Monday should go',argument:'Because people need more recovery time and a four day week can improve focus.',score:18});assert.ok(r.score>18&&r.score<=100);});
test('jugaad scores are bounded',async()=>{const r=await runIntelligence('jugaad',{solution:'Use the rope to tie the chairs together, make a lever, then push the box carefully through the doorway.'});for(const k of ['creativity','practicality','survival'])assert.ok(r[k]>=0&&r[k]<=100);});
test('combine is deterministic and returns a result',async()=>{const a=await runIntelligence('combine',{a:'Water',b:'Fire'}),b=await runIntelligence('combine',{a:'Water',b:'Fire'});assert.deepEqual(a,b);assert.equal(a.result,'Steam');});
test('court produces two arguments and verdict',async()=>{const r=await runIntelligence('court',{dispute:'Tea is better than coffee.'});assert.ok(r.sideA&&r.sideB&&r.verdict);assert.ok(r.confidence>=0&&r.confidence<=100);});
test('connected output normalizer bounds hostile values',async()=>{
  const {normalizeOutput}=await import('../src/core/ai-adapter.js');
  const r=normalizeOutput('jugaad',{creativity:999,practicality:-4,survival:'88',verdict:'x'.repeat(500)},{});
  assert.equal(r.creativity,100);assert.equal(r.practicality,0);assert.equal(r.survival,88);assert.equal(r.verdict.length,280);
});
