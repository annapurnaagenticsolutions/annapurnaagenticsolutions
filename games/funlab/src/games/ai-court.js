import {runIntelligence,endpointLabel} from '../core/ai-adapter.js';
import {challengeUrl,shareResult} from '../core/share.js';
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
export const meta={id:'ai-court',emoji:'⚖️',title:'AI Court',tagline:'Bring a trivial dispute. Receive an unnecessarily formal verdict.',verb:'Judge'};
export function mount(root,ctx,challenge){
  root.innerHTML=`<section class="game-head"><div><span class="eyebrow">${meta.verb}</span><h1>${meta.emoji} ${meta.title}</h1><p>${meta.tagline}</p></div><span class="engine-pill">${endpointLabel()}</span></section>
  <article class="play-card"><form id="form"><label>Your dispute<textarea name="dispute" maxlength="500" rows="4" placeholder="My friend says Maggi is better without masala." required>${esc(String(challenge?.dispute||'').slice(0,500))}</textarea></label><button class="primary">Call the court</button></form><div id="result" aria-live="polite"></div></article>`;
  const form=root.querySelector('#form'),out=root.querySelector('#result');
  form.onsubmit=async e=>{e.preventDefault();const dispute=form.elements.dispute.value.trim();if(!dispute)return;out.innerHTML='<p class="thinking">The court is pretending this is serious…</p>';
    const r=await runIntelligence('court',{dispute});out.innerHTML=`<div class="court-grid"><section><span>Side A</span><p>${esc(r.sideA)}</p></section><section><span>Side B</span><p>${esc(r.sideB)}</p></section></div><article class="result-card"><span class="result-kicker">Verdict · ${r.confidence}% confidence</span><h2>${esc(r.winner)}</h2><p>${esc(r.verdict)}</p><small>${esc(r._provider)}</small><div class="result-actions"><button class="secondary" id="room">Open friend room</button><button class="primary" id="share">Share case</button></div></article>`;
    ctx.record(`${dispute} → ${r.winner}`);ctx.ping('pop');
    out.querySelector('#share').onclick=async()=>ctx.shared(await shareResult({title:meta.title,text:`The court ruled ${r.winner}: ${r.verdict}`,url:challengeUrl(meta.id,{dispute})}));
    out.querySelector('#room').onclick=()=>ctx.openRoom({prompt:dispute,answer:`${r.winner}: ${r.verdict}`});
  };
  if(challenge?.dispute)queueMicrotask(()=>form.requestSubmit());
}
