import test from 'node:test';
import assert from 'node:assert/strict';
import {hashString,seeded01,pick,clamp,localDayKey} from '../src/core/random.js';

test('hash is deterministic',()=>assert.equal(hashString('abc'),hashString('abc')));
test('seeded random is deterministic and bounded',()=>{const x=seeded01('hello');assert.equal(x,seeded01('hello'));assert.ok(x>=0&&x<=1);});
test('pick is stable',()=>assert.equal(pick(['a','b','c'],'x'),pick(['a','b','c'],'x')));
test('clamp respects bounds',()=>{assert.equal(clamp(10,0,5),5);assert.equal(clamp(-2,0,5),0);});
test('localDayKey formatting',()=>assert.equal(localDayKey(new Date(2026,7,22,10,0,0)),'2026-08-22'));
