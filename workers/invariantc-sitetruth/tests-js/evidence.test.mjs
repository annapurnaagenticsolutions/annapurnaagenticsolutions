import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createEvidencePack} from '../evidence/pack.mjs';
import {verifyEvidencePack} from '../evidence/verify.mjs';
function report(){return {contract_id:'sample',contract_sha256:'a'.repeat(64),observation_sha256:'b'.repeat(64),outcome:'fail',summary:{failed:1},results:[{outcome:'fail',code:'R_MISMATCH'}]};}
test('default evidence pack saves report only and verifies',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'invariantc-test-'));
  try {
    const file=join(dir,'report.json');await writeFile(file,JSON.stringify(report()));
    const out=join(dir,'out');const m=await createEvidencePack({reportFile:file,outDir:out});
    assert.equal(m.includes_raw_inputs,false);
    assert.equal(m.artifacts.length,1);
    assert.deepEqual(await verifyEvidencePack(out),{ok:true,files:1,outcome:'fail'});
  } finally{await rm(dir,{recursive:true,force:true});}
});
test('raw-input bundle requires explicit synthetic-only consent',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'invariantc-test-'));
  try {
    const file=join(dir,'report.json');await writeFile(file,JSON.stringify(report()));
    await assert.rejects(()=>createEvidencePack({reportFile:file,outDir:join(dir,'out'),includeInputs:true}));
    const contract=join(dir,'contract.json'),obs=join(dir,'obs.json');
    await writeFile(contract,'{}');await writeFile(obs,'{"sensitive":"synthetic-only"}');
    const out=join(dir,'out');
    await createEvidencePack({reportFile:file,contractFile:contract,observationsFile:obs,outDir:out,includeInputs:true,syntheticOnly:true});
    assert.equal((await verifyEvidencePack(out)).files,3);
    assert.equal((await readFile(join(out,'observations.json'),'utf8')).includes('synthetic-only'),true);
  } finally{await rm(dir,{recursive:true,force:true});}
});
test('detects modified report',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'invariantc-test-'));
  try {
    const file=join(dir,'report.json');await writeFile(file,JSON.stringify(report()));
    const out=join(dir,'out');await createEvidencePack({reportFile:file,outDir:out});
    await writeFile(join(out,'report.json'),'{}');
    await assert.rejects(()=>verifyEvidencePack(out),/Evidence mismatch/);
  } finally{await rm(dir,{recursive:true,force:true});}
});

test('rejects unlisted files in an otherwise valid evidence package',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'invariantc-test-'));
  try {
    const file=join(dir,'report.json');await writeFile(file,JSON.stringify(report()));
    const out=join(dir,'out');await createEvidencePack({reportFile:file,outDir:out});
    await writeFile(join(out,'unexpected.json'),'{}');
    await assert.rejects(()=>verifyEvidencePack(out),/unlisted files/);
  } finally{await rm(dir,{recursive:true,force:true});}
});

test('rejects symlinked evidence artifacts',async(t)=>{
  const dir=await mkdtemp(join(tmpdir(),'invariantc-test-'));
  try {
    const file=join(dir,'report.json');await writeFile(file,JSON.stringify(report()));
    const out=join(dir,'out');await createEvidencePack({reportFile:file,outDir:out});
    await rm(join(out,'report.json'));
    try { await symlink(file,join(out,'report.json')); }
    catch(error) {
      if(['EACCES','EPERM','ENOSYS'].includes(error.code)) { t.skip(`symlink creation unavailable: ${error.code}`); return; }
      throw error;
    }
    await assert.rejects(()=>verifyEvidencePack(out),/symlink/);
  } finally{await rm(dir,{recursive:true,force:true});}
});

test('rejects oversized synthetic inputs before creating a package',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'invariantc-test-'));
  try {
    const file=join(dir,'report.json');await writeFile(file,JSON.stringify(report()));
    const contract=join(dir,'contract.json'),obs=join(dir,'obs.json'),out=join(dir,'out');
    await writeFile(contract,JSON.stringify({tooLarge:'x'.repeat(256*1024)}));await writeFile(obs,'{}');
    await assert.rejects(()=>createEvidencePack({reportFile:file,contractFile:contract,observationsFile:obs,outDir:out,includeInputs:true,syntheticOnly:true}),/256 KiB/);
    await assert.rejects(()=>readFile(join(out,'manifest.json')),{code:'ENOENT'});
  } finally{await rm(dir,{recursive:true,force:true});}
});
