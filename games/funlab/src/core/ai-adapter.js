import { hashString, seeded01, clamp, pick } from './random.js';

export function endpointMode(){
  return typeof window!=='undefined' && window.FUNLAB_AI_ENDPOINT ? 'endpoint' : 'local';
}
export function endpointLabel(){return endpointMode()==='endpoint'?'Connected endpoint':'Local engine';}

export async function runIntelligence(task,payload){
  const endpoint=typeof window!=='undefined'?window.FUNLAB_AI_ENDPOINT:null;
  if(endpoint){
    try{
      const res=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({task,payload}),...(typeof AbortSignal!=='undefined'&&AbortSignal.timeout?{signal:AbortSignal.timeout(6500)}:{})});
      if(!res.ok)throw new Error(`Intelligence endpoint ${res.status}`);
      const data=await res.json();
      return {...normalizeOutput(task,data,payload),_mode:data._mode||'endpoint',_provider:String(data._provider||'endpoint').slice(0,80)};
    }catch(err){console.warn('FunLab endpoint failed; using local fallback.',err);}
  }
  return {...normalizeOutput(task,localFallback(task,payload),payload),_mode:'local',_provider:'deterministic-local'};
}


function boundedText(v,max=300,fallback=''){return String(v??fallback).slice(0,max);}
function boundedNumber(v,min,max,fallback=min){const n=Number(v);return clamp(Number.isFinite(n)?n:fallback,min,max);}
export function normalizeOutput(task,data={},payload={}){
  if(task==='versus'){
    const candidates=[String(payload.a||''),String(payload.b||'')];
    const winner=candidates.includes(String(data.winner))?String(data.winner):candidates[0];
    return {winner,probability:Math.round(boundedNumber(data.probability,50,100,50)),aProbability:Math.round(boundedNumber(data.aProbability,0,100,50)),reason:boundedText(data.reason,360,'No explanation returned.')};
  }
  if(task==='persuade')return {score:Math.round(boundedNumber(data.score,0,100,0)),gain:Math.round(boundedNumber(data.gain,0,100,0)),reaction:boundedText(data.reaction,280,'No reaction returned.')};
  if(task==='jugaad')return {creativity:Math.round(boundedNumber(data.creativity,0,100,0)),practicality:Math.round(boundedNumber(data.practicality,0,100,0)),survival:Math.round(boundedNumber(data.survival,0,100,0)),verdict:boundedText(data.verdict,280,'No verdict returned.')};
  if(task==='combine')return {result:boundedText(data.result,100,'Unknown Fusion'),note:boundedText(data.note,320,'The lab declines to explain.'),isFirstDiscovery:Boolean(data.isFirstDiscovery)};
  if(task==='court')return {sideA:boundedText(data.sideA,500,'No argument.'),sideB:boundedText(data.sideB,500,'No argument.'),winner:boundedText(data.winner,80,'Undecided'),verdict:boundedText(data.verdict,420,'No verdict.'),confidence:Math.round(boundedNumber(data.confidence,0,100,50))};
  return {text:boundedText(data.text,400,'No result.')};
}

function titleCase(s=''){return s.trim().replace(/\b\w/g,m=>m.toUpperCase());}
function traits(text=''){
  const t=text.toLowerCase();return {
    tech:/robot|ai|laser|computer|phone|internet|machine|code/.test(t),huge:/black hole|planet|mountain|ocean|sun|galaxy|giant/.test(t),
    living:/cat|dog|elephant|human|monkey|tiger|lion|grandma|grandmother|person|bird/.test(t),water:/water|rain|ocean|river|flood|ice/.test(t),fire:/fire|lava|sun|flame|heat/.test(t)
  };
}
function versus(a,b){
  const A=traits(a),B=traits(b);let delta=(seeded01(`${a}|${b}`)-.5)*34;
  if(A.huge&&!B.huge)delta+=22;if(B.huge&&!A.huge)delta-=22;if(A.tech&&B.living)delta+=8;if(B.tech&&A.living)delta-=8;if(A.water&&B.fire)delta+=18;if(B.water&&A.fire)delta-=18;
  const pa=Math.round(clamp(50+delta,8,92)),winner=pa>=50?a:b,loser=pa>=50?b:a;
  const reasons=[`${titleCase(winner)} controls the matchup before ${titleCase(loser)} can use its best advantage.`,`${titleCase(winner)} wins on a strange mix of scale, adaptability and pure narrative momentum.`,`The deciding factor is not raw power; ${titleCase(winner)} has the cleaner path to an actual win.`,`${titleCase(loser)} has a chance, but the scenario tilts toward ${titleCase(winner)} once the chaos starts.`];
  return {winner,probability:pa>=50?pa:100-pa,aProbability:pa,reason:pick(reasons,`${a}${b}reason`)};
}
function persuasion(payload){
  const arg=(payload.argument||'').trim(),old=Number(payload.score||18),words=arg.split(/\s+/).filter(Boolean);
  const evidence=/because|example|data|reason|if|therefore|means|proof|consider/.test(arg.toLowerCase()),specificity=/\d|%|year|cost|time|people|study|case/.test(arg.toLowerCase());
  let gain=4+Math.min(18,words.length*.7)+(evidence?10:0)+(specificity?7:0)+seeded01(arg)*8;if(words.length<4)gain*=.45;gain=Math.round(clamp(gain,2,34));
  const score=Math.round(clamp(old+gain,0,100)),reaction=score>=80?'I dislike how convincing that was.':score>=55?'That argument actually moved me.':'Interesting, but I am not surrendering yet.';
  return {score,gain,reaction};
}
function evaluateJugaad(payload){
  const s=(payload.solution||'').trim(),words=s.split(/\s+/).filter(Boolean),actions=(s.match(/\b(use|tie|break|call|throw|heat|cool|open|push|pull|trade|offer|signal|build|make|wrap|climb|cut|pour|hide|distract|negotiate)\b/gi)||[]).length,base=hashString(s)%17;
  const creativity=clamp(Math.round(28+words.length*2.1+actions*7+base),18,98),practicality=clamp(Math.round(30+Math.min(words.length,25)*1.6+actions*5-(s.length>300?8:0)+(hashString(s+'p')%13)),15,96),survival=clamp(Math.round(practicality*.58+creativity*.25+(hashString(s+'s')%18)),12,97);
  return {creativity,practicality,survival,verdict:survival>75?'Suspiciously competent.':survival>50?'Chaotic, but it might work.':'Excellent story. Questionable life plan.'};
}
function combine(payload){
  const a=(payload.a||'').trim(),b=(payload.b||'').trim(),key=[a.toLowerCase(),b.toLowerCase()].sort().join('+');
  const known={
    'earth+water':['Mud','A patient puddle with ambitions.'],'fire+water':['Steam','Hot water escaping its responsibilities.'],'fire+wind':['Wildfire','Air has made a poor decision.'],'earth+fire':['Lava','Earth, but emotionally unavailable.'],
    'steam+water':['Cloud','Steam joined a group project.'],'cloud+water':['Rain','The cloud has submitted its work.'],'earth+rain':['Garden','Mud discovered a hobby.'],'fire+robot':['Toaster','A robot with one very specific career.'],
    'cat+internet':['Meme','Civilization has reached its natural endpoint.'],'ai+samosa':['Promptato','An unnecessarily intelligent snack concept.']
  };
  if(known[key])return {result:known[key][0],note:known[key][1],isFirstDiscovery:false};
  const stems=[a,b].map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean),modes=['Fusion','Echo','Prime','Bloom','Drift','Forge','Sprite','Nexus'];
  const mode=pick(modes,key),result=seeded01(key)>.5?`${titleCase(stems[0])} ${mode}`:`${titleCase(stems[1])}${titleCase(stems[0]).replace(/\s/g,'')}`;
  return {result,note:`${titleCase(a)} and ${titleCase(b)} have produced something the laboratory refuses to explain.`,isFirstDiscovery:true};
}
function court(payload){
  const dispute=(payload.dispute||'').trim(),seed=hashString(dispute),winner=seed%2===0?'Side A':'Side B';
  const a=`The case for Side A is simple: ${pick(['consistency matters','intent matters more than technicality','the social contract has clearly been breached','common sense should survive contact with the facts'],dispute+'a')}.`;
  const b=`Side B responds that ${pick(['context changes everything','this is an overreaction disguised as principle','precedent strongly favors chaos','the alleged offence is actually excellent taste'],dispute+'b')}.`;
  const verdict=`${winner} wins. ${pick(['The court also recommends snacks.','No appeals will be heard before tea.','Costs are awarded in imaginary internet points.','The judge regrets accepting jurisdiction.'],dispute+'v')}`;
  return {sideA:a,sideB:b,winner,verdict,confidence:55+(seed%36)};
}
export function localFallback(task,payload){
  if(task==='versus')return versus(payload.a,payload.b);
  if(task==='persuade')return persuasion(payload);
  if(task==='jugaad')return evaluateJugaad(payload);
  if(task==='combine')return combine(payload);
  if(task==='court')return court(payload);
  return {text:'Local engine has no rule for this task yet.'};
}
