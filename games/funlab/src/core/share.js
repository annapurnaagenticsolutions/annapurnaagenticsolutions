function toBase64Url(text){
  const bytes=new TextEncoder().encode(text);let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
  return btoa(binary).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
}
function fromBase64Url(text){
  let s=text.replaceAll('-','+').replaceAll('_','/');while(s.length%4)s+='=';
  const binary=atob(s),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));return new TextDecoder().decode(bytes);
}
export function encodeChallenge(data){return toBase64Url(JSON.stringify({v:1,...data}));}
export function decodeChallenge(token){try{const x=JSON.parse(fromBase64Url(token));return x&&typeof x==='object'?x:null;}catch{return null;}}
export function challengeUrl(gameId,data){
  const u=new URL(location.href);u.search='';u.hash=`#/${encodeURIComponent(gameId)}?c=${encodeURIComponent(encodeChallenge({gameId,...data}))}`;return u.toString();
}
export function roomUrl(data){const u=new URL(location.href);u.search='';u.hash=`#/room?c=${encodeURIComponent(encodeChallenge({kind:'room',...data}))}`;return u.toString();}
export async function shareResult({title,text,url}){
  if(navigator.share){try{await navigator.share({title,text,url});return 'shared';}catch(e){if(e?.name==='AbortError')return 'cancelled';}}
  const payload=[text,url].filter(Boolean).join('\n');try{await navigator.clipboard.writeText(payload);return 'copied';}catch{return 'failed';}
}
