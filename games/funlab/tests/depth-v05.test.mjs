import test from 'node:test';
import assert from 'node:assert/strict';
import {jugaadSimulation,adventureLoot,adventureItemEffect,arenaChoices,arenaEnvironment} from '../src/core/play-systems.js';
import {awardProgress,hasUnlock,achievementCount} from '../src/core/progression.js';

test('mechanic achievement awards once and unlocks capability',()=>{const s={progression:{achievements:{},unlocks:[]}};const a=awardProgress(s,'tactical-upset');assert.equal(a.changed,true);assert.equal(hasUnlock(s,'storm-ring'),true);assert.equal(achievementCount(s),1);assert.equal(awardProgress(s,'tactical-upset').changed,false);});
test('jugaad target simulation rewards scenario-specific items',()=>{const good=jugaadSimulation(2,['banana','mirror','empty lunchbox'],'distract');const weak=jugaadSimulation(2,['scarf'],'build');assert.ok(good.progress>weak.progress);assert.ok(good.steps.length>=4);assert.ok(good.progress<=100);});
test('adventure loot and item effects are deterministic',()=>{assert.equal(adventureLoot('station',1,'seed'),adventureLoot('station',1,'seed'));const x=adventureItemEffect('Ticket stub',2,1);assert.equal(x.bonus,true);assert.ok(x.text.length>0);});
test('storm arena is gated by unlock',()=>{assert.equal(arenaChoices([]).some(x=>x.id==='storm'),false);assert.equal(arenaChoices(['storm-ring']).some(x=>x.id==='storm'),true);assert.ok(arenaEnvironment('s','A','B',[]).id!=='storm');});
