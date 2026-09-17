import {shareResult} from '../core/share.js';
import {seeded01} from '../core/random.js';

export const meta={id:'micro-garden',emoji:'🌱',title:'Pocket Garden',tagline:'Paint a tiny ecosystem and watch simple rules collide.',verb:'Grow',presentation:'2D Cellular Toy'};
const W=144,H=92,EMPTY=0,SAND=1,WATER=2,SEED=3,PLANT=4,FIRE=5,STONE=6;
const colors=['#11131a','#d7b56d','#5aa9d6','#d6ca75','#69c786','#ff704f','#73798a'];

export function mount(root,ctx){
  let grid=new Uint8Array(W*H),age=new Uint8Array(W*H),tool=SEED,raf=0,last=0,alive=true,ticks=0,recorded=false,painting=false;
  const reduced=()=>document.documentElement.classList.contains('reduce-motion');
  root.innerHTML=`<section class="game-head"><div><span class="eyebrow">${meta.verb}</span><h1>${meta.emoji} ${meta.title}</h1><p>${meta.tagline}</p></div><span class="engine-pill">${meta.presentation}</span></section>
  <article class="play-card garden-card"><div class="garden-tools" role="toolbar" aria-label="Garden tools">${[[SEED,'Seed','🌱'],[WATER,'Water','💧'],[SAND,'Sand','·'],[STONE,'Stone','◆'],[FIRE,'Fire','🔥']].map(([v,n,e])=>`<button class="tool ${v===tool?'active':''}" data-tool="${v}" aria-pressed="${v===tool}"><span>${e}</span>${n}</button>`).join('')}<button class="tool" id="rain">☔ Rain</button><button class="tool" id="clear">↺ Clear</button></div>
  <canvas id="gardenCanvas" class="garden-canvas" width="720" height="460" aria-label="Interactive cellular garden. Paint seeds, water, sand, stone and fire."></canvas><div class="garden-status"><span id="status">0 plants · 0 water</span><span>Drag or tap to paint</span></div><div class="result-actions"><button class="secondary" id="step">Advance one step</button><button class="primary" id="share">Share garden stats</button></div></article>`;
  const canvas=root.querySelector('#gardenCanvas'),c=canvas.getContext('2d'),status=root.querySelector('#status');
  function idx(x,y){return y*W+x;}function inside(x,y){return x>=0&&x<W&&y>=0&&y<H;}
  function swap(a,b){const t=grid[a];grid[a]=grid[b];grid[b]=t;const q=age[a];age[a]=age[b];age[b]=q;}
  function set(x,y,v){if(inside(x,y)){grid[idx(x,y)]=v;age[idx(x,y)]=0;}}
  function seedBase(){for(let x=0;x<W;x++)if(seeded01(`${ctx.dayKey}|rock|${x}`)>.985)set(x,H-2-Math.floor(seeded01('y'+x)*10),STONE);for(let x=0;x<W;x++)if(seeded01(`${ctx.dayKey}|sand|${x}`)>.94)set(x,H-1,SAND);}
  function update(){
    ticks++;for(let y=H-2;y>=0;y--){const dir=ticks%2?1:-1;for(let xx=0;xx<W;xx++){const x=dir>0?xx:W-1-xx,i=idx(x,y),v=grid[i];if(!v)continue;age[i]=Math.min(255,age[i]+1);
      if(v===SAND){if(grid[idx(x,y+1)]===EMPTY||grid[idx(x,y+1)]===WATER)swap(i,idx(x,y+1));else{const dx=seeded01(`${ticks}|${x}|${y}`)>.5?1:-1;if(inside(x+dx,y+1)&&(grid[idx(x+dx,y+1)]===EMPTY||grid[idx(x+dx,y+1)]===WATER))swap(i,idx(x+dx,y+1));}}
      else if(v===WATER){if(grid[idx(x,y+1)]===EMPTY)swap(i,idx(x,y+1));else{const dx=seeded01(`w|${ticks}|${x}|${y}`)>.5?1:-1;if(inside(x+dx,y)&&grid[idx(x+dx,y)]===EMPTY)swap(i,idx(x+dx,y));}}
      else if(v===SEED){const wet=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>inside(x+dx,y+dy)&&grid[idx(x+dx,y+dy)]===WATER);if(wet&&age[i]>8){grid[i]=PLANT;age[i]=0;}}
      else if(v===PLANT){if(age[i]>12&&seeded01(`p|${ticks}|${x}|${y}`)>.82){const opts=[[0,-1],[-1,0],[1,0]];const [dx,dy]=opts[Math.floor(seeded01(`o|${ticks}|${x}`)*opts.length)%opts.length];if(inside(x+dx,y+dy)&&grid[idx(x+dx,y+dy)]===EMPTY){grid[idx(x+dx,y+dy)]=PLANT;age[idx(x+dx,y+dy)]=0;}}}
      else if(v===FIRE){for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(inside(x+dx,y+dy)&&grid[idx(x+dx,y+dy)]===PLANT&&seeded01(`f|${ticks}|${x}|${y}|${dx}`)>.55)grid[idx(x+dx,y+dy)]=FIRE;if(age[i]>16||seeded01(`die|${ticks}|${x}|${y}`)>.94)grid[i]=EMPTY;}
    }}
  }
  function draw(){const r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,ctx.quality==='high'?2:ctx.quality==='low'?1:1.5),cw=Math.max(320,Math.round(r.width*dpr)),ch=Math.max(240,Math.round(r.height*dpr));if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}c.fillStyle='#0e1117';c.fillRect(0,0,cw,ch);const sx=cw/W,sy=ch/H;let plants=0,water=0,fire=0;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const v=grid[idx(x,y)];if(!v)continue;if(v===PLANT)plants++;if(v===WATER)water++;if(v===FIRE)fire++;c.fillStyle=colors[v];c.fillRect(Math.floor(x*sx),Math.floor(y*sy),Math.ceil(sx+0.4),Math.ceil(sy+0.4));}status.textContent=`${plants} plants · ${water} water · ${fire} fire`;if(plants>=35&&!recorded){recorded=true;ctx.record(`Pocket Garden reached ${plants} plants`);ctx.ping('pop');}}
  function loop(t){if(!alive)return;if(!reduced()&&t-last>34){update();last=t;}draw();raf=requestAnimationFrame(loop);}
  function point(e){const r=canvas.getBoundingClientRect();return {x:Math.floor((e.clientX-r.left)/r.width*W),y:Math.floor((e.clientY-r.top)/r.height*H)};}
  function paint(e){const p=point(e);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(dx*dx+dy*dy<=5)set(p.x+dx,p.y+dy,tool);draw();}
  canvas.addEventListener('pointerdown',e=>{painting=true;canvas.setPointerCapture(e.pointerId);paint(e);});canvas.addEventListener('pointermove',e=>{if(painting)paint(e);});canvas.addEventListener('pointerup',()=>painting=false);canvas.addEventListener('pointercancel',()=>painting=false);
  root.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{tool=Number(b.dataset.tool);root.querySelectorAll('[data-tool]').forEach(x=>{const on=Number(x.dataset.tool)===tool;x.classList.toggle('active',on);x.setAttribute('aria-pressed',String(on));});});
  root.querySelector('#rain').onclick=()=>{for(let x=0;x<W;x+=3+Math.floor(seeded01('rain'+x+ticks)*5))set(x,0,WATER);ctx.ping('ok');};root.querySelector('#clear').onclick=()=>{grid.fill(0);age.fill(0);recorded=false;seedBase();ctx.replay();draw();};root.querySelector('#step').onclick=()=>{update();draw();};root.querySelector('#share').onclick=async()=>{let p=0,w=0;for(const v of grid){if(v===PLANT)p++;if(v===WATER)w++;}ctx.shared(await shareResult({title:meta.title,text:`My Pocket Garden currently has ${p} plant cells and ${w} water cells.`,url:location.href}));};
  const onSettings=e=>{ctx.quality=e.detail?.quality||ctx.quality;draw();};window.addEventListener('funlab:settings',onSettings);seedBase();raf=requestAnimationFrame(loop);
  return()=>{alive=false;cancelAnimationFrame(raf);window.removeEventListener('funlab:settings',onSettings);};
}
