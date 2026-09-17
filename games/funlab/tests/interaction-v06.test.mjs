import test from 'node:test';
import assert from 'node:assert/strict';
import {battleActionAvailability,resolveBattleAction,tickBattleCooldowns,jugaadSpatialBonus,jugaadSimulation,adventureSceneSpec,adventureHotspots,fusionLineageLayout} from '../src/core/play-systems.js';
import {meta as battle} from '../src/games/who-wins.js';
import {meta as jugaad} from '../src/games/jugaad.js';
import {meta as adventure} from '../src/games/what-next.js';
import {meta as fusion} from '../src/games/fusion-lab.js';

test('v0.6 upgraded games expose deeper non-text presentations',()=>{
  for(const m of [battle,jugaad,adventure,fusion])assert.ok(m.presentation.length>20);
  assert.match(battle.presentation,/cooldown/i);assert.match(jugaad.presentation,/spatial/i);assert.match(adventure.presentation,/moving/i);assert.match(fusion.presentation,/lineage/i);
});

test('battle cooldown actions are contextual and change damage',()=>{
  const ev={attacker:'b',defender:'a',damage:20};
  const available=battleActionAvailability(ev,'a',{guard:0,power:0,trick:0});
  assert.equal(available.guard,true);assert.equal(available.power,false);assert.equal(available.trick,true);
  const guarded=resolveBattleAction(ev,'guard','a',{guard:0,power:0,trick:0});
  assert.ok(guarded.damage<20);assert.ok(guarded.cooldowns.guard>0);
  const ticked=tickBattleCooldowns(guarded.cooldowns);assert.ok(ticked.guard<guarded.cooldowns.guard);
});

test('jugaad spatial arrangement changes target progress',()=>{
  const aligned=[{item:'umbrella',x:1,y:1},{item:'shoelace',x:2,y:1}];
  const scattered=[{item:'umbrella',x:0,y:0},{item:'shoelace',x:5,y:2}];
  const a=jugaadSpatialBonus(aligned,'build',0),b=jugaadSpatialBonus(scattered,'build',0);
  assert.ok(a.bonus>b.bonus);
  const simA=jugaadSimulation(0,aligned.map(x=>x.item),'build',aligned),simB=jugaadSimulation(0,scattered.map(x=>x.item),'build',scattered);
  assert.ok(simA.progress>simB.progress);
});

test('adventure scene specs are themed and deterministic',()=>{
  const a=adventureSceneSpec('station',1,'seed'),b=adventureSceneSpec('station',1,'seed');assert.deepEqual(a,b);assert.equal(a.terrain,'platform');assert.ok(a.objects.some(x=>x.kind==='obstacle'));assert.ok(a.actor.path.length>=4);
  const hs=adventureHotspots('kitchen','seed',2);assert.equal(hs.length,3);assert.ok(hs.some(x=>/Fridge|Fuse|Window/.test(x.label)));
});

test('fusion lineage creates branching nodes and parent links',()=>{
  const l=fusionLineageLayout([{a:'Water',b:'Fire',result:'Steam'},{a:'Steam',b:'Earth',result:'Mud Cloud'}]);
  assert.ok(l.nodes.some(n=>n.name==='Steam'&&n.depth>=1));assert.ok(l.nodes.some(n=>n.name==='Mud Cloud'&&n.depth>=2));assert.equal(l.links.filter(x=>x.to==='Steam').length,2);assert.ok(l.width>=620);
});
