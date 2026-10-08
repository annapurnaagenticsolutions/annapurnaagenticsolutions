import {lstat,readdir,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {digest} from './pack.mjs';
const ALLOWED=new Set(['report.json','contract.json','observations.json']);
const MAX_SIZES=new Map([['report.json',1024*1024],['contract.json',256*1024],['observations.json',256*1024]]);
export async function verifyEvidencePack(directory) {
  const dir=resolve(directory);
  const dirInfo=await lstat(dir);
  if(dirInfo.isSymbolicLink() || !dirInfo.isDirectory()) throw new Error('Evidence path must be a real directory');
  const entries=await readdir(dir,{withFileTypes:true});
  if(entries.some(entry=>entry.isSymbolicLink() || !entry.isFile())) throw new Error('Evidence package contains a symlink or non-file entry');
  const byName=new Map(entries.map(entry=>[entry.name,entry]));
  if(!byName.has('manifest.json')) throw new Error('Evidence manifest missing');
  const manifestInfo=await lstat(join(dir,'manifest.json'));
  if(manifestInfo.isSymbolicLink() || !manifestInfo.isFile() || manifestInfo.size>64*1024) throw new Error('Evidence manifest is unsafe or too large');
  const manifest=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));
  if(manifest.evidence_version!==1 || !Array.isArray(manifest.artifacts) || typeof manifest.includes_raw_inputs!=='boolean') throw new Error('Unsupported evidence manifest');
  const seen=new Set();
  for(const art of manifest.artifacts) {
    if(!art || typeof art!=='object' || Array.isArray(art) || !ALLOWED.has(art.file) || seen.has(art.file)
      || !Number.isSafeInteger(art.size) || art.size<0 || art.size>MAX_SIZES.get(art.file)
      || !/^[a-f0-9]{64}$/.test(art.sha256)) throw new Error('Unsafe or duplicate artifact path');
    seen.add(art.file);
    const info=await lstat(join(dir,art.file));
    if(info.isSymbolicLink() || !info.isFile()) throw new Error(`Evidence artifact is not a regular file: ${art.file}`);
    const bytes=await readFile(join(dir,art.file));
    if(bytes.length!==art.size || digest(bytes)!==art.sha256) throw new Error(`Evidence mismatch: ${art.file}`);
  }
  const expectedNames=new Set(['manifest.json',...seen]);
  if(byName.size!==expectedNames.size || [...byName.keys()].some(name=>!expectedNames.has(name))) throw new Error('Evidence package contains unlisted files');
  if(!seen.has('report.json')) throw new Error('Report artifact missing');
  if(manifest.includes_raw_inputs !== (seen.has('contract.json') && seen.has('observations.json'))) throw new Error('Raw input coverage mismatch');
  const report=JSON.parse(await readFile(join(dir,'report.json'),'utf8'));
  if(!report || typeof report!=='object' || Array.isArray(report)
    || typeof report.contract_id!=='string' || report.contract_id.length===0
    || !/^[a-f0-9]{64}$/.test(report.contract_sha256) || !/^[a-f0-9]{64}$/.test(report.observation_sha256)
    || !['pass','fail','unknown'].includes(report.outcome)
    || report.contract_id!==manifest.contract_id || report.contract_sha256!==manifest.contract_sha256
    || report.observation_sha256!==manifest.observation_sha256 || report.outcome!==manifest.outcome) throw new Error('Manifest/report identity mismatch');
  return {ok:true,files:seen.size,outcome:manifest.outcome};
}
if(process.argv[1] && import.meta.url===new URL(`file://${resolve(process.argv[1])}`).href) {
  verifyEvidencePack(process.argv[2]).then(r=>console.log(JSON.stringify(r)),e=>{console.error(e.message);process.exitCode=1});
}
