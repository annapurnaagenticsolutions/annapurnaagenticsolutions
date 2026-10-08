import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validatePair} from '../collector/pairing.mjs';
const load=async p=>JSON.parse(await readFile(new URL(p,import.meta.url),'utf8'));
test('apple contract has complete capture coverage',async()=>{
  const [c,s]=await Promise.all([load('../examples/apples.contract.json'),load('../examples/browser_capture/apples-bad.capture.json')]);
  assert.deepEqual(validatePair(c,s),{ok:true,errors:[]});
});
test('cart contract has complete capture coverage',async()=>{
  const [c,s]=await Promise.all([load('../examples/browser_capture/cart.contract.json'),load('../examples/browser_capture/cart-bad.capture.json')]);
  assert.deepEqual(validatePair(c,s),{ok:true,errors:[]});
});
test('missing declared extraction fails preflight',async()=>{
  const [c,s]=await Promise.all([load('../examples/apples.contract.json'),load('../examples/browser_capture/apples-bad.capture.json')]);
  s.sources[1].extract=[];
  assert.throws(()=>validatePair(c,s));
});
test('wrong capture type against contract is detected',async()=>{
  const [c,s]=await Promise.all([load('../examples/apples.contract.json'),load('../examples/browser_capture/apples-bad.capture.json')]);
  c.sources.find(x=>x.id==='ui').fields={'/label_count':'array'};
  const r=validatePair(c,s);
  assert.equal(r.ok,false);
  assert.match(r.errors[0],/emits number/);
});
