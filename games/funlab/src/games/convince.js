import { runIntelligence, endpointLabel } from '../core/ai-adapter.js';
import { challengeUrl, shareResult } from '../core/share.js';

export const meta={id:'convince',emoji:'🧠',title:'Convince the AI',tagline:'Three attempts. Move the belief meter.',verb:'Persuade'};
const esc=s=>String(s??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
const CLAIMS=['Monday should be removed from the week.','Pineapple belongs on pizza.','Naps are a productivity tool.','Cats would make excellent project managers.','Samosa is a perfectly valid breakfast.'];

export function mount(root,ctx,challenge){
  const claim=String(challenge?.claim||CLAIMS[Math.floor(ctx.dailySeed*CLAIMS.length)%CLAIMS.length]).slice(0,160);
  let score=18,turn=0;
  root.innerHTML=`<section class="game-head"><div><span class="eyebrow">${meta.verb}</span><h1>${meta.emoji} ${meta.title}</h1><p>${meta.tagline}</p></div><span class="engine-pill">${endpointLabel()}</span></section>
  <article class="play-card"><span class="result-kicker">Today's ridiculous position</span><h2>${esc(claim)}</h2>
  <div class="belief"><div class="belief-label"><span>Belief</span><strong id="score">${score}%</strong></div><div class="meter"><span id="bar" style="width:${score}%"></span></div></div>
  <form id="form"><label>Your argument<textarea id="arg" name="arg" maxlength="420" rows="4" placeholder="Because…" required></textarea></label><button class="primary" type="submit">Make attempt <span id="turn">1</span>/3</button></form>
  <div id="reaction" aria-live="polite"></div></article>`;
  const form=root.querySelector('#form'),arg=root.querySelector('#arg'),bar=root.querySelector('#bar'),scoreEl=root.querySelector('#score'),reaction=root.querySelector('#reaction');
  form.onsubmit=async e=>{
    e.preventDefault(); if(turn>=3)return;
    const text=arg.value.trim(); if(!text)return;
    form.querySelector('button').disabled=true;
    const r=await runIntelligence('persuade',{claim,argument:text,score});
    score=r.score;turn++;
    bar.style.width=`${score}%`;scoreEl.textContent=`${score}%`;
    reaction.innerHTML=`<p class="reaction"><strong>+${r.gain}</strong> — ${esc(r.reaction)}</p>`;
    arg.value='';ctx.ping(score>=70?'pop':'ok');
    if(turn>=3){
      ctx.record(`${claim} → ${score}%`);form.remove();
      reaction.innerHTML+=`<div class="result-actions"><button class="secondary" id="room">Friend room</button><button class="primary" id="share">Challenge this claim</button></div>`;
      reaction.querySelector('#share').onclick=async()=>ctx.shared(await shareResult({title:meta.title,text:`I moved “${claim}” to ${score}% belief. Can you do better?`,url:challengeUrl(meta.id,{claim})}));
      reaction.querySelector('#room').onclick=()=>ctx.openRoom({prompt:claim,answer:`${score}% belief`});
    } else {
      form.querySelector('#turn').textContent=turn+1;
      form.querySelector('button').disabled=false;
      arg.focus();
    }
  };
}
