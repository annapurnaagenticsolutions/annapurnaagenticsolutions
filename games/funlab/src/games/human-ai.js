import { seeded01 } from '../core/random.js';
import { shareResult } from '../core/share.js';

export const meta={id:'human-ai',emoji:'🕵️',title:'Human or AI?',tagline:'Which answer feels machine-made?',verb:'Guess'};
const ROUNDS=[
 {q:'What is the correct emergency use of an empty ice-cream box?',human:'Store mystery leftovers until nobody remembers what they are.',ai:'Repurpose it as a labelled household storage container for small items.'},
 {q:'Why does tea taste better when someone else makes it?',human:'Because the person making it also carries the responsibility for whether it is bad.',ai:'Perceived taste can be influenced by context, expectation, and the social experience around a drink.'},
 {q:'What should you do when the TV remote stops working?',human:'Hit it gently, rotate the batteries, then behave surprised when that works.',ai:'Check the batteries, ensure line of sight to the television, and verify the remote is paired.'},
 {q:'Describe Monday in one sentence.',human:'Sunday’s unpaid invoice.',ai:'Monday is commonly experienced as the transition from weekend routines back to work or school.'}
];

export function mount(root,ctx){
  let n=0,score=0;
  root.innerHTML=`<section class="game-head"><div><span class="eyebrow">${meta.verb}</span><h1>${meta.emoji} ${meta.title}</h1><p>${meta.tagline}</p></div><span class="engine-pill">4 rounds</span></section><article class="play-card"><div id="round"></div></article>`;
  const box=root.querySelector('#round');
  function draw(){
    if(n>=ROUNDS.length){
      box.innerHTML=`<div class="finale"><span class="result-kicker">Final score</span><h2>${score}/${ROUNDS.length}</h2><p>${score===4?'Either you are excellent at this, or you are the AI.':score>=2?'Respectable machine suspicion.':'The machines appreciate your trust.'}</p><button class="primary" id="share">Share score</button></div>`;
      ctx.record(`Human/AI ${score}/4`);ctx.ping(score>=3?'pop':'ok');
      box.querySelector('#share').onclick=async()=>ctx.shared(await shareResult({title:meta.title,text:`I scored ${score}/4 at Human or AI?`,url:location.href}));
      return;
    }
    const r=ROUNDS[n];
    const flip=seeded01(`${ctx.dayKey}-${n}`)>.5;
    const answers=flip?[['human',r.human],['ai',r.ai]]:[['ai',r.ai],['human',r.human]];
    box.innerHTML=`<div class="progress">Round ${n+1} of ${ROUNDS.length}</div><h2>${r.q}</h2><p>Tap the answer you think was written by AI.</p><div class="answer-grid">${answers.map(([kind,text],i)=>`<button class="answer" data-kind="${kind}"><b>${i?'B':'A'}</b><span>${text}</span></button>`).join('')}</div><div id="feedback" aria-live="polite"></div>`;
    box.querySelectorAll('.answer').forEach(btn=>btn.onclick=()=>{
      const ok=btn.dataset.kind==='ai';
      if(ok)score++;
      box.querySelectorAll('.answer').forEach(x=>x.disabled=true);
      box.querySelector('#feedback').innerHTML=`<p class="reaction">${ok?'Correct. Slightly alarming.':'Human got you this time.'}</p><button class="primary" id="next">${n===ROUNDS.length-1?'See score':'Next round'}</button>`;
      ctx.ping(ok?'pop':'bad');
      box.querySelector('#next').onclick=()=>{n++;draw();};
    });
  }
  draw();
}
