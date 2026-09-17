import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {localFallback,normalizeOutput} from '../src/core/ai-adapter.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const schemas=JSON.parse(fs.readFileSync(path.join(root,'schemas/intelligence.schemas.json'),'utf8')).tasks;
const port=Number(process.env.AI_PORT||8787);
const upstream=process.env.FUNLAB_UPSTREAM_ENDPOINT||'';
const buckets=new Map();
function rateLimited(ip){const now=Date.now(),windowMs=60000,limit=30;let b=buckets.get(ip);if(!b||now-b.start>windowMs)b={start:now,count:0};b.count++;buckets.set(ip,b);return b.count>limit;}

function validate(task,payload){
  const s=schemas[task];if(!s)return 'Unknown task';if(!payload||typeof payload!=='object'||Array.isArray(payload))return 'payload must be an object';
  for(const k of s.required||[])if(!(k in payload))return `Missing ${k}`;
  for(const [k,max] of Object.entries(s.stringMax||{})){if(typeof payload[k]!=='string')return `${k} must be a string`;if(payload[k].length>max)return `${k} exceeds ${max} characters`;}
  for(const [k,[min,max]] of Object.entries(s.numberRange||{})){if(typeof payload[k]!=='number'||!Number.isFinite(payload[k])||payload[k]<min||payload[k]>max)return `${k} must be ${min}-${max}`;}
  return null;
}
async function invoke(task,payload){
  if(upstream){
    const r=await fetch(upstream,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({task,payload}),signal:AbortSignal.timeout(8000)});
    if(!r.ok)throw new Error(`upstream ${r.status}`);
    const raw=await r.json();return {...normalizeOutput(task,raw,payload),_mode:'connected-ai',_provider:'configured-upstream'};
  }
  return {...normalizeOutput(task,localFallback(task,payload),payload),_mode:'server-local',_provider:'reference-server-local'};
}
const server=http.createServer(async(req,res)=>{
  res.setHeader('access-control-allow-origin','*');res.setHeader('access-control-allow-headers','content-type');res.setHeader('access-control-allow-methods','POST,OPTIONS');
  if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
  if(req.method!=='POST'||req.url!=='/funlab-ai'){res.writeHead(404,{'content-type':'application/json'});return res.end(JSON.stringify({error:'not_found'}));}
  if(rateLimited(req.socket.remoteAddress||'local')){res.writeHead(429,{'content-type':'application/json','retry-after':'60'});return res.end(JSON.stringify({error:'rate_limited'}));}
  let body='';req.on('data',c=>{body+=c;if(body.length>12000)req.destroy();});
  req.on('end',async()=>{try{
    const input=JSON.parse(body||'{}'),error=validate(input.task,input.payload);if(error){res.writeHead(400,{'content-type':'application/json'});return res.end(JSON.stringify({error:'invalid_request',message:error}));}
    const out=await invoke(input.task,input.payload);res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(out));
  }catch(e){res.writeHead(502,{'content-type':'application/json'});res.end(JSON.stringify({error:'endpoint_failure',message:String(e.message||e)}));}});
});
server.listen(port,'127.0.0.1',()=>console.log(`FunLab intelligence endpoint http://127.0.0.1:${port}/funlab-ai (${upstream?'upstream configured':'deterministic reference mode'})`));
