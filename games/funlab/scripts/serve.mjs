import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};

http.createServer((req,res)=>{
  let u=new URL(req.url,'http://localhost');
  let p=decodeURIComponent(u.pathname);
  if(p==='/'||p==='')p='/index.html';
  const f=path.resolve(root,'.'+p);
  if(!f.startsWith(root)){res.writeHead(403);return res.end('Forbidden');}
  fs.readFile(f,(err,data)=>{
    if(err){res.writeHead(404);return res.end('Not found');}
    res.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream','cache-control':'no-cache'});
    res.end(data);
  });
}).listen(port,'127.0.0.1',()=>console.log(`FunLab http://127.0.0.1:${port}`));
