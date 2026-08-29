const colors={ai:'#2563eb',wonder:'#7c3aed',idea:'#16825d',axon:'#8b5cf6',web:'#d94670',software:'#0891b2'};
const wordMap={ai:'ai',wonder:'wonder',idea:'connected',axon:'ai',web:'web',software:'connected'};
const canvas=document.querySelector('#material-canvas');
let ctx=null,dpr=1,particles=[],raf=0;
const lowPower=(Number(navigator.hardwareConcurrency)||8)<=4||navigator.connection?.saveData===true;
const ease=t=>1-Math.pow(1-t,3);
const rgba=(hex,a)=>{const h=hex.replace('#',''),n=parseInt(h,16);return`rgba(${n>>16},${n>>8&255},${n&255},${a})`};
function resize(){if(!canvas)return;dpr=Math.min(devicePixelRatio||1,1.5);const w=innerWidth,h=Math.max(1,innerHeight-72);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0)}
function targets(id,r,count){
  const out=[],cx=r.left+r.width/2,cy=r.top+r.height/2,w=Math.max(54,r.width*.9),h=Math.max(34,r.height*1.25);
  for(let i=0;i<count;i++){
    let x=cx,y=cy;
    if(id==='ai'){const lane=i%3-1,t=((i*7)%count)/Math.max(1,count-1);x=r.left+r.width*(.08+.84*t);y=cy+lane*11+Math.sin(t*Math.PI*2)*3}
    else if(id==='wonder'){const a=i*2.39996,rr=10+(i%7)*5.2;x=cx+Math.cos(a)*rr;y=cy+Math.sin(a)*rr*.62}
    else if(id==='idea'){const c=i%6,row=Math.floor(i/6);x=cx-w*.34+c*w*.136;y=cy+h*.28-row*8-(c%2)*3}
    else if(id==='axon'){const lane=i%4,t=(Math.floor(i/4)%7)/6;x=cx-w*.43+t*w*.86;y=cy+(lane-1.5)*9}
    else if(id==='web'){const ring=i%3,phase=(Math.floor(i/3)%8)/8,rw=w*(.42-ring*.08),rh=h*(.36-ring*.07),e=Math.floor(phase*4),u=phase*4-e;if(e===0){x=cx-rw+u*rw*2;y=cy-rh}else if(e===1){x=cx+rw;y=cy-rh+u*rh*2}else if(e===2){x=cx+rw-u*rw*2;y=cy+rh}else{x=cx-rw;y=cy+rh-u*rh*2}}
    else{const c=i%6,row=Math.floor(i/6);x=cx-w*.36+c*w*.144;y=cy-h*.28+row*9}
    out.push({x,y});
  }return out;
}
function draw(now){if(!ctx||!canvas){raf=0;return}ctx.clearRect(0,0,innerWidth,Math.max(1,innerHeight-72));ctx.lineCap='round';const alive=[];for(const p of particles){const q=(now-p.start)/p.life;if(q<0||q>1)continue;let x,y,a;if(q<.54){const t=ease(q/.54);x=p.sx+(p.tx-p.sx)*t;y=p.sy+(p.ty-p.sy)*t;a=.22+.76*t}else if(q<.78){const t=(q-.54)/.24,o=(1-t)*3.6;x=p.tx+Math.cos(p.seed+t*6.28)*o;y=p.ty+Math.sin(p.seed+t*6.28)*o*.7;a=.96-t*.17}else{const t=ease((q-.78)/.22);x=p.tx+(p.ex-p.tx)*t;y=p.ty+(p.ey-p.ty)*t;a=.78*(1-t)}if(p.px!=null&&p.i%3===0){ctx.beginPath();ctx.moveTo(p.px,p.py);ctx.lineTo(x,y);ctx.strokeStyle=rgba(p.color,.12*a*p.a);ctx.lineWidth=Math.max(.7,p.r*.52);ctx.stroke()}ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);ctx.fillStyle=rgba(p.color,a*p.a);ctx.fill();if(q>.42&&q<.8&&p.i%4===0){ctx.beginPath();ctx.arc(x,y,p.r+6,0,Math.PI*2);ctx.strokeStyle=rgba(p.color,.11*a);ctx.lineWidth=.9;ctx.stroke()}p.px=x;p.py=y;alive.push(p)}particles=alive;if(alive.length)raf=requestAnimationFrame(draw);else{raf=0;document.body.dataset.materialState='idle'}}
export function launchMaterialResponse(id,kind='interaction'){
  if(!canvas||!colors[id]||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const node=document.querySelector(`.world-node[data-world="${id}"]`),core=document.querySelector('#ecosystem-core'),shell=document.querySelector('.v3-story-shell');if(!node||!core||!shell)return;
  const sr=shell.getBoundingClientRect();if(sr.bottom<72||sr.top>innerHeight)return;
  let word=document.querySelector(`.depth-word[data-word-world="${wordMap[id]||'connected'}"]`),wr=word?.getBoundingClientRect();
  if(!wr||wr.bottom<72||wr.top>innerHeight){word=document.body.dataset.v3Beat==='journey'?document.querySelector('#journey-focus'):document.querySelector('#stage-name');wr=word?.getBoundingClientRect()}
  if(!word||!wr||wr.bottom<72||wr.top>innerHeight)return;
  const nr=node.getBoundingClientRect(),cr=core.getBoundingClientRect(),cls=word.classList.contains('depth-word')?'material-word-active':'material-copy-active';word.classList.add(cls);clearTimeout(word._materialTimer);word._materialTimer=setTimeout(()=>word.classList.remove(cls),kind==='interaction'?1420:860);
  const stage=document.querySelector('.v3-stage');stage?.classList.remove('material-hit','material-settle','material-anticipate');void stage?.offsetWidth;stage?.classList.add('material-anticipate');
  setTimeout(()=>{stage?.classList.remove('material-anticipate');stage?.classList.add('material-hit')},90);
  setTimeout(()=>{stage?.classList.remove('material-hit');stage?.classList.add('material-settle');setTimeout(()=>stage?.classList.remove('material-settle'),560)},kind==='interaction'?820:500);
  if(lowPower&&innerWidth<900)return;if(!ctx)resize();const off=72,count=kind==='interaction'?(lowPower?22:42):(lowPower?14:24),ts=targets(id,{left:wr.left,top:wr.top-off,width:wr.width,height:wr.height},count),sx=nr.left+nr.width/2,sy=nr.top+nr.height/2-off,ex=cr.left+cr.width/2,ey=cr.top+cr.height/2-off,start=performance.now()+90,color=colors[id];
  particles=ts.map((t,i)=>({i,sx:sx+(i%3-1)*2.5,sy:sy+((i*5)%7-3)*1.7,tx:t.x,ty:t.y,ex:ex+(i%5-2)*2.4,ey:ey+((i*3)%5-2)*2.3,r:1.45+(i%4)*.38,a:.66+(i%3)*.1,color,start:start+i*6,life:kind==='interaction'?1580:1120,seed:i*.73,px:null,py:null}));document.body.dataset.materialState='forming';if(!raf)raf=requestAnimationFrame(draw);setTimeout(()=>{if(particles.length)document.body.dataset.materialState='settling'},kind==='interaction'?930:650)
}
addEventListener('resize',resize,{passive:true});resize();
