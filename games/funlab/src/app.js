import {loadState,recordPlay,recordShare,updateSetting,resetState,saveRoom,saveState} from './core/storage.js';
import {ACHIEVEMENTS,awardProgress,hasUnlock,achievementCount} from './core/progression.js';
import {decodeChallenge,encodeChallenge,shareResult} from './core/share.js';
import {localDayKey,seeded01,pick} from './core/random.js';
import {ping} from './core/audio.js';
import {track,events,funnelSummary,clearEvents} from './core/analytics.js';
import {createRoom,addEntry,makeRoomUrl,summarizeRoom} from './core/rooms.js';
import * as whoWins from './games/who-wins.js';
import * as convince from './games/convince.js';
import * as jugaad from './games/jugaad.js';
import * as whatNext from './games/what-next.js';
import * as humanAi from './games/human-ai.js';
import * as doNotPress from './games/do-not-press.js';
import * as fusionLab from './games/fusion-lab.js';
import * as aiCourt from './games/ai-court.js';
import * as oddSignal from './games/odd-signal.js';
import * as orbitPanic from './games/orbit-panic.js';
import * as microGarden from './games/micro-garden.js';

const games=[whoWins,convince,jugaad,whatNext,humanAi,doNotPress,fusionLab,aiCourt,oddSignal,orbitPanic,microGarden];
let state=loadState();const app=document.querySelector('#app');let installPrompt=null,activeCleanup=null;
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function parseRoute(){
  const raw=location.hash.replace(/^#\/?/,'');if(!raw)return {id:null,challenge:null};
  const [path,q='']=raw.split('?'),params=new URLSearchParams(q);
  return {id:decodeURIComponent(path),challenge:params.get('c')?decodeChallenge(params.get('c')):null};
}
function sharedInbound(){
  const p=new URLSearchParams(location.search);const text=[p.get('title'),p.get('text'),p.get('url')].filter(Boolean).join('\n').trim();return text?text.slice(0,800):null;
}
function shell(content){
  app.innerHTML=`<header class="topbar"><button class="brand" id="home" aria-label="FunLab home"><span>◉</span> FunLab <em>v0.6</em></button><nav><span class="tiny-stat">${state.stats.plays||0} plays</span><button class="icon-btn" id="insightsBtn" aria-label="Local insights">↗</button><button class="icon-btn" id="settingsBtn" aria-label="Settings">⚙</button></nav></header>
  <main id="main">${content}</main>
  <dialog id="settings"><form method="dialog"><div class="dialog-head"><div><span class="eyebrow">Preferences</span><h2>Keep the chaos comfortable</h2></div><button class="icon-btn" value="cancel" aria-label="Close">×</button></div>
  <label class="toggle"><span>Sound <small>Off by default</small></span><input id="sound" type="checkbox" ${state.settings.sound?'checked':''}></label>
  <label class="toggle"><span>Reduced motion</span><input id="motion" type="checkbox" ${state.settings.reducedMotion?'checked':''}></label>
  <label class="toggle"><span>Higher contrast</span><input id="contrast" type="checkbox" ${state.settings.highContrast?'checked':''}></label>
  <label class="quality-row"><span>Visual quality <small>Used by richer Canvas/WebGL activities</small></span><select id="quality"><option value="low" ${state.settings.quality==='low'?'selected':''}>Low</option><option value="balanced" ${state.settings.quality==='balanced'?'selected':''}>Balanced</option><option value="high" ${state.settings.quality==='high'?'selected':''}>High</option></select></label>
  <button class="danger secondary" type="button" id="reset">Reset local history</button></form></dialog>`;
  document.querySelector('#home').onclick=()=>{location.hash='';};
  document.querySelector('#insightsBtn').onclick=()=>{location.hash='#/insights';};
  const d=document.querySelector('#settings');document.querySelector('#settingsBtn').onclick=()=>d.showModal();
  const bind=(id,key)=>document.querySelector(id).onchange=e=>{updateSetting(state,key,e.target.checked);applySettings();track('setting_changed',{key,value:e.target.checked});};
  bind('#sound','sound');bind('#motion','reducedMotion');bind('#contrast','highContrast');document.querySelector('#quality').onchange=e=>{updateSetting(state,'quality',e.target.value);applySettings();track('setting_changed',{key:'quality',value:e.target.value});};
  document.querySelector('#reset').onclick=()=>{if(confirm('Clear FunLab local plays, rooms, history and settings?')){state=resetState();clearEvents();d.close();render();}};applySettings();
}
function applySettings(){document.documentElement.classList.toggle('reduce-motion',!!state.settings.reducedMotion);document.documentElement.classList.toggle('high-contrast',!!state.settings.highContrast);window.dispatchEvent(new CustomEvent('funlab:settings',{detail:{...state.settings}}));}

function home(){
  const day=localDayKey(),daily=pick(games,day+'daily'),inbound=sharedInbound();
  shell(`<section class="hero"><div><span class="eyebrow">Tiny games · zero signup</span><h1>Quick chaos.<br>Now with deeper play.</h1><p>Eleven browser-first activities. v0.5 deepens the strongest loops with earned unlocks, target simulation, persistent adventure inventory and richer arena/reactor presentation.</p>
  <div class="hero-actions"><button class="primary" id="random">Surprise me</button><button class="secondary" id="install" hidden>Install app</button></div></div>
  <aside class="daily"><span>Mechanic achievements</span><strong>${achievementCount(state)} / ${Object.keys(ACHIEVEMENTS).length}</strong><p>Unlocks come from meaningful play, not generic points.</p><span class="daily-sub">Active-day streak</span><strong>${state.daily?.currentStreak||0} day${state.daily?.currentStreak===1?'':'s'}</strong><p>Best ${state.daily?.bestStreak||0}. Skipping a day has no penalty; this only records consecutive active days.</p></aside></section>
  ${inbound?`<section class="inbound-card"><div><span class="eyebrow">Shared into FunLab</span><p>${esc(inbound)}</p></div><button class="primary" id="courtInbound">Take to AI Court</button></section>`:''}
  <section class="daily-pick"><div><span class="eyebrow">Today's shared starting point</span><h2>${daily.meta.emoji} ${daily.meta.title}</h2><p>${daily.meta.tagline}</p></div><button class="secondary" id="dailyPlay">Play today's pick</button></section>
  <section class="game-grid" aria-label="Games">${games.map((g,i)=>`<button class="game-tile t${i}" data-game="${g.meta.id}"><span class="tile-emoji">${g.meta.emoji}</span><span class="tile-copy"><b>${g.meta.title}</b><small>${g.meta.tagline}</small></span><span class="tile-arrow">↗</span></button>`).join('')}</section>
  <section class="principles"><span>v0.5 depth upgrade</span><p>Mechanic-earned unlocks · scenario-specific Jugaad simulation · carryable adventure inventory · richer arena worlds · optional earned Three.js reactor · backend frozen.</p></section>`);
  document.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>{track('game_open',{gameId:b.dataset.game,source:'home'});location.hash=`#/${b.dataset.game}`;});
  document.querySelector('#random').onclick=()=>{const g=games[Math.floor(Math.random()*games.length)];track('game_open',{gameId:g.meta.id,source:'surprise'});location.hash=`#/${g.meta.id}`;};
  document.querySelector('#dailyPlay').onclick=()=>{track('game_open',{gameId:daily.meta.id,source:'daily'});location.hash=`#/${daily.meta.id}`;};
  const ib=document.querySelector('#install');if(installPrompt){ib.hidden=false;ib.onclick=async()=>{installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;ib.hidden=true;};}
  const ci=document.querySelector('#courtInbound');if(ci)ci.onclick=()=>{history.replaceState(null,'',location.pathname+location.hash);location.hash=`#/ai-court?c=${encodeURIComponent(encodeChallenge({gameId:'ai-court',dispute:inbound}))}`;};
}

function gameView(g,challenge){
  shell(`<section class="game-layout"><button class="back" id="back">← All games</button><div id="gameRoot"></div></section>`);document.querySelector('#back').onclick=()=>{location.hash='';};
  const dayKey=localDayKey();const ctx={dayKey,dailySeed:seeded01(dayKey+g.meta.id),quality:state.settings.quality||'balanced',
    record(summary){recordPlay(state,g.meta.id,summary,dayKey);track('play_complete',{gameId:g.meta.id,summary});document.querySelector('.tiny-stat').textContent=`${state.stats.plays} plays`;},
    replay(){track('replay',{gameId:g.meta.id});},
    shared(status){if(status==='shared'||status==='copied'){recordShare(state);track('share',{gameId:g.meta.id,status});toast(status==='copied'?'Challenge copied':'Shared');}},
    ping(type){ping(state.settings.sound,type);},
    award(id){const r=awardProgress(state,id);if(r.changed){saveState(state);track('achievement',{gameId:g.meta.id,id,unlock:r.unlock});toast(`Achievement: ${r.achievement.title}${r.unlock?' · unlock earned':''}`);}return r;},
    hasUnlock(id){return hasUnlock(state,id);},
    unlocks(){return [...(state.progression?.unlocks||[])];},
    openRoom({prompt,answer}){const room=createRoom({gameId:g.meta.id,prompt,hostAnswer:answer,hostName:'You'});saveRoom(state,room);const u=new URL(makeRoomUrl(room));location.hash=u.hash;}
  };activeCleanup=g.mount(document.querySelector('#gameRoot'),ctx,challenge)||null;
}

function roomView(room){
  if(!room||room.kind!=='room'||!room.id){shell(`<section class="game-layout"><button class="back" id="back">← Home</button><article class="play-card"><h1>Room link is invalid</h1><p>This friend-room state could not be decoded.</p></article></section>`);document.querySelector('#back').onclick=()=>location.hash='';return;}
  saveRoom(state,room);shell(`<section class="game-layout"><button class="back" id="back">← All games</button><section class="game-head"><div><span class="eyebrow">Link-based friend room</span><h1>👥 Compare answers</h1><p>No account and no shared database. The room state travels inside the link you pass onward.</p></div><span class="engine-pill">${esc(summarizeRoom(room))}</span></section>
  <article class="play-card"><span class="result-kicker">Prompt</span><h2>${esc(room.prompt)}</h2><div class="room-entries">${(room.entries||[]).map((e,i)=>`<div><b>${esc(e.name||`Player ${i+1}`)}</b><p>${esc(e.answer)}</p></div>`).join('')}</div>
  <form id="roomForm"><label>Your name<input name="name" maxlength="24" placeholder="Friend"></label><label>Your answer<textarea name="answer" maxlength="220" rows="3" required placeholder="Your response…"></textarea></label><button class="primary">Add my response</button></form><div id="roomActions"></div></article></section>`);
  document.querySelector('#back').onclick=()=>location.hash='';const form=document.querySelector('#roomForm');
  form.onsubmit=async e=>{e.preventDefault();const updated=addEntry(room,form.elements.name.value||'Friend',form.elements.answer.value.trim());saveRoom(state,updated);track('room_response',{gameId:room.gameId,roomId:room.id});const url=makeRoomUrl(updated);document.querySelector('#roomActions').innerHTML=`<div class="result-actions"><button class="primary" id="pass">Pass updated room onward</button></div><p class="room-note">This URL now contains ${updated.entries.length} responses. It is intentionally bounded to keep the static prototype honest.</p>`;document.querySelector('#pass').onclick=async()=>{const st=await shareResult({title:'FunLab Friend Room',text:`Add your answer: ${room.prompt}`,url});if(st==='shared'||st==='copied')toast(st==='copied'?'Room link copied':'Room shared');};};
}

function insightsView(){
  const s=funnelSummary(events()),rows=Object.entries(s.byGame).sort((a,b)=>b[1].opens-a[1].opens);
  shell(`<section class="game-layout"><button class="back" id="back">← Home</button><section class="game-head"><div><span class="eyebrow">Local-only product signals</span><h1>📈 Fun funnel</h1><p>These events stay in this browser unless you attach your own analytics hook.</p></div><span class="engine-pill">${s.activeDays} active day${s.activeDays===1?'':'s'}</span></section>
  <div class="metric-grid"><div><strong>${s.opens}</strong><span>Game opens</span></div><div><strong>${s.completes}</strong><span>Completions</span></div><div><strong>${s.completionRate}%</strong><span>Open → complete</span></div><div><strong>${s.shareRate}%</strong><span>Complete → share</span></div><div><strong>${s.replayRate}%</strong><span>Complete → replay</span></div><div><strong>${achievementCount(state)}</strong><span>Mechanic achievements</span></div></div>
  <article class="play-card achievement-panel"><h2>Achievements & unlocks</h2><div class="achievement-list">${Object.entries(ACHIEVEMENTS).map(([id,a])=>`<div class="achievement-row ${state.progression?.achievements?.[id]?'earned':''}"><span>${state.progression?.achievements?.[id]?'✓':'○'}</span><div><b>${esc(a.title)}</b><small>${esc(a.description)}</small></div><em>${a.unlock?esc(a.unlock):''}</em></div>`).join('')}</div></article>
  <article class="play-card insights-table"><h2>By activity</h2>${rows.length?`<table><thead><tr><th>Game</th><th>Open</th><th>Complete</th><th>Share</th><th>Replay</th></tr></thead><tbody>${rows.map(([id,x])=>`<tr><td>${esc(games.find(g=>g.meta.id===id)?.meta.title||id)}</td><td>${x.opens}</td><td>${x.completes}</td><td>${x.shares}</td><td>${x.replays}</td></tr>`).join('')}</tbody></table>`:'<p>No events yet. Play a game first.</p>'}</article></section>`);document.querySelector('#back').onclick=()=>location.hash='';
}
function toast(text){let t=document.querySelector('.toast');if(!t){t=document.createElement('div');t.className='toast';document.body.append(t);}t.textContent=text;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1600);}
function render(){if(activeCleanup){try{activeCleanup();}catch(e){console.warn('Game cleanup failed',e);}activeCleanup=null;}const r=parseRoute();if(r.id==='room')return roomView(r.challenge);if(r.id==='insights')return insightsView();const g=games.find(x=>x.meta.id===r.id);g?gameView(g,r.challenge):home();}
window.addEventListener('hashchange',render);window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;if(!parseRoute().id)render();});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));render();
