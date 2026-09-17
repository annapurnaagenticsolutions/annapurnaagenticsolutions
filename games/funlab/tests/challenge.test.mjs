import test from 'node:test';
import assert from 'node:assert/strict';
const {encodeChallenge,decodeChallenge}=await import('../src/core/share.js');
const {createRoom,addEntry,summarizeRoom}=await import('../src/core/rooms.js');
test('challenge token round trips unicode',()=>{const x={gameId:'ai-court',dispute:'Chai ₹10 vs coffee ☕'};const y=decodeChallenge(encodeChallenge(x));assert.equal(y.gameId,x.gameId);assert.equal(y.dispute,x.dispute);assert.equal(y.v,1);});
test('room remains bounded and can add response',()=>{let r=createRoom({gameId:'who-wins',prompt:'Cat vs Robot',hostAnswer:'Cat'});r=addEntry(r,'Friend','Robot');assert.equal(r.entries.length,2);assert.match(summarizeRoom(r),/2 responses/);});
