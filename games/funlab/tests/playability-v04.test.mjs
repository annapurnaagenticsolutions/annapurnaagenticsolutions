import test from 'node:test';
import assert from 'node:assert/strict';
import {visualIdentity,battlePlan,buildJugaadPlan,jugaadSynergy,hotspotLayout,orbitConfig} from '../src/core/play-systems.js';
import {meta as battle} from '../src/games/who-wins.js';
import {meta as jugaad} from '../src/games/jugaad.js';
import {meta as fusion} from '../src/games/fusion-lab.js';
import {meta as adventure} from '../src/games/what-next.js';
import {meta as orbit} from '../src/games/orbit-panic.js';

test('v0.4 five upgraded games declare non-text-first presentations',()=>{
  for(const m of [battle,jugaad,fusion,adventure,orbit])assert.ok(m.presentation);
  assert.equal(new Set([battle.verb,jugaad.verb,fusion.verb,adventure.verb,orbit.verb]).size,5);
});

test('visual identity is deterministic',()=>assert.deepEqual(visualIdentity('Elephant'),visualIdentity('Elephant')));

test('battle plan is deterministic and bounded',()=>{
  const a=battlePlan({a:'Elephant',b:'Tractor',aProbability:57,backed:'a',tactic:'trick',seed:'2026-08-26'});
  const b=battlePlan({a:'Elephant',b:'Tractor',aProbability:57,backed:'a',tactic:'trick',seed:'2026-08-26'});
  assert.deepEqual(a,b);assert.ok(a.adjusted>=8&&a.adjusted<=92);assert.ok(a.events.length>=10);
  for(const e of a.events){assert.ok(e.aHp>=0&&e.aHp<=100);assert.ok(e.bHp>=0&&e.bHp<=100);}
});

test('jugaad plan derives from direct-manipulation selections',()=>{
  const p=buildJugaadPlan(['rope','chair'],'leverage','Move a box');
  assert.match(p,/rope and chair/);assert.match(p,/leverage/);assert.ok(jugaadSynergy(['rope','chair'],'leverage')>=35);
});

test('hotspots avoid the player start and are deterministic',()=>{
  const a=hotspotLayout('scene',2),b=hotspotLayout('scene',2);assert.deepEqual(a,b);assert.equal(a.length,3);assert.ok(a.every(x=>!(x.x===3&&x.y===4)));
});

test('orbit config includes hazards and collectible energy shards',()=>{
  const x=orbitConfig('orbit','balanced');assert.ok(x.hazards.length>=7);assert.ok(x.shards.length>=4);assert.ok(x.shards.every(s=>s.active));
});
