import {hashString, seeded01, clamp, pick} from './random.js';

const GLYPHS=['◆','●','▲','✦','⬢','✶','◈','⬟'];
export function visualIdentity(label='?'){
  const h=hashString(String(label));
  return {glyph:GLYPHS[h%GLYPHS.length],hue:h%360,hue2:(h*7+83)%360,initial:String(label||'?').trim().slice(0,1).toUpperCase()||'?'};
}
export function tacticShift(tactic='balanced',seed=''){
  const base={power:8,guard:4,trick:6,balanced:0}[tactic]??0;
  const wobble=Math.round((seeded01(`${seed}|${tactic}`)-.5)*6);
  return base+wobble;
}
export function battlePlan({a='A',b='B',aProbability=50,backed='a',tactic='balanced',seed=''}){
  const shift=tacticShift(tactic,`${a}|${b}|${seed}`)*(backed==='a'?1:-1);
  const adjusted=Math.round(clamp(Number(aProbability||50)+shift,8,92));
  const winner=adjusted>=50?'a':'b';
  let hp={a:100,b:100};
  const events=[];
  for(let i=0;i<12;i++){
    const bias=seeded01(`${seed}|${a}|${b}|${i}`)*100;
    const attacker=bias<adjusted?'a':'b', defender=attacker==='a'?'b':'a';
    let damage=8+Math.floor(seeded01(`${seed}|d|${i}`)*13);
    if(tactic==='guard'&&defender===backed)damage=Math.max(4,damage-5);
    if(tactic==='power'&&attacker===backed)damage+=4;
    if(tactic==='trick'&&attacker===backed&&i%3===1)damage+=7;
    hp[defender]=clamp(hp[defender]-damage,0,100);
    events.push({attacker,defender,damage,aHp:hp.a,bHp:hp.b,kind:tactic==='trick'&&attacker===backed&&i%3===1?'trick':'hit'});
  }
  return {adjusted,winner,events};
}

export const BATTLE_ACTIONS={
  guard:{label:'Guard',icon:'🛡',cooldown:2},
  power:{label:'Power',icon:'💥',cooldown:2},
  trick:{label:'Counter',icon:'🌀',cooldown:3}
};
export function battleActionAvailability(event,backed='a',cooldowns={}){
  return {
    guard:(cooldowns.guard||0)<=0&&event?.defender===backed,
    power:(cooldowns.power||0)<=0&&event?.attacker===backed,
    trick:(cooldowns.trick||0)<=0&&(event?.attacker===backed||event?.defender===backed)
  };
}
export function resolveBattleAction(event,action,backed='a',cooldowns={}){
  const next={guard:cooldowns.guard||0,power:cooldowns.power||0,trick:cooldowns.trick||0};
  const available=battleActionAvailability(event,backed,next);
  let damage=Number(event?.damage||0),counterDamage=0,label='';
  if(action==='guard'&&available.guard){damage=Math.max(2,Math.round(damage*.35));next.guard=BATTLE_ACTIONS.guard.cooldown+1;label='Guard absorbed most of the hit';}
  else if(action==='power'&&available.power){damage+=9;next.power=BATTLE_ACTIONS.power.cooldown+1;label='Power strike added 9 damage';}
  else if(action==='trick'&&available.trick){next.trick=BATTLE_ACTIONS.trick.cooldown+1;if(event.defender===backed){damage=Math.max(3,Math.round(damage*.55));counterDamage=6;label='Counter reduced damage and reflected 6';}else{damage+=6;label='Counter timing added 6 damage';}}
  return {damage,counterDamage,label,used:label?String(action):null,cooldowns:next};
}
export function tickBattleCooldowns(cooldowns={}){
  return Object.fromEntries(Object.keys(BATTLE_ACTIONS).map(k=>[k,Math.max(0,(cooldowns[k]||0)-1)]));
}


const STRATEGY_VERBS={build:'build a contraption',distract:'create a distraction',signal:'signal for help',leverage:'use leverage and force'};
export function buildJugaadPlan(items=[],strategy='build',scenario=''){
  const chosen=[...new Set(items.map(String).map(x=>x.trim()).filter(Boolean))].slice(0,3);
  const verb=STRATEGY_VERBS[strategy]||STRATEGY_VERBS.build;
  const glue=chosen.length>1?`${chosen.slice(0,-1).join(', ')} and ${chosen.at(-1)}`:(chosen[0]||'whatever is nearby');
  return `Use ${glue} to ${verb}. Adapt the setup to this situation: ${String(scenario).slice(0,220)}`;
}
export function jugaadSynergy(items=[],strategy='build'){
  const key=[...items].sort().join('|')+'|'+strategy;
  return Math.round(35+seeded01(key)*60);
}
export function discoveryVisual(label='Unknown'){
  const v=visualIdentity(label);return {...v,spin:(hashString(label)%7)-3,size:42+(hashString(label+'s')%18)};
}
export function hotspotLayout(seed='scene',turn=0){
  const icons=['🧠','⚠️','🤝'];
  const labels=['Inspect','Risk it','Ask around'];
  const spots=[];
  const used=new Set(['3,4']);
  for(let i=0;i<3;i++){
    let x=1+Math.floor(seeded01(`${seed}|${turn}|x|${i}`)*6),y=1+Math.floor(seeded01(`${seed}|${turn}|y|${i}`)*4),guard=0;
    while(used.has(`${x},${y}`)&&guard++<10){x=1+((x+i+1)%6);y=1+((y+1)%4);}used.add(`${x},${y}`);
    spots.push({id:i,x,y,icon:icons[i],label:labels[i]});
  }
  return spots;
}
export function orbitConfig(seed='orbit',quality='balanced'){
  const hazardCount=quality==='high'?12:quality==='low'?7:9;
  const shardCount=quality==='high'?7:quality==='low'?4:5;
  const hazards=Array.from({length:hazardCount},(_,i)=>({lane:i%3,angle:seeded01(`${seed}|h|${i}`)*Math.PI*2,speed:.58+seeded01(`${seed}|hs|${i}`)*.62,size:.13+seeded01(`${seed}|hz|${i}`)*.14}));
  const shards=Array.from({length:shardCount},(_,i)=>({lane:(i*2+1)%3,angle:seeded01(`${seed}|e|${i}`)*Math.PI*2,speed:.28+seeded01(`${seed}|es|${i}`)*.28,active:true}));
  return {hazards,shards};
}


const JUGAAD_EFFECTS={
  0:{'umbrella':24,'pressure cooker':12,'shoelace':28,'₹20 coin':8},
  1:{'newspaper':8,'water bottle':12,'rubber band':34,'spoon':24},
  2:{'banana':42,'mirror':24,'scarf':14,'empty lunchbox':18},
  3:{'old phone':38,'torch':18,'steel plate':10,'extension cable':30},
  4:{'rope':30,'soap':36,'two chairs':27,'marker pen':8}
};
const STRATEGY_BONUS={build:8,distract:6,signal:5,leverage:9};
const STRATEGY_MATCH={0:{build:3,distract:1,signal:2,leverage:7},1:{build:5,distract:0,signal:0,leverage:10},2:{build:0,distract:12,signal:3,leverage:2},3:{build:8,distract:0,signal:12,leverage:3},4:{build:7,distract:0,signal:0,leverage:12}};
export function jugaadSimulation(scenarioIndex,items,strategy,placements=[]){
  const effects=JUGAAD_EFFECTS[scenarioIndex]||{};let progress=8;const steps=[];
  for(const item of items){const delta=effects[item]||6;progress+=delta;steps.push({item,delta,label:`${item} contributes ${delta}% toward the target`});}
  const bonus=(STRATEGY_BONUS[strategy]||4)+((STRATEGY_MATCH[scenarioIndex]||{})[strategy]||0);progress+=bonus;steps.push({item:strategy,delta:bonus,label:`${strategy} strategy adds ${bonus}%`});
  const synergy=Math.round(jugaadSynergy(items,strategy)*.18);progress+=synergy;steps.push({item:'synergy',delta:synergy,label:`bench synergy adds ${synergy}%`});
  if(placements.length>=2){const spatial=jugaadSpatialBonus(placements,strategy,scenarioIndex);progress+=spatial.bonus;steps.push({item:'layout',delta:spatial.bonus,label:`spatial layout adds ${spatial.bonus}% — ${spatial.description}`});}
  progress=clamp(Math.round(progress),0,100);return {progress,success:progress>=70,steps};
}

const ADVENTURE_LOOT={
  station:['Ticket stub','Banana peel','Platform whistle','Umbrella clip'],
  lift:['Access card','Tiny screwdriver','Floor map','Emergency key'],
  parcel:['Packing tape','Strange coin','Label scanner','Bubble wrap'],
  kitchen:['Fridge magnet','Ice cube','Wooden spoon','Recipe note']
};
export function adventureLoot(theme,turn,seed=''){
  const list=ADVENTURE_LOOT[theme]||['Odd key','Loose string','Tiny mirror','Folded note'];return list[(turn+Math.floor(seeded01(`${seed}|${theme}|loot`)*list.length))%list.length];
}
export function adventureItemEffect(item,hotspotId,turn){
  if(!item)return {bonus:false,text:''};const modes=['shortcut','distraction','leverage'];const mode=modes[(hashString(`${item}|${hotspotId}|${turn}`)%modes.length)];
  const text=mode==='shortcut'?`${item} reveals a shortcut.`:mode==='distraction'?`${item} creates exactly enough distraction.`:`${item} becomes an improvised tool.`;
  return {bonus:true,mode,text};
}

const ARENAS=[
  {id:'rooftop',label:'Rooftop Ring',icon:'🏙️'},
  {id:'scrapyard',label:'Scrapyard',icon:'⚙️'},
  {id:'storm',label:'Monsoon Ring',icon:'⛈️',unlock:'storm-ring'}
];
export function arenaChoices(unlocks=[]){return ARENAS.filter(x=>!x.unlock||unlocks.includes(x.unlock));}
export function arenaEnvironment(seed,a,b,unlocks=[]){const list=arenaChoices(unlocks);return list[Math.floor(seeded01(`${seed}|${a}|${b}|arena`)*list.length)%list.length];}


export function jugaadSpatialBonus(placements=[],strategy='build',scenarioIndex=0){
  const pts=placements.filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)).slice(0,3);
  if(pts.length<2)return {bonus:0,score:0,description:'Place at least two tools to create a spatial setup.'};
  let dist=0,pairs=0,sameRow=0,sameCol=0;
  for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
    dist+=Math.abs(pts[i].x-pts[j].x)+Math.abs(pts[i].y-pts[j].y);pairs++;
    if(pts[i].y===pts[j].y)sameRow++;if(pts[i].x===pts[j].x)sameCol++;
  }
  const spread=clamp((dist/Math.max(1,pairs))/6,0,1),cluster=1-spread,alignment=clamp((sameRow+sameCol)/Math.max(1,pairs),0,1);
  let score=0,description='';
  if(strategy==='build'){score=cluster*.7+alignment*.3;description='Build rewards a tight, connected layout.';}
  else if(strategy==='leverage'){score=alignment*.72+spread*.28;description='Leverage rewards tools lined up into a force path.';}
  else if(strategy==='signal'){score=spread*.86+alignment*.14;description='Signal rewards a wide layout with visible separation.';}
  else {score=spread*.62+(1-alignment)*.38;description='Distract rewards a scattered, irregular layout.';}
  const scenarioBias=seeded01(`spatial|${scenarioIndex}|${strategy}`)*.12;
  score=clamp(score+scenarioBias,0,1);
  return {score,bonus:Math.round(score*18),description};
}

const ADVENTURE_SCENES={
  station:{terrain:'platform',hotspots:[['🎫','Ticket gate'],['🐒','Monkey trail'],['☕','Tea stall']],objects:[{x:2,y:1,icon:'🪑',kind:'obstacle',label:'bench'},{x:5,y:3,icon:'🧳',kind:'object',label:'lost bag'}],actor:{icon:'🚶',label:'commuter',path:[[1,2],[2,2],[3,2],[4,2],[5,2]]}},
  lift:{terrain:'hallway',hotspots:[['🔢','Control panel'],['🚪','Dark doorway'],['🪴','Quiet corner']],objects:[{x:4,y:2,icon:'🪴',kind:'obstacle',label:'plant'},{x:1,y:1,icon:'🧯',kind:'object',label:'extinguisher'}],actor:{icon:'🧹',label:'caretaker',path:[[5,1],[5,2],[5,3],[4,3],[3,3]]}},
  parcel:{terrain:'apartment',hotspots:[['🏷️','Shipping label'],['📦','Box seam'],['🚪','Neighbor door']],objects:[{x:2,y:3,icon:'🛋️',kind:'obstacle',label:'sofa'},{x:5,y:1,icon:'🪴',kind:'object',label:'window plant'}],actor:{icon:'🐈',label:'cat',path:[[1,1],[2,1],[3,1],[3,2],[4,2]]}},
  kitchen:{terrain:'kitchen',hotspots:[['🧊','Fridge panel'],['⚡','Fuse box'],['🪟','Window']],objects:[{x:2,y:1,icon:'🍽️',kind:'obstacle',label:'table'},{x:5,y:3,icon:'🗑️',kind:'object',label:'bin'}],actor:{icon:'🤖',label:'robot vacuum',path:[[1,3],[2,3],[3,3],[4,3],[5,3]]}}
};
export function adventureSceneSpec(theme='station',turn=0,seed=''){
  const base=ADVENTURE_SCENES[theme]||ADVENTURE_SCENES.station;
  const shift=Math.floor(seeded01(`${seed}|${theme}|${turn}|actor`)*base.actor.path.length);
  const path=base.actor.path.map((_,i)=>base.actor.path[(i+shift)%base.actor.path.length]);
  return {terrain:base.terrain,hotspots:base.hotspots,objects:base.objects.map(x=>({...x})),actor:{...base.actor,path}};
}
export function adventureHotspots(theme='station',seed='scene',turn=0){
  const spots=hotspotLayout(`${seed}|${theme}`,turn),spec=ADVENTURE_SCENES[theme]||ADVENTURE_SCENES.station,blocked=new Set(spec.objects.filter(o=>o.kind==='obstacle').map(o=>`${o.x},${o.y}`));
  const used=new Set(['3,4']);
  return spots.map((s,i)=>{let x=s.x,y=s.y,guard=0;while((blocked.has(`${x},${y}`)||used.has(`${x},${y}`))&&guard++<12){x=1+(x%6);if(x===s.x)y=1+(y%4);}used.add(`${x},${y}`);return {...s,x,y,icon:spec.hotspots[i][0],label:spec.hotspots[i][1]};});
}

export function fusionLineageLayout(edges=[],baseItems=['Earth','Water','Fire','Wind']){
  const depths=new Map(baseItems.map(x=>[x,0]));
  for(const e of edges){const d=Math.max(depths.get(e.a)||0,depths.get(e.b)||0)+1;depths.set(e.result,Math.max(depths.get(e.result)||0,d));}
  const names=[...new Set([...baseItems,...edges.flatMap(e=>[e.a,e.b,e.result])])];
  const layers=new Map();for(const n of names){const d=depths.get(n)||0;if(!layers.has(d))layers.set(d,[]);layers.get(d).push(n);}
  const maxDepth=Math.max(0,...layers.keys()),width=Math.max(620,...[...layers.values()].map(v=>v.length*150+80)),height=100+maxDepth*112;
  const nodes=[];
  for(const [depth,list] of [...layers.entries()].sort((a,b)=>a[0]-b[0])){
    const gap=width/(list.length+1);list.forEach((name,i)=>nodes.push({name,depth,x:Math.round(gap*(i+1)),y:50+depth*112}));
  }
  const by=new Map(nodes.map(n=>[n.name,n]));
  const links=[];for(const e of edges){for(const parent of [e.a,e.b]){const a=by.get(parent),b=by.get(e.result);if(a&&b)links.push({from:parent,to:e.result,x1:a.x,y1:a.y,x2:b.x,y2:b.y});}}
  return {width,height,nodes,links,maxDepth};
}
