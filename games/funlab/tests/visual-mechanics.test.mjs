import test from 'node:test';
import assert from 'node:assert/strict';
import {meta as odd} from '../src/games/odd-signal.js';
import {meta as orbit} from '../src/games/orbit-panic.js';
import {meta as garden} from '../src/games/micro-garden.js';

test('v0.3 adds three distinct mechanic identities',()=>{
  assert.equal(new Set([odd.verb,orbit.verb,garden.verb]).size,3);
  assert.match(odd.presentation,/2D Canvas/);
  assert.match(orbit.presentation,/Three\.js/);
  assert.match(garden.presentation,/Cellular/);
});

test('visual game ids are unique',()=>{
  assert.equal(new Set([odd.id,orbit.id,garden.id]).size,3);
});
