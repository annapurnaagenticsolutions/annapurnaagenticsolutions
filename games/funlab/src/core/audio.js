let ctx=null;
export function ping(enabled,type='ok'){
  if(!enabled) return;
  try{
    ctx ||= new (window.AudioContext||window.webkitAudioContext)();
    const o=ctx.createOscillator();
    const g=ctx.createGain();
    o.type='sine';
    o.frequency.value=type==='bad'?180:type==='pop'?520:320;
    g.gain.setValueAtTime(0.0001,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.06,ctx.currentTime+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.16);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime+0.18);
  }catch{}
}
