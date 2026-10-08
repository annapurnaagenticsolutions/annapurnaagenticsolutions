#!/usr/bin/env node
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const pages=join(dirname(fileURLToPath(import.meta.url)),'pages');
const allowed=new Set(['apples-bad.html','apples-good.html','apples-click.html','apples-unknown.html','cart-bad.html','cart-good.html']);
const port=Number(process.env.PORT||4173);
createServer(async(req,res)=>{
  const name=new URL(req.url||'/',`http://127.0.0.1:${port}`).pathname.slice(1);
  if(!allowed.has(name)){res.writeHead(404,{'content-type':'text/plain','cache-control':'no-store'});res.end('Demo route not found');return;}
  try { const bytes=await readFile(join(pages,name));res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(bytes); }
  catch {res.writeHead(500);res.end('Local file unavailable');}
}).listen(port,'127.0.0.1',()=>console.log(`SiteTruth seeded pages at http://127.0.0.1:${port}/apples-bad.html`));
