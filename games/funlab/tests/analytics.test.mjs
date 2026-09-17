import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.localStorage={getItem(){return null},setItem(){},removeItem(){}};
const {funnelSummary}=await import('../src/core/analytics.js');
test('funnel summary calculates rates',()=>{const e=[{name:'game_open',detail:{gameId:'x'},at:'2026-08-22T10:00:00Z'},{name:'play_complete',detail:{gameId:'x'},at:'2026-08-22T10:01:00Z'},{name:'share',detail:{gameId:'x'},at:'2026-08-22T10:02:00Z'},{name:'replay',detail:{gameId:'x'},at:'2026-08-22T10:03:00Z'}];const s=funnelSummary(e);assert.equal(s.completionRate,100);assert.equal(s.shareRate,100);assert.equal(s.replayRate,100);assert.equal(s.activeDays,1);});
