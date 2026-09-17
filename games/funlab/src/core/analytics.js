const KEY='funlab:analytics:v1';
function read(){
  try{ const x=JSON.parse(localStorage.getItem(KEY)||'[]'); return Array.isArray(x)?x.slice(-500):[]; }
  catch{return [];}
}
function write(events){ try{localStorage.setItem(KEY,JSON.stringify(events.slice(-500)));}catch{} }
export function track(name,detail={}){
  const event={name,detail,at:new Date().toISOString()};
  try{
    const events=read(); events.push(event); write(events);
    window.dispatchEvent(new CustomEvent('funlab:analytics',{detail:event}));
    if(typeof window.FUNLAB_ANALYTICS_HOOK==='function') window.FUNLAB_ANALYTICS_HOOK(event);
  }catch{}
  return event;
}
export function events(){return read();}
export function clearEvents(){try{localStorage.removeItem(KEY);}catch{}}
export function funnelSummary(input=read()){
  const count=n=>input.filter(e=>e.name===n).length;
  const opens=count('game_open'), completes=count('play_complete'), shares=count('share'), replays=count('replay');
  const days=new Set(input.map(e=>String(e.at||'').slice(0,10)).filter(Boolean));
  const pct=(a,b)=>b?Math.round(a/b*100):0;
  const byGame={};
  for(const e of input){
    const id=e.detail?.gameId;if(!id)continue;
    byGame[id]??={opens:0,completes:0,shares:0,replays:0};
    if(e.name==='game_open')byGame[id].opens++;
    if(e.name==='play_complete')byGame[id].completes++;
    if(e.name==='share')byGame[id].shares++;
    if(e.name==='replay')byGame[id].replays++;
  }
  return {opens,completes,shares,replays,activeDays:days.size,completionRate:pct(completes,opens),shareRate:pct(shares,completes),replayRate:pct(replays,completes),byGame};
}
