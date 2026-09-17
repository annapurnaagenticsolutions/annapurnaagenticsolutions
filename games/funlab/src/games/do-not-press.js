import { shareResult } from '../core/share.js';

export const meta={id:'do-not-press',emoji:'🔴',title:'Do Not Press',tagline:'One button. Increasingly specific regret.',verb:'Press'};
const LINES=[
  'That was a very clear instruction.',
  'Interesting. You treat warnings as suggestions.',
  'The button has informed management.',
  'A tiny committee has been formed to study your behaviour.',
  'You are now statistically part of the problem.',
  'The button is beginning to respect the commitment.',
  'At this point, stopping would be stranger than continuing.',
  'Congratulations. There is no prize. This somehow feels correct.'
];

export function mount(root,ctx){
  let count=0;
  root.innerHTML=`<section class="game-head"><div><span class="eyebrow">${meta.verb}</span><h1>${meta.emoji} ${meta.title}</h1><p>${meta.tagline}</p></div><span class="engine-pill">One-button toy</span></section>
  <article class="play-card press-card"><p id="warning">Seriously. Don't.</p><button class="big-red" id="press" aria-describedby="warning">DO NOT PRESS</button><div id="reaction" aria-live="polite"></div></article>`;
  const button=root.querySelector('#press'),warning=root.querySelector('#warning'),reaction=root.querySelector('#reaction');
  button.onclick=()=>{
    count++;
    const line=LINES[Math.min(count-1,LINES.length-1)];
    warning.textContent=count<LINES.length?'Please stop pressing it.':'We have accepted this now.';
    reaction.innerHTML=`<p class="press-reaction"><strong>${count}</strong><span>${line}</span></p>${count>=5?'<button class="secondary" id="share">Share poor judgement</button>':''}`;
    button.textContent=count<8?`DO NOT PRESS · ${count}`:'PRESS AGAIN, APPARENTLY';
    ctx.ping(count%3===0?'pop':'ok');
    if(count===8)ctx.record('Pressed the forbidden button 8 times');
    const share=reaction.querySelector('#share');
    if(share) share.onclick=async()=>ctx.shared(await shareResult({title:meta.title,text:`I ignored a very clear warning ${count} times.`,url:location.href}));
  };
}
