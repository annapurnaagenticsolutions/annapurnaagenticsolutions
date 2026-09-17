import {seeded01,clamp} from '../core/random.js';
import {shareResult} from '../core/share.js';

export const meta={id:'odd-signal',emoji:'📡',title:'Odd Signal',tagline:'Find the one signal that breaks the visual rule.',verb:'Spot',presentation:'2D Canvas'};
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

export function mount(root,ctx){
  let round=0,score=0,started=performance.now(),raf=0,alive=true;
  const reduced=()=>document.documentElement.classList.contains('reduce-motion');
  root.innerHTML=`<section class="game-head"><div><span class="eyebrow">${meta.verb}</span><h1>${meta.emoji} ${meta.title}</h1><p>${meta.tagline}</p></div><span class="engine-pill">${meta.presentation}</span></section>
  <article class="play-card visual-card"><div class="visual-toolbar"><span id="roundLabel">Round 1 of 5</span><strong id="scoreLabel">0 pts</strong></div>
  <canvas id="signalCanvas" class="signal-canvas" width="720" height="520" aria-label="Grid of sixteen abstract signals. Find the one that differs."></canvas>
  <div class="result-actions"><button class="secondary" id="describe">Describe signals</button><button class="secondary" id="newPuzzle">New puzzle</button></div><div id="description" class="sr-description" aria-live="polite"></div><div id="signalButtons" class="signal-buttons" hidden>${Array.from({length:16},(_,i)=>`<button class="secondary" data-signal="${i}">${i+1}</button>`).join('')}</div><div id="feedback" aria-live="polite"></div></article>`;
  const canvas=root.querySelector('#signalCanvas'),c=canvas.getContext('2d'),feedback=root.querySelector('#feedback'),desc=root.querySelector('#description'),roundLabel=root.querySelector('#roundLabel'),scoreLabel=root.querySelector('#scoreLabel');
  let puzzle=makePuzzle(ctx.dayKey,round),roundStart=performance.now();

  function makePuzzle(day,n){
    const seed=`${day}|${n}|odd-signal`;
    const target=Math.floor(seeded01(seed+'target')*16)%16;
    const family=Math.floor(seeded01(seed+'family')*3)%3;
    const base=3+Math.floor(seeded01(seed+'base')*3);
    return {target,family,base};
  }
  function dims(){
    const r=canvas.getBoundingClientRect();const dpr=Math.min(window.devicePixelRatio||1,ctx.quality==='high'?2:ctx.quality==='low'?1:1.5);
    const w=Math.max(300,Math.round(r.width*dpr)),h=Math.max(260,Math.round(r.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}return {w,h,dpr};
  }
  function draw(t=0){
    if(!alive)return;const {w,h}=dims();c.clearRect(0,0,w,h);const pad=w*.055,gap=Math.min(w,h)*.028,cell=(Math.min(w-pad*2,h-pad*2)-gap*3)/4;const ox=(w-(cell*4+gap*3))/2,oy=(h-(cell*4+gap*3))/2;const phase=reduced()?0:t/700;
    for(let i=0;i<16;i++){
      const col=i%4,row=Math.floor(i/4),x=ox+col*(cell+gap)+cell/2,y=oy+row*(cell+gap)+cell/2;drawSignal(x,y,cell*.3,i===puzzle.target,puzzle,phase+i*.31);
    }
    if(!reduced())raf=requestAnimationFrame(draw);
  }
  function drawSignal(x,y,r,odd,p,phase){
    c.save();c.translate(x,y);const pulse=reduced()?1:(1+Math.sin(phase)*.045);c.scale(pulse,pulse);c.lineWidth=Math.max(2,r*.08);c.strokeStyle='rgba(245,241,232,.88)';c.fillStyle='rgba(141,224,210,.08)';
    c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.stroke();
    let spokes=p.base;if(p.family===0&&odd)spokes+=1;
    for(let k=0;k<spokes;k++){const a=k/spokes*Math.PI*2+(p.family===2&&odd?Math.PI/spokes:0);c.beginPath();c.moveTo(Math.cos(a)*r*.22,Math.sin(a)*r*.22);c.lineTo(Math.cos(a)*r*.78,Math.sin(a)*r*.78);c.stroke();}
    c.fillStyle='#ffcc66';const dots=p.family===1&&odd?2:1;for(let d=0;d<dots;d++){c.beginPath();c.arc((d-.5*(dots-1))*r*.34,0,r*.1,0,Math.PI*2);c.fill();}
    if(p.family===2){c.strokeStyle='#ff7d91';c.lineWidth=Math.max(2,r*.05);const offset=odd?Math.PI:0;c.beginPath();c.arc(0,0,r*.62,-.5+offset,.65+offset);c.stroke();}
    c.restore();
  }
  function indexFromEvent(e){const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*canvas.width,y=(e.clientY-r.top)/r.height*canvas.height;const w=canvas.width,h=canvas.height,pad=w*.055,gap=Math.min(w,h)*.028,cell=(Math.min(w-pad*2,h-pad*2)-gap*3)/4,ox=(w-(cell*4+gap*3))/2,oy=(h-(cell*4+gap*3))/2;const col=Math.floor((x-ox)/(cell+gap)),row=Math.floor((y-oy)/(cell+gap));if(col<0||col>3||row<0||row>3)return -1;return row*4+col;}
  function choose(i){
    if(i<0)return;const ok=i===puzzle.target;const elapsed=(performance.now()-roundStart)/1000;if(ok){const pts=Math.round(clamp(300-elapsed*22,80,300));score+=pts;scoreLabel.textContent=`${score} pts`;ctx.ping('pop');feedback.innerHTML=`<p class="reaction">Correct. +${pts} points.</p>`;round++;if(round>=5){finish();return;}puzzle=makePuzzle(ctx.dayKey,round);roundStart=performance.now();roundLabel.textContent=`Round ${round+1} of 5`;desc.innerHTML='';if(reduced())draw();}else{ctx.ping('bad');feedback.innerHTML='<p class="reaction">That signal follows the rule. Try another.</p>';}}
  function finish(){const total=Math.round((performance.now()-started)/1000);ctx.record(`Odd Signal ${score} points in ${total}s`);feedback.innerHTML=`<div class="finale"><span class="result-kicker">Pattern scan complete</span><h2>${score}</h2><p>${total}s · five anomalies found</p><div class="result-actions"><button class="primary" id="share">Share score</button><button class="secondary" id="again">Play again</button></div></div>`;root.querySelector('#share').onclick=async()=>ctx.shared(await shareResult({title:meta.title,text:`I scored ${score} in Odd Signal in ${total}s.`,url:location.href}));root.querySelector('#again').onclick=()=>{ctx.replay();round=0;score=0;started=performance.now();roundStart=started;puzzle=makePuzzle(ctx.dayKey+Date.now(),0);roundLabel.textContent='Round 1 of 5';scoreLabel.textContent='0 pts';feedback.innerHTML='';if(reduced())draw();};}
  function description(){const normal=puzzle.family===0?`${puzzle.base} spokes and one center dot`:puzzle.family===1?`${puzzle.base} spokes and one center dot`: `${puzzle.base} spokes, one center dot and the arc on the same side`;const odd=puzzle.family===0?`${puzzle.base+1} spokes and one center dot`:puzzle.family===1?`${puzzle.base} spokes and two center dots`:`${puzzle.base} spokes, one center dot and the arc on the opposite side`;desc.innerHTML=`<p>Signals 1–16 are arranged left-to-right, top-to-bottom. Fifteen signals have ${esc(normal)}. One signal has ${esc(odd)}. Use the canvas or count positions from the top-left.</p>`;}
  canvas.addEventListener('click',e=>choose(indexFromEvent(e)));root.querySelector('#describe').onclick=()=>{description();root.querySelector('#signalButtons').hidden=false;};root.querySelectorAll('[data-signal]').forEach(b=>b.onclick=()=>choose(Number(b.dataset.signal)));root.querySelector('#newPuzzle').onclick=()=>{ctx.replay();round=0;score=0;started=performance.now();roundStart=started;puzzle=makePuzzle(ctx.dayKey+Date.now(),0);roundLabel.textContent='Round 1 of 5';scoreLabel.textContent='0 pts';feedback.innerHTML='';desc.innerHTML='';root.querySelector('#signalButtons').hidden=true;if(reduced())draw();};
  const onSettings=e=>{ctx.quality=e.detail?.quality||ctx.quality;cancelAnimationFrame(raf);draw();};window.addEventListener('funlab:settings',onSettings);draw();
  return()=>{alive=false;cancelAnimationFrame(raf);window.removeEventListener('funlab:settings',onSettings);};
}
