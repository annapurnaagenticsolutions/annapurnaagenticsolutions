const KEY='funlab:v0.6';
const EMPTY={
  version:6,
  createdAt:null,
  settings:{sound:false,reducedMotion:false,highContrast:false,quality:'balanced'},
  stats:{plays:0,shares:0,byGame:{}},
  daily:{lastActiveDay:null,currentStreak:0,bestStreak:0,activeDays:[]},
  rooms:[],progression:{achievements:{},unlocks:[]},history:[]
};
function cloneEmpty(){return JSON.parse(JSON.stringify(EMPTY));}
function dayDiff(a,b){
  if(!a||!b)return null;
  const [ay,am,ad]=a.split('-').map(Number),[by,bm,bd]=b.split('-').map(Number);
  return Math.round((Date.UTC(by,bm-1,bd)-Date.UTC(ay,am-1,ad))/86400000);
}
export function loadState(){
  try{
    const raw=localStorage.getItem(KEY) || localStorage.getItem('funlab:v0.5') || localStorage.getItem('funlab:v0.4') || localStorage.getItem('funlab:v0.3') || localStorage.getItem('funlab:v0.2') || localStorage.getItem('funlab:v0.1');
    if(!raw){const s=cloneEmpty();s.createdAt=new Date().toISOString();return s;}
    const x=JSON.parse(raw);
    return {...cloneEmpty(),...x,version:6,settings:{...EMPTY.settings,...x.settings},stats:{...EMPTY.stats,...x.stats,byGame:{...EMPTY.stats.byGame,...x.stats?.byGame}},daily:{...EMPTY.daily,...x.daily},rooms:Array.isArray(x.rooms)?x.rooms.slice(-20):[],progression:{achievements:{...EMPTY.progression.achievements,...(x.progression?.achievements||{})},unlocks:[...new Set(x.progression?.unlocks||[])]},history:Array.isArray(x.history)?x.history.slice(-60):[]};
  }catch{return cloneEmpty();}
}
export function saveState(s){try{localStorage.setItem(KEY,JSON.stringify(s));}catch{}}
export function touchDay(s,day){
  if(!day)return s;
  const d=s.daily||(s.daily={...EMPTY.daily});
  if(d.lastActiveDay===day)return s;
  const diff=dayDiff(d.lastActiveDay,day);
  if(diff===1)d.currentStreak=(d.currentStreak||0)+1;
  else d.currentStreak=1;
  d.bestStreak=Math.max(d.bestStreak||0,d.currentStreak);
  d.lastActiveDay=day;
  d.activeDays=[...new Set([...(d.activeDays||[]),day])].slice(-90);
  saveState(s);return s;
}
export function recordPlay(s,gameId,summary='',day=null){
  s.stats.plays=(s.stats.plays||0)+1;
  s.stats.byGame[gameId]=(s.stats.byGame[gameId]||0)+1;
  s.history.push({gameId,summary:String(summary).slice(0,220),at:new Date().toISOString()});
  s.history=s.history.slice(-60);if(day)touchDay(s,day);saveState(s);return s;
}
export function recordShare(s){s.stats.shares=(s.stats.shares||0)+1;saveState(s);return s;}
export function updateSetting(s,key,value){s.settings[key]=value;saveState(s);return s;}
export function saveRoom(s,room){s.rooms=[...(s.rooms||[]).filter(x=>x.id!==room.id),room].slice(-20);saveState(s);return s;}
export function resetState(){localStorage.removeItem(KEY);localStorage.removeItem('funlab:v0.5');localStorage.removeItem('funlab:v0.4');localStorage.removeItem('funlab:v0.3');localStorage.removeItem('funlab:v0.2');localStorage.removeItem('funlab:v0.1');return loadState();}
