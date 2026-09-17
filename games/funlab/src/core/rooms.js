import {encodeChallenge,decodeChallenge,roomUrl} from './share.js';
import {hashString} from './random.js';
export function createRoom({gameId,prompt,hostAnswer,hostName='Host'}){
  const base=`${gameId}|${prompt}|${hostAnswer}|${Date.now()}`;
  return {v:1,id:hashString(base).toString(36),gameId,prompt,createdAt:new Date().toISOString(),entries:[{name:hostName.slice(0,24),answer:String(hostAnswer).slice(0,220)}]};
}
export function addEntry(room,name,answer){return {...room,entries:[...(room.entries||[]),{name:String(name||'Friend').slice(0,24),answer:String(answer).slice(0,220)}].slice(-8)};}
export function makeRoomUrl(room){return roomUrl(room);}
export function summarizeRoom(room){return `${room.entries?.length||0} response${room.entries?.length===1?'':'s'} · ${room.gameId}`;}
