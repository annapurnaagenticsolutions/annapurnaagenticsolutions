export const ACHIEVEMENTS={
  'tactical-upset':{title:'Tactical Upset',description:'Flip the base arena prediction with your chosen tactic.',unlock:'storm-ring'},
  'target-engineer':{title:'Target Engineer',description:'Push a Jugaad target simulation to at least 80%.',unlock:'prototype-bench'},
  'carry-on':{title:'Carry-On Thinking',description:'Use an item collected in an earlier adventure scene.',unlock:'expedition-pack'},
  'chain-reaction':{title:'Chain Reaction',description:'Create three discoveries in one Fusion Lab session.',unlock:'reactor-3d'}
};

export function awardProgress(state,id){
  const def=ACHIEVEMENTS[id];if(!def)return {changed:false,state,achievement:null,unlock:null};
  state.progression ||= {achievements:{},unlocks:[]};
  state.progression.achievements ||= {};state.progression.unlocks ||= [];
  if(state.progression.achievements[id])return {changed:false,state,achievement:def,unlock:def.unlock||null};
  state.progression.achievements[id]={earnedAt:new Date().toISOString()};
  if(def.unlock&&!state.progression.unlocks.includes(def.unlock))state.progression.unlocks.push(def.unlock);
  return {changed:true,state,achievement:def,unlock:def.unlock||null};
}
export function hasUnlock(state,id){return !!state?.progression?.unlocks?.includes(id);}
export function achievementCount(state){return Object.keys(state?.progression?.achievements||{}).length;}
