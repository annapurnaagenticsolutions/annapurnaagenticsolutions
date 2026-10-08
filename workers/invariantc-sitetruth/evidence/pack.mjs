/** Consent-gated local evidence packaging. Artifacts are NOT authenticated attestations. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';

export const digest=(buf)=>createHash('sha256').update(buf).digest('hex');
const MAX_REPORT_BYTES=1024*1024;
const MAX_RAW_INPUT_BYTES=256*1024;

function validReport(report) {
  return report && typeof report==='object' && !Array.isArray(report)
    && typeof report.contract_id==='string' && report.contract_id.length>0
    && /^[a-f0-9]{64}$/.test(report.contract_sha256)
    && /^[a-f0-9]{64}$/.test(report.observation_sha256)
    && ['pass','fail','unknown'].includes(report.outcome);
}

export async function createEvidencePack({reportFile,contractFile=null,observationsFile=null,outDir,includeInputs=false,syntheticOnly=false}) {
  if(!reportFile || !outDir) throw new Error('reportFile and outDir are required');
  if(includeInputs && (!syntheticOnly || !contractFile || !observationsFile)) {
    throw new Error('Including raw inputs requires --synthetic-only and both input files');
  }
  const reportBytes=await readFile(resolve(reportFile));
  if(reportBytes.length>MAX_REPORT_BYTES) throw new Error('Report too large');
  const report=JSON.parse(reportBytes.toString('utf8'));
  if(!validReport(report)) throw new Error('Not an InvariantC report');
  const inputs=[];
  if(includeInputs) {
    for(const [name,path] of [['contract.json',contractFile],['observations.json',observationsFile]]) {
      const bytes=await readFile(resolve(path));
      if(bytes.length>MAX_RAW_INPUT_BYTES) throw new Error(`${name} exceeds the 256 KiB synthetic-input limit`);
      JSON.parse(bytes.toString('utf8'));
      inputs.push([name,bytes]);
    }
  }
  const directory=resolve(outDir);
  await mkdir(directory,{recursive:false}); // fails closed if already exists; no overwrites
  const artifacts=[];
  async function store(name,buf) {
    await writeFile(join(directory,name),buf,{flag:'wx',mode:0o600});
    artifacts.push({file:name,sha256:digest(buf),size:buf.length});
  }
  await store('report.json',reportBytes);
  for(const [name,bytes] of inputs) await store(name,bytes);
  const manifest={
    evidence_version:1,
    contract_id:report.contract_id,
    contract_sha256:report.contract_sha256,
    observation_sha256:report.observation_sha256,
    outcome:report.outcome,
    includes_raw_inputs:includeInputs,
    artifacts,
    notice:'SHA-256 fingerprints detect accidental changes to listed files. They are not signatures and do not prove source authenticity or observation completeness.'
  };
  await writeFile(join(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});
  return manifest;
}

async function main() {
  const a=process.argv.slice(2),opts={};
  for(let i=0;i<a.length;i++) {
    if(a[i]==='--synthetic-only'){opts.syntheticOnly=true;continue;}
    if(a[i]==='--include-inputs'){opts.includeInputs=true;continue;}
    const names={'--report':'reportFile','--contract':'contractFile','--observations':'observationsFile','--out':'outDir'};
    if(!names[a[i]] || !a[i+1]) throw new Error(`Unrecognized or incomplete argument ${a[i]}`);
    opts[names[a[i]]]=a[++i];
  }
  const manifest=await createEvidencePack(opts);
  console.log(`Evidence package written (${manifest.includes_raw_inputs?'synthetic inputs included':'redacted report only'}).`);
}
if(process.argv[1] && import.meta.url===new URL(`file://${resolve(process.argv[1])}`).href) main().catch(e=>{console.error(e.message);process.exitCode=1});
