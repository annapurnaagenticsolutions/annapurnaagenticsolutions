// Static, synthetic evidence preview. It does not perform Rust/WASM evaluation.
const scenarios=[
  {name:'Apple count mismatch',type:'Counting exercise',outcome:'fail',expected:'4',actual:'5',source:'scene.objects → count',seen:'UI label',explanation:'The label says five, but the structured scene contains only four apple objects. Seeded inconsistency.',contract:'apple_label_matches_scene',assertion:'object_count_consistency'},
  {name:'Correct apple count',type:'Counting exercise',outcome:'pass',expected:'4',actual:'4',source:'scene.objects → count',seen:'UI label',explanation:'The observed count agrees with the structured scene for this labelled fixture.',contract:'apple_label_matches_scene',assertion:'object_count_consistency'},
  {name:'Checkout calculation',type:'Checkout arithmetic',outcome:'fail',expected:'1200',actual:'1300',source:'unit price × quantity',seen:'UI total (minor units)',explanation:'Four items at 300 minor units each should total 1200; the displayed total is 1300.',contract:'checkout_total_matches_lineitems',assertion:'total_minor_consistency'},
  {name:'Correct checkout total',type:'Checkout arithmetic',outcome:'pass',expected:'1200',actual:'1200',source:'unit price × quantity',seen:'UI total (minor units)',explanation:'The calculated total agrees with the displayed total for this fixture.',contract:'checkout_total_matches_lineitems',assertion:'total_minor_consistency'},
  {name:'Missing observation',type:'Incomplete evidence',outcome:'unknown',expected:'4',actual:'—',source:'scene.objects → count',seen:'UI label not found',explanation:'The expected scene count is available, but the label could not be observed. This is UNKNOWN, not PASS.',contract:'apple_label_matches_scene',assertion:'object_count_consistency'},
  {name:'Retry side effect',type:'Workflow integrity',outcome:'fail',expected:'1',actual:'2',source:'intended commits',seen:'persisted order rows',explanation:'The workflow expected one commit but two order rows were recorded after retries. Synthetic fixture.',contract:'retry_idempotence',assertion:'single_effect'}
];
const root=document.getElementById('scenarios');
function show(index) {
  const c=scenarios[index];
  for(const [id,val] of Object.entries({'case-kind':c.type, 'expected':c.expected,'observed':c.actual,'expected-source':c.source,'observed-source':c.seen,'explanation':c.explanation,'contract-id':c.contract,'assertion-id':c.assertion})) document.getElementById(id).textContent=val;
  const status=document.getElementById('case-status');status.textContent=c.outcome.toUpperCase();status.className='status status-'+c.outcome;
  root.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
}
for (let i=0;i<scenarios.length;i++) {
  const b=document.createElement('button');b.type='button';b.className='scenario';b.setAttribute('aria-pressed','false');
  const name=document.createElement('span');name.textContent=scenarios[i].name;
  const state=document.createElement('span');state.className='tiny-status';state.textContent=scenarios[i].outcome.toUpperCase();
  b.append(name,state);b.addEventListener('click',()=>show(i));root.append(b);
}
show(0);
