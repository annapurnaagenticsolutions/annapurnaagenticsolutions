(()=>{
  'use strict';

  const worlds={
    ai:{name:'AI Solutions',short:'AI',core:'Govern',copy:'AI governance, AgentOps and evaluation systems.',href:'ai-solutions/',color:'#2563eb',facts:['Governance','AgentOps','Evaluation'],state:'Live'},
    wonder:{name:'WonderHub',short:'Wonder',core:'Discover',copy:'Interactive learning worlds built around curiosity, STEM and play.',href:'wonderhub-by-AnnapurnaAgenticSolutions/',color:'#7c3aed',facts:['K-12','STEM','Play'],state:'Live'},
    idea:{name:'Idea Hub',short:'Idea',core:'Enable',copy:'India-first practical digital tools for MSMEs and operators.',href:'idea-hub/',color:'#16825d',facts:['MSME','India-first','Practical'],state:'Developing'},
    axon:{name:'AXON',short:'AXON',core:'Structure',copy:'Typed agent workflows that make tools, memory and flow inspectable.',href:'axon/',color:'#8b5cf6',facts:['DSL','Typed flows','Codegen'],state:'Pre-production'},
    web:{name:'Website Studio',short:'Web',core:'Experience',copy:'Interactive design systems and immersive digital experiences.',href:'website-studio/',color:'#d94670',facts:['Interactive UX','Design systems','Immersive Web'],state:'Live'},
    software:{name:'Software Lab',short:'Lab',core:'Experiment',copy:'Open-source experiments, reference patterns and reusable primitives.',href:'software-lab/',color:'#0891b2',facts:['Open source','Experiments','Patterns'],state:'Experiment'},
    pramana:{name:'Pramana',short:'Pramana',core:'Govern',copy:'Source-grounded AI governance for India\u2019s DPDP Act — cryptographic evidence receipts, policy-as-code enforcement, and 6 live interactive showcases.',href:'pramana/',color:'#0e7490',facts:['DPDP Act','AI Governance','Compliance'],state:'Flagship'}
  };
  const fallbackPresentation={
    ai:{caption:'Governed connections',sceneArchetype:'network',story:'Signals move through policy, evidence and execution boundaries.'},
    wonder:{caption:'Learning constellations',sceneArchetype:'constellation',story:'Questions connect into visual paths that reward exploration.'},
    idea:{caption:'Practical business city',sceneArchetype:'city',story:'Small practical tools assemble into useful operating systems.'},
    axon:{caption:'Typed-flow lanes',sceneArchetype:'lanes',story:'Intent becomes inspectable structure before it reaches execution.'},
    web:{caption:'Experience frames',sceneArchetype:'frames',story:'Information shifts into the visual system best suited to its audience.'},
    software:{caption:'Experimental grid',sceneArchetype:'grid',story:'Small experiments expose patterns that can graduate into reusable systems.'},
    pramana:{caption:'Governed AI evidence',sceneArchetype:'grid',story:'Every compliance decision is source-grounded, policy-gated, and sealed in a cryptographic evidence receipt.'}
  };
  let presentation={...fallbackPresentation};
  let related={ai:['axon','pramana'],wonder:['web','idea'],idea:['software','web'],axon:['ai','software'],web:['wonder','ai'],software:['axon','idea'],pramana:['ai','axon']};
  let phaseRules=[{key:'observing',label:'Observing',minExplored:0},{key:'mapping',label:'Mapping',minExplored:1},{key:'connecting',label:'Connecting',minExplored:3},{key:'constellation',label:'Constellation',minExplored:6}];
  let returnRules=[{key:'first',label:'First encounter',minSessions:1,density:.72},{key:'returning',label:'Returning',minSessions:2,density:.88},{key:'familiar',label:'Familiar',minSessions:4,density:1},{key:'embedded',label:'Embedded',minSessions:7,density:1.12}];
  let maxTrailWorlds=7,sessionGapMinutes=360;
  let publicActivity={repos:0,commits:0,issues:0,intensity:.76,key:'steady'};
  let gesturePolicy={horizontalSwipe:true,minSwipePx:44,verticalTolerancePx:58,corePulse:true,rememberSwipeSelection:true};
  const ids=Object.keys(worlds);
  const nestedPublicPage=/(?:\/about\/|\/contact\/)(?:index\.html)?$/.test(location.pathname);
  const siteHref=path=>nestedPublicPage?`../${String(path).replace(/^\.\//,'')}`:path;
  const siteScript=[...document.scripts].find(s=>/\/assets\/site\.js(?:[?#]|$)/.test(s.src))||document.currentScript;
  const siteRoot=siteScript?.src?new URL('../',siteScript.src):new URL(nestedPublicPage?'../':'./',document.baseURI);
  const siteDataHref=path=>new URL(String(path).replace(/^\.?\//,''),siteRoot).href;
  const $=(s,c=document)=>c.querySelector(s);
  const $$=(s,c=document)=>[...c.querySelectorAll(s)];
  document.documentElement.dataset.js='on';


  // v1.5 sensory governor: reduced motion > save-data/low-power > full.
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowPower=(Number(navigator.hardwareConcurrency)||8)<=4||navigator.connection?.saveData===true;
  document.body.dataset.motion=reducedMotion?'reduced':(lowPower?'minimal':'full');document.documentElement.dataset.motion=document.body.dataset.motion;
  let temporalState={presentation:{label:'Shared rhythm',accentWorld:'pramana',fieldNote:'A neutral shared presentation state is active.'},signals:{weekday:''},authoritativeTimezone:'shared clock'};
  let sensoryModel=null;
  function localMoment(){
    const hour=new Date().getHours();
    if(hour>=5&&hour<11)return{key:'morning',label:'Good morning'};
    if(hour>=11&&hour<17)return{key:'afternoon',label:'Good afternoon'};
    if(hour>=17&&hour<21)return{key:'evening',label:'Good evening'};
    return{key:'night',label:'Welcome'};
  }
  function applyLocalMoment(){
    const m=localMoment();document.body.dataset.localMoment=m.key;
    const el=$('#local-moment');if(el)el.textContent=`${m.label} · Annapurna ecosystem`;
    return m;
  }
  function applyTemporalState(state){
    if(!state?.presentation)return;
    temporalState=state;const p=state.presentation,stage=$('.living-stage');
    document.body.dataset.temporal=p.key||'shared';if(stage)stage.dataset.temporalWorld=p.accentWorld||'pramana';
    if($('#shared-temporal'))$('#shared-temporal').textContent=p.label||'Shared rhythm';
    if($('#shared-field-note'))$('#shared-field-note').textContent=` · ${p.fieldNote||''}`;
    // Shared temporal state only sets the opening visual focus when no stronger visitor signal/trail exists.
    if(location.pathname.endsWith('/')||location.pathname.endsWith('index.html')||!location.pathname.split('/').pop()){
      if(adaptiveDecision?.intent==='explore'&&adaptiveDecision?.source==='default'&&memory?.trail?.length===0&&worlds[p.accentWorld])setWorld(p.accentWorld,'temporal');
    }
  }
  function explainTemporalState(){
    const p=temporalState.presentation||{};
    return`Today's presentation: ${p.fieldNote||'a neutral portfolio focus is active.'}`;
  }
  function mountScrollChoreography(model){
    const beats=Array.isArray(model?.scrollBeats)?model.scrollBeats:[];if(!beats.length)return;
    const elements=beats.map(b=>({b,el:$(b.selector)})).filter(x=>x.el);if(!elements.length)return;
    const apply=entry=>{
      elements.forEach(x=>x.el.dataset.sensoryActive='false');entry.el.dataset.sensoryActive='true';document.body.dataset.scrollBeat=entry.b.key;
      const label=$('#sensory-beat');if(label)label.textContent=entry.b.label;
      const accent=entry.b.accentWorld==='temporal'?temporalState.presentation?.accentWorld:entry.b.accentWorld;
      if(worlds[accent])document.documentElement.style.setProperty('--sensory-accent',worlds[accent].color);
    };
    apply(elements[0]);
    const io=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(!visible)return;
      const hit=elements.find(x=>x.el===visible.target);if(hit)apply(hit);
    },{rootMargin:'-28% 0px -48% 0px',threshold:[0,.15,.35,.6]});
    elements.forEach(x=>io.observe(x.el));
  }
  applyLocalMoment();

  const storageKey='annapurnaLivingV20';
  const legacyKeys=['annapurnaLivingV19','annapurnaLivingV18','annapurnaLivingV17','annapurnaLivingV16','annapurnaLivingV15','annapurnaLivingV14','annapurnaLivingV13','annapurnaLivingV12','annapurnaLivingV11'];
  const now=Date.now();
  let memory={sessionCount:0,lastSessionAt:0,firstSeenAt:now,lastSeenAt:now,trailUpdatedAt:0,explored:[],trail:[],lastWorld:'ai',intent:'explore',intentSource:'default',depth:'standard',depthSource:'model'};
  try{
    const current=JSON.parse(localStorage.getItem(storageKey)||'null');
    let legacy=null;
    for(const key of legacyKeys){
      const parsed=JSON.parse(localStorage.getItem(key)||'null');
      if(parsed){legacy=parsed;break}
    }
    const migrated=!current&&!!legacy;
    memory={...memory,...(legacy||{}),...(current||{})};
    memory.explored=[...new Set(Array.isArray(memory.explored)?memory.explored.filter(x=>worlds[x]):[])];
    memory.trail=[...new Set(Array.isArray(memory.trail)?memory.trail.filter(x=>worlds[x]):memory.explored)].slice(-maxTrailWorlds);
    if(!worlds[memory.lastWorld]) memory.lastWorld='ai';
    if(!['explore','enterprise','learning','msme','design'].includes(memory.intent)) memory.intent='explore';
    if(!['default','explicit','entry','trail','return'].includes(memory.intentSource)) memory.intentSource='default';
    if(!['concise','standard','deep'].includes(memory.depth)) memory.depth='standard';
    if(!['model','explicit'].includes(memory.depthSource)) memory.depthSource='model';
    memory.sessionCount=Math.max(0,Number(memory.sessionCount)||0);
    memory.firstSeenAt=Number(memory.firstSeenAt)||now;
    memory.trailUpdatedAt=Number(memory.trailUpdatedAt)||(memory.trail.length?Number(memory.lastSeenAt)||memory.firstSeenAt:0);
    memory.lastSessionAt=Number(memory.lastSessionAt)||0;
    if(migrated){memory.sessionCount=Math.max(1,memory.sessionCount);memory.lastSessionAt=now}
    if(!memory.lastSessionAt || now-memory.lastSessionAt>sessionGapMinutes*60_000) memory.sessionCount+=1;
    if(memory.sessionCount<1) memory.sessionCount=1;
    memory.lastSessionAt=now;memory.lastSeenAt=now;
    localStorage.setItem(storageKey,JSON.stringify(memory));
    legacyKeys.forEach(k=>localStorage.removeItem(k));
  }catch(_){memory.sessionCount=1}

  function persist(){try{localStorage.setItem(storageKey,JSON.stringify(memory))}catch(_){}}

  const menu=$('.menu-toggle'),mobileNav=$('.mobile-nav');
  function setMobileMenu(open){if(!menu||!mobileNav)return;mobileNav.classList.toggle('open',open);menu.setAttribute('aria-expanded',String(open));if(open)mobileNav.querySelector('a')?.focus()}
  menu?.setAttribute('aria-expanded','false');
  menu?.addEventListener('click',()=>setMobileMenu(!mobileNav?.classList.contains('open')));
  mobileNav?.addEventListener('click',e=>{if(e.target.closest('a'))setMobileMenu(false)});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mobileNav?.classList.contains('open')){setMobileMenu(false);menu?.focus()}});
  document.addEventListener('click',e=>{if(mobileNav?.classList.contains('open')&&!e.target.closest('.mobile-nav')&&!e.target.closest('.menu-toggle'))setMobileMenu(false)});
  $('#reset-memory')?.addEventListener('click',()=>{
    try{localStorage.removeItem(storageKey);legacyKeys.forEach(k=>localStorage.removeItem(k))}catch(_){}
    location.reload();
  });

  function phaseInfo(){
    const n=memory.explored.length;
    return [...phaseRules].sort((a,b)=>a.minExplored-b.minExplored).reduce((chosen,rule)=>n>=rule.minExplored?rule:chosen,phaseRules[0]);
  }
  function returnInfo(){
    const n=Math.max(1,memory.sessionCount||1);
    return [...returnRules].sort((a,b)=>a.minSessions-b.minSessions).reduce((chosen,rule)=>n>=rule.minSessions?rule:chosen,returnRules[0]);
  }

  let activeWorld=memory.lastWorld||'pramana';
  let bursts=[];

  function renderMemory(){
    const phase=phaseInfo(),ret=returnInfo(),stage=$('.living-stage');
    if(stage){stage.dataset.phase=phase.key;stage.dataset.return=ret.key}
    if($('#stage-state')) $('#stage-state').textContent=phase.label.toLowerCase();
    if($('#core-state')) $('#core-state').textContent=phase.label.toLowerCase();
    if($('#phase-count')) $('#phase-count').textContent=phase.label;
    if($('#explored-count')) $('#explored-count').textContent=memory.explored.length;
    if($('#return-label')) $('#return-label').textContent=ret.label;
    $$('.world-node').forEach(n=>n.classList.toggle('visited',memory.explored.includes(n.dataset.world)));
    const msg=$('#stage-memory');
    if(msg){
      if(memory.trail.length){
        const trail=memory.trail.slice(-4).map(id=>worlds[id].short).join(' → ');
        msg.textContent=(memory.sessionCount>1?'Welcome back · ':'Recent path · ')+trail;
      }else msg.textContent=memory.sessionCount>1?'Welcome back · choose a world to continue.':'Choose a world to begin your path.';
    }
    renderContinuityCue();
  }

  function renderContinuityCue(){
    const cue=$('#cta-context');if(!cue)return;
    const ids=(memory.trail?.length?memory.trail.slice(-3):[activeWorld]).filter(id=>worlds[id]);
    const names=ids.map(id=>worlds[id].short);
    cue.textContent=names.length>1?`Current trail · ${names.join(' → ')}`:`Current field · ${names[0]||worlds[activeWorld]?.short||'Annapurna'}`;
  }

  function markInteraction(id){
    memory.lastWorld=id;
    if(!memory.explored.includes(id)) memory.explored.push(id);
    if(memory.trail[memory.trail.length-1]!==id){
      memory.trail=memory.trail.filter(x=>x!==id);memory.trail.push(id);memory.trail=memory.trail.slice(-maxTrailWorlds);
    }
    memory.trailUpdatedAt=now;persist();renderMemory();
  }
  function queueBurst(id,delay=0){if(worlds[id]) bursts.push({id,start:performance.now()+delay})}
  function renderRelated(id){
    const root=$('#related-worlds');if(root) root.innerHTML=(related[id]||[]).map(r=>`<button type="button" data-related="${r}">${escapeHTML(worlds[r].name)}</button>`).join('');
    const copy=$('#relationship-copy');
    if(copy){const names=(related[id]||[]).map(r=>worlds[r].name);copy.textContent=`In this portfolio map, ${worlds[id].name} sits closest to ${names.join(' and ')}.`}
  }
  function renderConnectionGuide(id){
    const targets=(related[id]||[]).filter(x=>worlds[x]),names=targets.map(x=>worlds[x].name);
    const connection=$('#stage-connection'),follow=$('#follow-connection');
    if(connection) connection.textContent=names.length?`Connects with ${names.join(' + ')}`:'Standalone product world';
    if(follow){
      const next=targets[0];follow.disabled=!next;follow.dataset.target=next||'';
      follow.textContent=next?`Follow connection → ${worlds[next].name}`:'No related world';
    }
  }
  function followConnection(){
    const target=$('#follow-connection')?.dataset.target||(related[activeWorld]||[])[0];
    if(!target||!worlds[target])return null;
    setWorld(target,'related');
    const node=$(`.world-node[data-world="${target}"]`);node?.focus({preventScroll:true});
    return target;
  }

  let journeyTimer=0,journeyToken=0;
  function buildJourney(start){
    const out=[start];let cursor=start;
    while(out.length<3){
      const next=(related[cursor]||[]).find(id=>!out.includes(id))||(related[start]||[]).find(id=>!out.includes(id));
      if(!next)break;out.push(next);cursor=next;
    }
    return out;
  }
  function clearJourneyVisual(){
    const stage=$('.living-stage');if(stage)stage.dataset.journey='idle';
    $$('.world-node').forEach(n=>n.classList.remove('journey-path','journey-current','journey-done'));
    $$('#journey-progress i').forEach(d=>d.classList.remove('active','done'));
    const b=$('#trace-journey');if(b){b.disabled=false;b.textContent='Trace connected path'}
  }
  function traceJourney(){
    const path=buildJourney(activeWorld);if(path.length<2)return path;
    clearTimeout(journeyTimer);const token=++journeyToken,stage=$('.living-stage'),button=$('#trace-journey');
    if(stage)stage.dataset.journey='playing';if(button){button.disabled=true;button.textContent='Tracing…'}
    $$('.world-node').forEach(n=>n.classList.toggle('journey-path',path.includes(n.dataset.world)));
    const step=i=>{
      if(token!==journeyToken)return;
      $$('.world-node').forEach(n=>{n.classList.remove('journey-current');if(path.slice(0,i).includes(n.dataset.world))n.classList.add('journey-done')});
      $$('#journey-progress i').forEach((d,j)=>{d.classList.toggle('active',j===i);d.classList.toggle('done',j<i)});
      const id=path[i];setWorld(id,'journey');queueBurst(id,0);const node=$(`.world-node[data-world="${id}"]`);node?.classList.add('journey-current');
      if(i<path.length-1){journeyTimer=setTimeout(()=>step(i+1),reducedMotion||motionMode==='minimal'?180:650)}
      else{journeyTimer=setTimeout(()=>{if(token===journeyToken){if(stage)stage.dataset.journey='complete';if(button){button.disabled=false;button.textContent='Trace again'}$$('#journey-progress i').forEach(d=>{d.classList.remove('active');d.classList.add('done')});setTimeout(clearJourneyVisual,reducedMotion?250:1600)}},reducedMotion?180:520)}
    };
    step(0);return path;
  }
  $('#trace-journey')?.addEventListener('click',()=>traceJourney());

  function renderBehavior(id){
    const meta=presentation[id]||fallbackPresentation[id];
    const viz=$('#behavior-viz');if(viz) viz.className=`behavior-viz ${meta.sceneArchetype}`;
    if($('#stage-behavior')) $('#stage-behavior').textContent=meta.caption;
  }
  let signatureTimer=0;
  function triggerWorldSignature(id,deliberate=false){
    const stage=$('.living-stage');if(!stage)return;
    stage.dataset.signature=id;
    if(!deliberate||reducedMotion)return;
    clearTimeout(signatureTimer);stage.classList.remove('signature-hit');void stage.offsetWidth;stage.classList.add('signature-hit');
    signatureTimer=setTimeout(()=>stage.classList.remove('signature-hit'),900);
  }
  function syncImpactWords(id){
    $$('.depth-word').forEach(el=>{
      const key=el.dataset.wordWorld;el.classList.toggle('is-relevant',key==='connected'||key===id||(id==='axon'&&key==='ai')||(id==='idea'&&key==='wonder'));
    });
  }


  // v3.3 motion grammar: every major physical response follows the same short causal rhythm.
  let motionGrammarTimers=[];
  function runMotionGrammar(scope='world'){
    motionGrammarTimers.forEach(clearTimeout);motionGrammarTimers=[];
    document.body.dataset.motionScope=scope;document.body.dataset.motionPhase='anticipate';
    motionGrammarTimers.push(setTimeout(()=>document.body.dataset.motionPhase='transform',110));
    motionGrammarTimers.push(setTimeout(()=>document.body.dataset.motionPhase='propagate',390));
    motionGrammarTimers.push(setTimeout(()=>document.body.dataset.motionPhase='settle',760));
    motionGrammarTimers.push(setTimeout(()=>{document.body.dataset.motionPhase='idle';delete document.body.dataset.motionScope},1160));
  }

  let materialModulePromise=null;
  function launchMaterialResponse(id,kind='interaction'){
    if(reducedMotion||innerWidth<760||!$('#material-canvas'))return;
    materialModulePromise=materialModulePromise||import('./material.js');
    materialModulePromise.then(m=>m.launchMaterialResponse(id,kind)).catch(()=>{});
  }

  const microScenes={
    ai:{cue:'Open three governed paths',steps:['Policy path opened','Evidence path connected','Execution path reconciled']},
    wonder:{cue:'Connect three learning sparks',steps:['Question discovered','Concept connected','Learning constellation formed']},
    idea:{cue:'Grow three practical blocks',steps:['Need mapped','Tool connected','Delivery corridor formed']},
    axon:{cue:'Route three typed packets',steps:['Intent typed','Tool boundary resolved','Workflow lane completed']},
    web:{cue:'Shape three experience frames',steps:['Audience frame opened','Interaction frame aligned','Experience composition formed']},
    software:{cue:'Activate three experiment cells',steps:['Experiment started','Pattern connected','Reusable grid formed']}
  };

  const consequenceRules={
    ai:[
      {target:'axon',label:'Governance constraints arrived',effect:'policy-bound'},
      {target:'web',label:'Evidence context arrived',effect:'evidence-aware'}
    ],
    wonder:[
      {target:'web',label:'Learning context arrived',effect:'learner-aware'},
      {target:'idea',label:'Curiosity signal arrived',effect:'need-aware'}
    ],
    idea:[
      {target:'software',label:'Prototype need arrived',effect:'experiment-ready'},
      {target:'web',label:'Delivery context arrived',effect:'delivery-aware'}
    ],
    axon:[
      {target:'ai',label:'Typed workflow arrived',effect:'structure-aware'},
      {target:'software',label:'Generated structure arrived',effect:'pattern-ready'}
    ],
    web:[
      {target:'wonder',label:'Experience pattern arrived',effect:'experience-aware'},
      {target:'ai',label:'Interaction context arrived',effect:'explainability-aware'}
    ],
    software:[
      {target:'axon',label:'Experiment pattern arrived',effect:'pattern-aware'},
      {target:'idea',label:'Prototype result arrived',effect:'result-aware'}
    ]
  };
  const emergentComposites=[
    {
      id:'governed-runtime',
      sequence:['ai','axon','software'],
      label:'GOVERNED RUNTIME',
      core:'governed runtime',
      color:'#2563eb',
      route:{title:'Governance becomes runtime structure.',summary:'AI governance, typed agent structure and reusable software patterns converge.',steps:['ai','axon','software'],href:'ai-solutions.html'}
    },
    {
      id:'learning-experience',
      sequence:['wonder','web','ai'],
      label:'ADAPTIVE EXPERIENCE',
      core:'adaptive experience',
      color:'#7c3aed',
      route:{title:'Learning becomes an adaptive experience.',summary:'Learning, experience design and governed AI converge into one path.',steps:['wonder','web','ai'],href:'wonderhub.html'}
    },
    {
      id:'prototype-system',
      sequence:['idea','software','axon'],
      label:'PROTOTYPE → SYSTEM',
      core:'prototype to system',
      color:'#0891b2',
      route:{title:'A practical idea becomes reusable system structure.',summary:'Idea, experimentation and typed architecture converge.',steps:['idea','software','axon'],href:'idea-hub.html'}
    },
    {
      id:'experience-action',
      sequence:['web','wonder','idea'],
      label:'EXPERIENCE → ACTION',
      core:'experience to action',
      color:'#ea580c',
      route:{title:'Experience turns curiosity into practical action.',summary:'Design, learning and practical tools converge into one path.',steps:['web','wonder','idea'],href:'website-studio.html'}
    }
  ];
  const completedCausalTrace=[];
  let activeComposite=null,compositeTimer=0;
  function releaseComposite(){
    const stage=$('.living-stage');if(!activeComposite||!stage)return;
    clearTimeout(compositeTimer);
    stage.classList.remove('composite-emerged');
    delete stage.dataset.composite;
    stage.style.removeProperty('--composite-color');
    $$('.world-node').forEach(n=>n.classList.remove('composite-member'));
    activeComposite=null;
    if($('#core-state'))$('#core-state').textContent='connected portfolio';
    if($('#scene-word'))$('#scene-word').textContent=(worlds[activeWorld]?.core||'connected').toUpperCase();
  }
  function triggerComposite(combo){
    const stage=$('.living-stage');if(!stage)return;
    releaseComposite();
    activeComposite=combo;
    stage.dataset.composite=combo.id;
    stage.style.setProperty('--composite-color',combo.color);
    combo.sequence.forEach(id=>$(`.world-node[data-world="${id}"]`)?.classList.add('composite-member'));
    if($('#scene-word'))$('#scene-word').textContent=combo.label;
    if($('#core-state'))$('#core-state').textContent=combo.core;
    document.documentElement.style.setProperty('--world-accent',combo.color);
    stage.classList.remove('composite-emerged');void stage.offsetWidth;stage.classList.add('composite-emerged');
    combo.sequence.forEach((id,i)=>queueBurst(id,i*150));
    currentFeaturedRoute={...combo.route};renderRoute(currentFeaturedRoute,`composite-${combo.id}`);
    const bottom=$('#adaptive-bottom-primary');if(bottom){bottom.textContent='Follow the composition →';bottom.href=combo.route.href}
    compositeTimer=setTimeout(()=>stage.classList.remove('composite-emerged'),1100);
  }
  function recordWorldCompletion(id,inheritedFrom=null){
    const last=completedCausalTrace.at(-1);
    if(!last||last.world!==id)completedCausalTrace.push({world:id,inheritedFrom});
    if(completedCausalTrace.length>8)completedCausalTrace.splice(0,completedCausalTrace.length-8);
    const matched=emergentComposites.find(combo=>{
      const trace=completedCausalTrace.slice(-3),seq=combo.sequence;
      return trace.length===3&&
        trace[0].world===seq[0]&&
        trace[1].world===seq[1]&&trace[1].inheritedFrom===seq[0]&&
        trace[2].world===seq[2]&&trace[2].inheritedFrom===seq[1];
    });
    if(matched)triggerComposite(matched);
    return matched||null;
  }
  const consequenceState=Object.create(null);
  function consequenceFor(id){return consequenceState[id]||null}
  function refreshConsequenceNodes(){
    $$('.world-node').forEach(node=>{
      const id=node.dataset.world,c=consequenceFor(id);
      node.classList.toggle('has-consequence',Boolean(c));
      node.classList.toggle('consequence-source',Object.values(consequenceState).some(x=>x?.from===id));
      if(c){
        node.dataset.consequenceFrom=c.from;
        node.style.setProperty('--consequence-color',worlds[c.from]?.color||worlds[id]?.color||'#2563eb');
        node.setAttribute('aria-label',`${worlds[id]?.name||id}. Incoming signal from ${worlds[c.from]?.name||c.from}.`);
      }else{
        delete node.dataset.consequenceFrom;
        node.style.removeProperty('--consequence-color');
        node.setAttribute('aria-label',`Preview ${worlds[id]?.name||id}`);
      }
    });
  }
  function propagateConsequences(source){
    const stage=$('.living-stage'),rules=consequenceRules[source]||[];
    rules.forEach((rule,i)=>{
      consequenceState[rule.target]={from:source,target:rule.target,label:rule.label,effect:rule.effect,createdAt:performance.now()};
      queueBurst(rule.target,120+i*180);
      const target=$(`.world-node[data-world="${rule.target}"]`);
      target?.classList.add('signal-target');
      setTimeout(()=>target?.classList.remove('signal-target'),960+i*120);
    });
    refreshConsequenceNodes();
    if(stage){
      stage.classList.remove('consequence-propagating');void stage.offsetWidth;stage.classList.add('consequence-propagating');
      setTimeout(()=>stage.classList.remove('consequence-propagating'),820);
    }
    const cue=$('#micro-cue');
    if(cue&&rules.length) cue.textContent=`Signal carried onward → ${rules.map(r=>worlds[r.target]?.short||r.target).join(' + ')}`;
  }
  function renderInheritedConsequence(id){
    const stage=$('.living-stage'),cue=$('#micro-cue'),incoming=consequenceFor(id);
    if(!stage)return;
    if(incoming){
      stage.dataset.inherited='true';
      stage.dataset.inheritedFrom=incoming.from;
      stage.style.setProperty('--inherited-color',worlds[incoming.from]?.color||worlds[id]?.color||'#2563eb');
      if(cue)cue.textContent=`${incoming.label} from ${worlds[incoming.from]?.name||incoming.from}. Continue the pattern.`;
    }else{
      stage.dataset.inherited='false';
      delete stage.dataset.inheritedFrom;
      stage.style.removeProperty('--inherited-color');
    }
  }
  function consumeConsequence(id){
    const incoming=consequenceFor(id);if(!incoming)return null;
    delete consequenceState[id];refreshConsequenceNodes();
    const stage=$('.living-stage'),sourceNode=$(`.world-node[data-world="${incoming.from}"]`),targetNode=$(`.world-node[data-world="${id}"]`);
    stage?.classList.remove('consequence-integrated');void stage?.offsetWidth;stage?.classList.add('consequence-integrated');
    targetNode?.classList.add('consequence-consumed');setTimeout(()=>targetNode?.classList.remove('consequence-consumed'),760);
    queueBurst(incoming.from,0);queueBurst(id,130);
    setTimeout(()=>stage?.classList.remove('consequence-integrated'),760);
    if(stage){stage.dataset.inherited='false';delete stage.dataset.inheritedFrom;stage.style.removeProperty('--inherited-color')}
    return incoming;
  }
  let microStep=0,microInheritedFrom=null;
  function renderMicroScene(id,activate=false){
    const stage=$('.living-stage'),scene=$('#micro-scene'),cue=$('#micro-cue');if(!stage||!scene)return;
    stage.dataset.microWorld=id;
    stage.dataset.micro=activate?'active':'idle';
    if(activate){microStep=0;microInheritedFrom=null;stage.dataset.microStep='0';stage.dataset.consequenceCommitted='false';scene.hidden=false}
    else if(stage.dataset.micro!=='active'){scene.hidden=true}
    const config=microScenes[id]||microScenes.ai;
    if(cue)cue.textContent=config.cue;
    if(activate)renderInheritedConsequence(id);
    else{stage.dataset.inherited='false';delete stage.dataset.inheritedFrom;stage.style.removeProperty('--inherited-color')}
    $$('.micro-seed').forEach((seed,i)=>{
      seed.classList.toggle('done',i<microStep);
      seed.setAttribute('aria-label',config.steps[i]||`Interact with ${worlds[id]?.name||id}`);
    });
  }
  function activateMicroSeed(index){
    const stage=$('.living-stage'),scene=$('#micro-scene');if(!stage||!scene||stage.dataset.micro!=='active')return;
    const config=microScenes[activeWorld]||microScenes.ai;
    const previousStep=microStep;
    microStep=Math.max(microStep,Math.min(3,index+1));
    stage.dataset.microStep=String(microStep);
    $$('.micro-seed').forEach((seed,i)=>seed.classList.toggle('done',i<microStep));
    const inherited=previousStep===0?consumeConsequence(activeWorld):null;if(inherited)microInheritedFrom=inherited.from;
    const cue=$('#micro-cue');if(cue)cue.textContent=inherited?`${config.steps[microStep-1]} · ${inherited.label} integrated`:(config.steps[microStep-1]||config.cue);
    queueBurst(activeWorld,0);
    (related[activeWorld]||[]).slice(0,microStep).forEach((id,i)=>queueBurst(id,90+i*120));
    const core=$('#ecosystem-core');core?.classList.remove('pulsing');void core?.offsetWidth;core?.classList.add('pulsing');
    setTimeout(()=>core?.classList.remove('pulsing'),620);
    if(microStep===3&&stage.dataset.consequenceCommitted!=='true'){
      stage.dataset.consequenceCommitted='true';
      propagateConsequences(activeWorld);
      recordWorldCompletion(activeWorld,microInheritedFrom);
    }
  }
  $$('.micro-seed').forEach((seed,i)=>seed.addEventListener('click',()=>activateMicroSeed(i)));

  function setWorld(id,source='preview'){
    if(!worlds[id]) return;
    if(activeComposite&&!['interaction','related','swipe'].includes(source))return;
    activeWorld=id;const w=worlds[id],stage=$('.living-stage');
    if(source==='interaction'||source==='related'||source==='swipe'){
      if(activeComposite)releaseComposite();
      if(stage?.dataset.journey==='playing'){journeyToken++;clearTimeout(journeyTimer);clearJourneyVisual()}
      markInteraction(id);
    }
    if(stage){
      stage.dataset.world=id;
      const deliberate=['interaction','related','swipe'].includes(source);
      if(deliberate) stage.dataset.focus='true';
      const framing={ai:['-8px','-3px','-.25deg'],wonder:['7px','-7px','.35deg'],idea:['9px','5px','.15deg'],axon:['0px','8px','-.18deg'],web:['-7px','6px','.28deg'],software:['5px','-1px','-.3deg']}[id]||['0px','0px','0deg'];
      stage.style.setProperty('--scene-x',framing[0]);stage.style.setProperty('--scene-y',framing[1]);stage.style.setProperty('--scene-tilt',framing[2]);
      if(deliberate){
        runMotionGrammar('world');
        stage.classList.remove('world-wake','material-anticipate');void stage.offsetWidth;stage.classList.add('world-wake','material-anticipate');
        setTimeout(()=>stage.classList.remove('material-anticipate'),180);
        setTimeout(()=>stage.classList.remove('world-wake'),780);
      }
    }
    document.documentElement.style.setProperty('--world-accent',w.color);
    document.body.dataset.activeWorld=id;
    document.body.dataset.fieldPhysics=(presentation[id]||fallbackPresentation[id])?.sceneArchetype||'network';
    $$('.world-node').forEach(n=>{const on=n.dataset.world===id,near=(related[id]||[]).includes(n.dataset.world);n.classList.toggle('active',on);n.classList.toggle('resonant',near);n.setAttribute('aria-pressed',String(on))});
    $$('.world-card').forEach(c=>{const on=c.dataset.world===id,near=(related[id]||[]).includes(c.dataset.world);c.classList.toggle('active',on);c.classList.toggle('atlas-related',near);c.setAttribute('aria-pressed',String(on))});
    if($('#stage-kicker')) $('#stage-kicker').textContent=`${w.core} · ${w.state}`;
    if($('#stage-name')) $('#stage-name').textContent=w.name;
    if($('#stage-copy')) $('#stage-copy').textContent=(presentation[id]||fallbackPresentation[id]).story||w.copy;
    if($('#scene-word')) $('#scene-word').textContent=w.core.toUpperCase();
    const stageLink=$('#stage-link');if(stageLink){stageLink.textContent=`Explore ${w.name} →`;stageLink.href=w.href}
    const core=$('.core');if(core) core.style.boxShadow=`0 22px 55px ${rgba(w.color,.16)}, inset 0 0 0 8px #f8fafc`;
    const atlas=$('.v3-atlas');if(atlas){atlas.style.setProperty('--world-accent',w.color);if(['interaction','related'].includes(source)){atlas.classList.remove('material-hit','material-propagate');void atlas.offsetWidth;atlas.classList.add('material-hit');setTimeout(()=>atlas.classList.add('material-propagate'),260);setTimeout(()=>atlas.classList.remove('material-hit','material-propagate'),880)}}
    const insp=$('#world-inspector');
    if(insp){
      insp.style.setProperty('--accent',w.color);$('#inspect-core').textContent=w.core;$('#inspect-name').textContent=w.name;$('#inspect-copy').textContent=w.copy;
      $('#inspect-state').textContent=`Public state: ${w.state}`;$('#inspect-facts').innerHTML=w.facts.map(x=>`<span class="tag">${escapeHTML(x)}</span>`).join('');
      const a=$('#inspect-link');a.href=w.href;a.textContent=`Enter ${w.name} →`;renderRelated(id);
    }
    const deliberate=['interaction','related','swipe'].includes(source);triggerWorldSignature(id,deliberate);syncImpactWords(id);renderMicroScene(id,deliberate);if(deliberate)launchMaterialResponse(id,'interaction');
    renderBehavior(id);renderConnectionGuide(id);queueBurst(id);
    if(['interaction','related','swipe'].includes(source)){
      renderWorldDrivenRoute(id);
      const bottom=$('#adaptive-bottom-primary');if(bottom){bottom.textContent=`Enter ${w.name} →`;bottom.href=w.href}
    }
  }

  $$('.world-node').forEach((n,index)=>{
    n.addEventListener('mouseenter',()=>setWorld(n.dataset.world,'preview'));
    n.addEventListener('focus',()=>setWorld(n.dataset.world,'preview'));
    n.addEventListener('click',()=>{
      const routeIndex=(currentFeaturedRoute?.steps||[]).indexOf(n.dataset.world);
      if(document.body.dataset.v3Beat==='journey'&&routeIndex>=0)activateRouteStep(routeIndex);
      else setWorld(n.dataset.world,'interaction');
    });
    n.addEventListener('keydown',e=>{
      if(!['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(e.key)) return;e.preventDefault();
      const delta=(e.key==='ArrowRight'||e.key==='ArrowDown')?1:-1;$$('.world-node')[(index+delta+ids.length)%ids.length]?.focus();
    });
  });
  $('.living-stage')?.addEventListener('mouseleave',()=>setWorld(memory.lastWorld||'pramana','restore'));
  $$('.world-card').forEach(c=>c.addEventListener('click',()=>setWorld(c.dataset.world,'interaction')));

  // v3.5 spatial governor: Explore owns a dedicated narrative rail and a collision-safe field.
  const atlasBasePositions={
    ai:[.10,.24],wonder:[.78,.18],idea:[.84,.55],axon:[.47,.84],web:[.10,.69],software:[.46,.08],pramana:[.86,.86]
  };
  function governAtlasLayout(){
    const atlas=$('.v3-atlas');if(!atlas||innerWidth<=760)return;
    const rect=atlas.getBoundingClientRect(),nodes=$$('.v3-atlas .atlas-node');if(rect.width<200||rect.height<300)return;
    const core=$('.v3-atlas-core'),coreRect=core?.getBoundingClientRect();
    const placed=[];
    nodes.forEach(node=>{
      const base=atlasBasePositions[node.dataset.world]||[.5,.5];
      const nr=node.getBoundingClientRect(),w=Math.max(86,nr.width),h=Math.max(38,nr.height);
      let x=base[0]*rect.width-w/2,y=base[1]*rect.height-h/2;
      const pad=22;x=Math.max(pad,Math.min(rect.width-w-pad,x));y=Math.max(pad,Math.min(rect.height-h-pad,y));
      if(coreRect){
        const localCore={left:coreRect.left-rect.left-36,right:coreRect.right-rect.left+36,top:coreRect.top-rect.top-34,bottom:coreRect.bottom-rect.top+34};
        const intersects=x+w>localCore.left&&x<localCore.right&&y+h>localCore.top&&y<localCore.bottom;
        if(intersects){
          const cx=x+w/2,cy=y+h/2,mcx=(localCore.left+localCore.right)/2,mcy=(localCore.top+localCore.bottom)/2;
          const dx=cx-mcx,dy=cy-mcy,mag=Math.max(1,Math.hypot(dx,dy)),push=72;
          x+=dx/mag*push;y+=dy/mag*push;x=Math.max(pad,Math.min(rect.width-w-pad,x));y=Math.max(pad,Math.min(rect.height-h-pad,y));
        }
      }
      for(const prev of placed){
        const overlap=x+w+14>prev.x&&x<prev.x+prev.w+14&&y+h+12>prev.y&&y<prev.y+prev.h+12;
        if(overlap){y=Math.min(rect.height-h-pad,prev.y+prev.h+18)}
      }
      node.style.setProperty('--atlas-left',`${Math.round(x)}px`);node.style.setProperty('--atlas-top',`${Math.round(y)}px`);node.dataset.layoutGoverned='true';
      placed.push({x,y,w,h});
    });
    atlas.dataset.layoutGoverned='true';
  }
  let atlasLayoutTick=false;
  const requestAtlasLayout=()=>{if(atlasLayoutTick)return;atlasLayoutTick=true;requestAnimationFrame(()=>{atlasLayoutTick=false;governAtlasLayout()})};
  addEventListener('resize',requestAtlasLayout,{passive:true});
  if($('.v3-atlas')){requestAtlasLayout();setTimeout(requestAtlasLayout,80)}

  $('#related-worlds')?.addEventListener('click',e=>{const b=e.target.closest('[data-related]');if(b)setWorld(b.dataset.related,'related')});
  $('#follow-connection')?.addEventListener('click',()=>followConnection());

  const coreAction=$('#ecosystem-core');
  coreAction?.addEventListener('click',()=>{
    if(!gesturePolicy.corePulse) return;
    const stage=$('.living-stage');
    if(stage?.dataset.micro==='active'&&microStep<3) activateMicroSeed(microStep);
    const targets=related[activeWorld]||[];targets.forEach((id,i)=>queueBurst(id,i*130));
    targets.forEach((id,i)=>setTimeout(()=>{const n=$(`.world-node[data-world="${id}"]`);n?.classList.add('signal-target');setTimeout(()=>n?.classList.remove('signal-target'),850)},i*120));
    coreAction.classList.add('pulsing');setTimeout(()=>coreAction.classList.remove('pulsing'),720);
    const b=$('#stage-behavior'),original=(presentation[activeWorld]||fallbackPresentation[activeWorld]).caption;
    if(b){b.textContent=`Connection pulse → ${targets.map(id=>worlds[id].short).join(' + ')}`;setTimeout(()=>{if(activeWorld&&b)b.textContent=(presentation[activeWorld]||fallbackPresentation[activeWorld]).caption},1100)}
  });

  setWorld(memory.lastWorld||'pramana','restore');renderMemory();

  // v3.0: discrete camera-like story beats. Content scrolls; the same environment persists.
  const v3StoryBeats=$$('[data-v3-beat]');
  if(v3StoryBeats.length){
    document.body.dataset.v3Beat='establish';
    const applyStoryBeat=beat=>{
      document.body.dataset.v3Beat=beat;
      const label=$('#sensory-beat');
      if(label)label.textContent=beat==='journey'?'Trace':beat==='focus'?'Enter':'Explore';
      if((beat==='focus'||beat==='journey')&&document.body.dataset.materialBeat!==beat){document.body.dataset.materialBeat=beat;runMotionGrammar(beat);setTimeout(()=>launchMaterialResponse(activeWorld,'scroll'),160)}
      const path=(currentFeaturedRoute?.steps||[]);
      $$('.world-node').forEach(n=>n.classList.toggle('journey-path',beat==='journey'&&path.includes(n.dataset.world)));
      if(beat==='journey')requestAnimationFrame(syncRouteGeometry);
    };
    if('IntersectionObserver' in window){
      const observer=new IntersectionObserver(entries=>{
        const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
        if(visible)applyStoryBeat(visible.target.dataset.v3Beat||'establish');
      },{rootMargin:'-28% 0px -34% 0px',threshold:[.08,.3,.58]});
      v3StoryBeats.forEach(el=>observer.observe(el));
    }
    let storyTick=false;
    addEventListener('scroll',()=>{
      if(storyTick)return;storyTick=true;
      requestAnimationFrame(()=>{
        storyTick=false;
        const shell=$('.v3-story-shell'),stage=$('.v3-stage');if(!shell||!stage)return;
        const r=shell.getBoundingClientRect(),span=Math.max(1,shell.offsetHeight-innerHeight);
        const p=Math.max(0,Math.min(1,-r.top/span));
        stage.style.setProperty('--v3-story-progress',String(p));
        stage.style.setProperty('--atmo-y',`${(p-.5)*7}px`);
      });
    },{passive:true});
  }

  const v3Cta=$('.v3-cta');
  if(v3Cta&&'IntersectionObserver' in window){
    new IntersectionObserver(([entry])=>{
      if(!entry.isIntersecting||entry.intersectionRatio<.28)return;
      v3Cta.classList.remove('arrival-active');void v3Cta.offsetWidth;v3Cta.classList.add('arrival-active');
      runMotionGrammar('cta');setTimeout(()=>v3Cta.classList.remove('arrival-active'),1250);
    },{threshold:[.28,.52]}).observe(v3Cta);
  }

  // v1.4 adaptive structure: real local signals -> inspectable rule decision -> DOM composition.
  const adaptiveFallback={
    intents:{
      explore:{label:'Explore all',primaryWorld:'pramana',depth:'standard',structuralOrder:['living'],focusOrder:['ai','learning','experience'],worldOrder:['pramana','ai','wonder','idea','axon','web','software'],labOrder:['runtime','axon','design'],summary:'Balanced view across the Annapurna ecosystem, with Pramana — our flagship DPDP governance product — leading.',reason:'No stronger intent signal is active, so the site keeps a balanced company view with Pramana as the flagship entry point.',primaryCta:{label:'Explore the ecosystem →',href:'explore.html'},secondaryCta:{label:'Open Interactive Lab',href:'lab.html'}},
      enterprise:{label:'Enterprise AI',primaryWorld:'ai',depth:'deep',structuralOrder:['living'],focusOrder:['ai','experience','learning'],worldOrder:['pramana','ai','axon','software','web','wonder','idea'],labOrder:['runtime','axon','design'],summary:'Governance, agent infrastructure and inspectable AI systems first.',reason:'This view prioritizes AI governance, AXON structure, evidence and enterprise interaction patterns.',primaryCta:{label:'Explore AI systems →',href:'explore.html#world=ai'},secondaryCta:{label:'Inspect evidence',href:'evidence.html'}},
      learning:{label:'Learning',primaryWorld:'wonder',depth:'standard',structuralOrder:['living'],focusOrder:['learning','experience','ai'],worldOrder:['wonder','web','idea','ai','software','axon','pramana'],labOrder:['design','runtime','axon'],summary:'Learning worlds, visual exploration and progressive interaction first.',reason:'This view starts with WonderHub and learning-oriented experience design, then exposes the enabling systems underneath.',primaryCta:{label:'Explore learning worlds →',href:'wonderhub-by-AnnapurnaAgenticSolutions/'},secondaryCta:{label:'Open Interactive Lab',href:'lab.html'}},
      msme:{label:'MSME tools',primaryWorld:'idea',depth:'standard',structuralOrder:['living'],focusOrder:['learning','experience','ai'],worldOrder:['idea','software','web','ai','wonder','axon','pramana'],labOrder:['design','runtime','axon'],summary:'Practical India-first tools and delivery experience first.',reason:'This view prioritizes Idea Hub and practical product delivery before infrastructure detail.',primaryCta:{label:'Explore practical tools →',href:'idea-hub/'},secondaryCta:{label:'Explore products',href:'explore.html#world=idea'}},
      design:{label:'Design & web',primaryWorld:'web',depth:'standard',structuralOrder:['living'],focusOrder:['experience','learning','ai'],worldOrder:['web','wonder','software','ai','idea','axon','pramana'],labOrder:['design','runtime','axon'],summary:'Interactive interfaces, immersive design and browser-native experiences first.',reason:'This view brings experience design forward, then shows the product families it connects.',primaryCta:{label:'Explore Website Studio →',href:'website-studio/'},secondaryCta:{label:'Try Interactive Lab',href:'lab.html'}}
    }
  };
  let adaptiveModel=adaptiveFallback,adaptiveDecision={intent:'explore',source:'default',reason:adaptiveFallback.intents.explore.reason},perceivedModel=null;
  const worldIntent={ai:'enterprise',axon:'enterprise',pramana:'enterprise',wonder:'learning',idea:'msme',web:'design',software:'design'};
  const perfMetrics={lcp:null,interactionMax:null,longTaskTotal:0,domContentLoaded:null,load:null};
  window.__livingMetrics=perfMetrics;
  try{
    if('PerformanceObserver' in window){
      if(PerformanceObserver.supportedEntryTypes?.includes('largest-contentful-paint')) new PerformanceObserver(list=>{const e=list.getEntries().at(-1);if(e)perfMetrics.lcp=Math.round(e.startTime)}).observe({type:'largest-contentful-paint',buffered:true});
      if(PerformanceObserver.supportedEntryTypes?.includes('event')) new PerformanceObserver(list=>list.getEntries().forEach(e=>{if(e.duration>=16)perfMetrics.interactionMax=Math.max(perfMetrics.interactionMax||0,Math.round(e.duration))})).observe({type:'event',durationThreshold:16,buffered:true});
      if(PerformanceObserver.supportedEntryTypes?.includes('longtask')) new PerformanceObserver(list=>list.getEntries().forEach(e=>perfMetrics.longTaskTotal+=Math.round(e.duration))).observe({type:'longtask',buffered:true});
    }
    addEventListener('load',()=>{const n=performance.getEntriesByType('navigation')[0];if(n){perfMetrics.domContentLoaded=Math.round(n.domContentLoadedEventEnd);perfMetrics.load=Math.round(n.loadEventEnd)}},{once:true});
  }catch(_){}

  function referrerIntent(){
    try{const u=new URL(document.referrer);if(u.origin!==location.origin)return null;const path=u.pathname.toLowerCase();if(path.includes('website-studio'))return'design';if(path.includes('wonderhub'))return'learning';if(path.includes('idea-hub'))return'msme';if(path.includes('/axon')||path.includes('agentops')||path.includes('ai-solutions'))return'enterprise'}catch(_){}return null;
  }
  function trailIntent(){
    const recent=memory.trail.slice(-3).map(id=>worldIntent[id]).filter(Boolean);if(recent.length<2)return null;
    const counts=recent.reduce((a,x)=>(a[x]=(a[x]||0)+1,a),{}),ranked=Object.entries(counts).sort((a,b)=>b[1]-a[1]);return ranked[0]?.[1]>=2?ranked[0][0]:null;
  }
  function deriveIntent(){
    const params=new URLSearchParams(location.search),entry=params.get('intent');
    if(adaptiveModel.intents?.[entry])return{intent:entry,source:'entry',reason:'The entry URL requested this view.'};
    if(memory.intentSource==='explicit'&&adaptiveModel.intents?.[memory.intent])return{intent:memory.intent,source:'explicit',reason:'You explicitly selected this view on this device.'};
    const ref=referrerIntent();if(ref&&adaptiveModel.intents?.[ref])return{intent:ref,source:'entry',reason:'The page you arrived from is related to this area.'};
    const trail=trailIntent();if(trail&&adaptiveModel.intents?.[trail])return{intent:trail,source:'trail',reason:'Your recent deliberate world selections lean toward this area.'};
    if(memory.sessionCount>1&&worldIntent[memory.lastWorld]&&adaptiveModel.intents?.[worldIntent[memory.lastWorld]])return{intent:worldIntent[memory.lastWorld],source:'return',reason:'This is a return session, so the site restored the area you last explored.'};
    return{intent:'explore',source:'default',reason:adaptiveModel.intents.explore.reason};
  }
  function applyDepth(level,source='model'){
    const safe=['concise','standard','deep'].includes(level)?level:'standard';document.body.dataset.depth=safe;
    if(source==='explicit'){memory.depth=safe;memory.depthSource='explicit';persist()}
  }
  function setCta(id,cta){const a=$(id);if(a&&cta){a.textContent=cta.label;a.href=cta.href}}
  const adaptiveSourceLabels={default:'default view',explicit:'your choice',entry:'entry path',trail:'recent exploration',return:'return visit',system:'system rule'};
  const blockLabels={living:'connected journey'};
  function adaptationResponseText(config){
    const world=worlds[config.primaryWorld]?.name||'relevant world',depth=(document.body.dataset.depth||config.depth||'standard');
    const cta=config.primaryCta?.label?.replace(/\s*→$/,'')||'relevant next step';
    if(adaptiveDecision.source==='default') return 'Explore across the portfolio, or choose a focus to bring one path forward.';
    return `Changed for ${config.label}: ${world} first · ${depth} detail · ${cta}.`;
  }
  function renderLivingReceipt(config){
    if(!config)return;
    const intent=$('#receipt-intent'),mem=$('#receipt-memory'),temporal=$('#receipt-temporal'),copy=$('#receipt-response');
    if(intent)intent.textContent=config.label;
    const title=$('#receipt-title');if(title)title.textContent=adaptiveDecision.source==='default'?'Current route':'Route updated';
    if(mem)mem.textContent=`${returnInfo().label} · ${adaptiveSourceLabels[adaptiveDecision.source]||adaptiveDecision.source}`;
    if(temporal)temporal.textContent=temporalState.presentation?.label||'Current shared state';
    if(copy)copy.textContent=adaptationResponseText(config);
    const receipt=$('#living-receipt');if(receipt){receipt.classList.remove('responding');void receipt.offsetWidth;receipt.classList.add('responding');setTimeout(()=>receipt.classList.remove('responding'),520)}
    const cue=$('#first-visit-cue');if(cue){const show=(perceivedModel?.firstVisit?.showCue??true)&&memory.sessionCount===1&&memory.explored.length===0&&memory.intentSource!=='explicit';cue.hidden=!show;if(show&&perceivedModel?.firstVisit?.cue)cue.textContent=perceivedModel.firstVisit.cue}
  }
  function animateStructuralResponse(source){
    if(source!=='explicit'||reducedMotion||motionMode==='minimal')return;
    $$('[data-adaptive-block]').forEach((el,i)=>{el.classList.remove('structure-shift');setTimeout(()=>{el.classList.add('structure-shift');setTimeout(()=>el.classList.remove('structure-shift'),520)},i*55)});
  }
  function renderCrossPageContext(config){
    document.body.dataset.adaptiveIntent=adaptiveDecision.intent||'explore';
    document.body.dataset.returnState=returnInfo().key||'first';
    $('#adaptive-context')?.remove();
  }
  function reorderAdaptivePages(config){
    const main=$('main'),cta=$('.cta');if(main&&cta)config.structuralOrder.forEach((key,i)=>{const el=$(`[data-adaptive-block="${key}"]`);if(!el)return;el.dataset.adaptiveRank=i;el.classList.toggle('is-priority',i===0);if(!el.closest('[data-structural-anchor]')&&el.parentElement===main)main.insertBefore(el,cta)});
    const focus=$('.focus-grid');if(focus)config.focusOrder.forEach((key,i)=>{const card=focus.querySelector(`[data-family="${key}"]`);if(card){focus.appendChild(card);card.classList.toggle('is-priority',i===0)}});
    const worldGrid=$('.world-card-grid');if(worldGrid&&Array.isArray(config.worldOrder))config.worldOrder.forEach((key,i)=>{const card=worldGrid.querySelector(`[data-world="${key}"]`);if(card){worldGrid.appendChild(card);card.classList.toggle('is-priority',i===0)}});
    const labGrid=$('.lab-grid');if(labGrid&&Array.isArray(config.labOrder))config.labOrder.forEach((key,i)=>{const card=labGrid.querySelector(`[data-sim-card="${key}"]`);if(card){labGrid.appendChild(card);card.classList.toggle('is-priority',i===0)}});
  }
  const featuredRoutes={
    explore:{title:'A connected portfolio, from governance to experiences.',summary:'Move between the product worlds and follow the relationships that connect them — starting with Pramana, our flagship DPDP governance product.',steps:['pramana','ai','web'],href:'explore.html'},
    enterprise:{title:'Governed AI from structure to experience.',summary:'Start with governance, move through typed agent structure, then see how the system is surfaced to users.',steps:['ai','axon','web'],href:'explore.html#world=ai'},
    learning:{title:'Learning worlds connected to experience design.',summary:'Move from interactive learning into the experience patterns and practical tools that help it reach real users.',steps:['wonder','web','idea'],href:'wonderhub-by-AnnapurnaAgenticSolutions/'},
    msme:{title:'Practical tools from idea to delivery.',summary:'Follow an India-first product idea through software experimentation and the interface that delivers it.',steps:['idea','software','web'],href:'idea-hub/'},
    design:{title:'Experience design connected to real product systems.',summary:'Start with Website Studio, then follow the learning and software worlds that make the interaction useful.',steps:['web','wonder','software'],href:'website-studio/'}
  };
  const worldDrivenRoutes={
    ai:{title:'Governed AI connects structure to experience.',steps:['ai','axon','web']},
    wonder:{title:'Learning connects curiosity to experience and practical use.',steps:['wonder','web','idea']},
    idea:{title:'Practical ideas connect experimentation to delivery.',steps:['idea','software','web']},
    axon:{title:'Typed agent structure connects governance to software patterns.',steps:['axon','ai','software']},
    web:{title:'Experience design connects learning to governed systems.',steps:['web','wonder','ai']},
    software:{title:'Experiments connect structure to practical products.',steps:['software','axon','idea']},
    pramana:{title:'Governed AI connects statutory grounding to evidence-led execution.',steps:['pramana','ai','axon']}
  };
  let activeRouteIndex=0,currentFeaturedRoute=featuredRoutes.explore;

  // v3.5 route geometry: Journey annotates and connects the existing world nodes instead of drawing duplicate product nodes.
  function syncRouteGeometry(){
    const stage=$('.v3-stage'),track=$('#route-track'),svg=track?.querySelector('.route-curve'),path=svg?.querySelector('path');
    if(!stage||!track||!svg||!path||!currentFeaturedRoute?.steps?.length)return;
    const sr=stage.getBoundingClientRect();if(sr.width<120||sr.height<120)return;
    const points=[];
    $$('.v3-stage .world-node').forEach(n=>{delete n.dataset.routeOrder;n.classList.remove('route-current','route-past')});
    currentFeaturedRoute.steps.forEach((id,i)=>{
      const node=$(`.v3-stage .world-node[data-world="${id}"]`);if(!node)return;
      node.dataset.routeOrder=String(i+1);node.classList.toggle('route-current',i===activeRouteIndex);node.classList.toggle('route-past',i<activeRouteIndex);
      const r=node.getBoundingClientRect();points.push({x:r.left-sr.left+5,y:r.top-sr.top+r.height/2,id});
    });
    if(points.length<2)return;
    svg.setAttribute('viewBox',`0 0 ${Math.round(sr.width)} ${Math.round(sr.height)}`);
    const p0=points[0],p1=points[1],p2=points[2]||points[1];
    const c01x=p0.x+(p1.x-p0.x)*.52,c12x=p1.x+(p2.x-p1.x)*.48;
    path.setAttribute('d',`M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} C ${c01x.toFixed(1)} ${p0.y.toFixed(1)}, ${c01x.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} C ${c12x.toFixed(1)} ${p1.y.toFixed(1)}, ${c12x.toFixed(1)} ${p2.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`);
    const current=points[Math.min(activeRouteIndex,points.length-1)],signal=$('#route-signal');
    if(signal&&current){track.style.setProperty('--signal-x',`${current.x}px`);track.style.setProperty('--signal-y',`${current.y}px`)}
    $$('.v3-route-overlay .route-node').forEach((n,i)=>{n.tabIndex=-1;n.setAttribute('aria-hidden','true');n.dataset.routeMarker=String(i+1)});
  }
  function renderWorldDrivenRoute(id){
    const base=worldDrivenRoutes[id];if(!base)return;
    currentFeaturedRoute={title:base.title,summary:`Follow how ${worlds[id].name} moves through its closest portfolio relationships.`,steps:base.steps,href:worlds[id].href};
    renderRoute(currentFeaturedRoute,`world-${id}`);
  }
  function renderRoute(route,key='custom'){
    if($('#route-title'))$('#route-title').textContent=route.title;if($('#route-summary'))$('#route-summary').textContent=route.summary;
    route.steps.forEach((id,i)=>{const el=$(`#route-step-${i+1}`);if(el)el.textContent=worlds[id]?.name||id});
    const link=$('#route-primary-link');if(link)link.href=route.href;
    const track=$('#route-track');if(track){track.dataset.intent=key;track.dataset.route=route.steps.join('-');track.style.setProperty('--route-position','0%')}
    const focus=$('#journey-focus'),copy=$('#journey-step-copy');if(focus)focus.textContent=worlds[route.steps[0]]?.name||route.steps[0];if(copy)copy.textContent=(presentation[route.steps[0]]||fallbackPresentation[route.steps[0]])?.story||worlds[route.steps[0]]?.copy||'';
    activeRouteIndex=0;$$('.route-node').forEach((n,i)=>n.classList.toggle('active',i===0));
    requestAnimationFrame(syncRouteGeometry);
  }
  function renderFeaturedRoute(intent){
    currentFeaturedRoute=featuredRoutes[intent]||featuredRoutes.explore;
    renderRoute(currentFeaturedRoute,intent);
  }
  function activateRouteStep(index){
    const route=currentFeaturedRoute||featuredRoutes.explore;const i=Math.max(0,Math.min(route.steps.length-1,index));activeRouteIndex=i;
    $$('.route-node').forEach((n,j)=>n.classList.toggle('active',j===i));const track=$('#route-track');if(track)track.style.setProperty('--route-position',`${i*50}%`);
    const id=route.steps[i],focus=$('#journey-focus'),copy=$('#journey-step-copy'),note=$('.v2-journey-note');
    if(focus&&id)focus.textContent=worlds[id]?.name||id;
    if(copy&&id){note?.classList.add('is-changing');setTimeout(()=>{copy.textContent=(presentation[id]||fallbackPresentation[id])?.story||worlds[id]?.copy||'';note?.classList.remove('is-changing')},90)}
    if(id)setWorld(id,'preview');requestAnimationFrame(syncRouteGeometry);return id;
  }
  $('#route-track')?.addEventListener('click',e=>{const n=e.target.closest('.route-node');if(n)activateRouteStep(Number(n.dataset.routeIndex)||0)});

  (function mountRouteScroll(){
    const section=$('#living-response'),track=$('#route-track');if(!section||!track||reducedMotion)return;let manualUntil=0,ticking=false;
    track.addEventListener('pointerdown',()=>{manualUntil=performance.now()+2200},{passive:true});
    const update=()=>{ticking=false;if(performance.now()<manualUntil)return;const r=section.getBoundingClientRect(),span=Math.max(1,r.height-innerHeight*.45);const p=Math.max(0,Math.min(1,(innerHeight*.58-r.top)/span));const i=p<.34?0:p<.68?1:2;if(i!==activeRouteIndex)activateRouteStep(i)};
    addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(update)}},{passive:true});update();
  })();
  addEventListener('resize',()=>requestAnimationFrame(syncRouteGeometry),{passive:true});

  function applyIntent(intent,source='system',remember=false){
    const config=adaptiveModel.intents?.[intent]||adaptiveModel.intents?.explore||adaptiveFallback.intents.explore;
    adaptiveDecision={intent,source,reason:config.reason};document.body.dataset.intent=intent;
    if(remember){memory.intent=intent;memory.intentSource='explicit';persist()}
    const depth=memory.depthSource==='explicit'?memory.depth:config.depth;applyDepth(depth,'model');
    const chooser=$('#intent-chooser');if(chooser)chooser.hidden=false;
    $$('.intent-options [data-intent]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.intent===intent)));
    if($('#intent-label'))$('#intent-label').textContent=config.label;
    if($('#intent-summary'))$('#intent-summary').textContent=config.summary;
    if($('#adaptive-rationale'))$('#adaptive-rationale').textContent=config.summary;
    setCta('#adaptive-primary',config.primaryCta);setCta('#adaptive-secondary',config.secondaryCta);setCta('#adaptive-bottom-primary',config.primaryCta);setCta('#adaptive-bottom-secondary',config.secondaryCta);
    reorderAdaptivePages(config);setWorld(config.primaryWorld,'preview');renderFeaturedRoute(intent);renderLivingReceipt(config);renderCrossPageContext(config);animateStructuralResponse(source);
    document.body.classList.remove('adaptive-flash');void document.body.offsetWidth;document.body.classList.add('adaptive-flash');setTimeout(()=>document.body.classList.remove('adaptive-flash'),680);
    return config;
  }
  function selectIntent(intent){if(!adaptiveModel.intents?.[intent])return;applyIntent(intent,'explicit',true);const cue=$('#first-visit-cue');if(cue)cue.hidden=true;agentSay(`${adaptiveModel.intents[intent].label} is now in focus. ${adaptiveModel.intents[intent].summary}`)}
  function explainCurrentView(){const config=adaptiveModel.intents?.[adaptiveDecision.intent]||adaptiveFallback.intents.explore;const world=worlds[config.primaryWorld]?.name||'the most relevant product';return`${config.label}: ${world} is shown first because ${adaptiveDecision.reason.toLowerCase()} Detail is ${document.body.dataset.depth||config.depth}.`;}
  function highlightElement(target){
    let el=typeof target==='string'?$(target):target;if(!el&&worlds[target])el=$(`[data-world="${target}"]`);if(!el)return false;
    $$('.agent-highlight').forEach(x=>x.classList.remove('agent-highlight'));el.classList.add('agent-highlight');el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'center'});setTimeout(()=>el.classList.remove('agent-highlight'),2600);return true;
  }
  function filterContent(intent){selectIntent(intent);const primary=(adaptiveModel.intents?.[intent]||{}).primaryWorld;if(primary){setWorld(primary,'preview');highlightElement(`[data-world="${primary}"]`)}return intent}
  function navigateToSection(target){
    const routes={home:siteHref('./'),products:siteHref('explore.html'),explore:siteHref('explore.html'),lab:siteHref('lab.html'),evidence:siteHref('evidence.html'),about:siteHref('about/'),contact:siteHref('contact/'),capabilities:siteHref('explore.html'),living:'#living-response'};const href=routes[target]||target;
    if(href.startsWith('#')){const el=$(href);if(el)el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});return href}navigateWithContinuity(href);return href;
  }
  function adjustDepth(level){applyDepth(level,'explicit');agentSay(`Showing ${level} detail.`);return level}
  window.AnnapurnaPageAgent={filterContent,navigateToSection,highlightElement,explainCurrentView,explainTemporalState,adjustDepth,setWorld,followConnection,activateRouteStep,activateLabMode};

  function agentSay(text){const out=$('#agent-output');if(out)out.textContent=text}
  function performanceSummary(){const m=perfMetrics;return`Local performance view — LCP: ${m.lcp??'pending'} ms; max observed interaction: ${m.interactionMax??'pending'} ms; long tasks: ${m.longTaskTotal} ms. Nothing is sent to a server.`}
  function handleAgentCommand(raw){
    const q=String(raw||'').trim().toLowerCase();if(!q)return'Ask for a page action, for example “show AI governance” or “why this view”.';
    if(q.includes('why today')||q.includes('today')||q.includes('shared rhythm'))return explainTemporalState();
    if(q.includes('runtime integrity')||q==='runtime'){activateLabMode('runtime');return'Runtime Integrity is now active.'}
    if(q.includes('axon structure')||q.includes('typed workflow')){activateLabMode('axon');return'AXON Structure is now active.'}
    if(q.includes('website studio')&&location.pathname.endsWith('lab.html')){activateLabMode('design');return'Website Studio is now active.'}
    if(q.includes('emergent')||q.includes('composition')||q.includes('combined scene')){
      if(activeComposite)return`Current composition: ${activeComposite.core}. It emerged from ${activeComposite.sequence.map(id=>worlds[id].name).join(' → ')}.`;
      return'No composite scene is active. Complete a connected three-world sequence to reveal one.';
    }
    if(q.includes('continue signal')||q.includes('incoming signal')||q.includes('follow consequence')){
      const target=Object.keys(consequenceState)[0];
      if(target){setWorld(target,'interaction');return`Continued the signal into ${worlds[target].name}.`}
      return'No cross-world signal is waiting right now. Complete a world pattern first.';
    }
    if(q.includes('next step')||q.includes('next route')){const id=activateRouteStep((activeRouteIndex+1)%3);return id?`Moved to ${worlds[id].name}.`:'No next route step is available.'}
    if(q.includes('follow connection')||q.includes('related world')||q==='follow'){const target=followConnection();return target?`Followed the portfolio connection to ${worlds[target].name}.`:'No related world is available from here.'}
    if(q.includes('focus conflict')||q==='conflict')return focusEvidenceConflict();
    if(q.includes('why')||q.includes('explain'))return contextualExplanation();
    if(q.includes('less detail')||q.includes('concise')){adjustDepth('concise');return'Condensed the current page.'}
    if(q.includes('more detail')||q.includes('deep')||q.includes('technical')){adjustDepth('deep');return'Expanded the current page where deeper material is available.'}
    if(q.includes('performance')||q.includes('speed'))return performanceSummary();
    if(q.includes('github')){window.open('https://github.com/annapurnaagenticsolutions','_blank','noopener');return'Opening the Annapurna GitHub organization.'}
    if(q.includes('contact')||q.includes('email us')){navigateToSection('contact');return'Opening Contact.'}
    if(q.includes('about us')||q==='about'){navigateToSection('about');return'Opening About.'}
    if(q.includes('production-ready'))return'Public “Live” labels are not treated as production-readiness evidence. Open Evidence to inspect source-local maturity claims.';
    if(q.includes('evidence')||q.includes('source')){navigateToSection('evidence');return'Opening Evidence.'}
    if(q.includes('living lab')||q.includes('interactive lab')||q==='lab'||q.includes('simulation')){navigateToSection('lab');return'Opening Interactive Lab.'}
    if(q.includes('product')||q.includes('explore')){navigateToSection('products');return'Opening the product explorer.'}
    if(q.includes('axon')){setWorld('axon','preview');highlightElement('[data-world="axon"]');return'AXON highlighted. It is described here as pre-production; inspect Evidence for the source path.'}
    if(q.includes('learning')||q.includes('education')||q.includes('stem')||q.includes('wonder')){filterContent('learning');return'Adapted toward learning worlds.'}
    if(q.includes('msme')||q.includes('small business')||q.includes('idea hub')){filterContent('msme');return'Adapted toward practical MSME tools.'}
    if(q.includes('design')||q.includes('website')||q.includes('experience')){filterContent('design');return'Design and interactive web experiences are now in focus.'}
    if(q.includes('govern')||q.includes('enterprise')||q.includes('agent')||q.includes('runtime')){filterContent('enterprise');return'Adapted toward enterprise AI, governance and agent infrastructure.'}
    if(q.includes('reset')||q.includes('balanced')||q.includes('all')){filterContent('explore');return'Balanced company view restored.'}
    return'Try: AI governance, learning, MSME tools, design, follow connection, continue signal, composition, less detail, more detail, products, interactive lab, evidence, or performance.';
  }
  function mountAgent(){
    if($('#page-agent')||!document.body)return;
    const launcher=document.createElement('button');launcher.className='agent-launcher';launcher.type='button';launcher.id='agent-launcher';launcher.setAttribute('aria-expanded','false');launcher.textContent='Guide';
    const panel=document.createElement('aside');panel.className='page-agent';panel.id='page-agent';panel.hidden=true;panel.setAttribute('aria-label','Annapurna guide');panel.innerHTML=`<div class="agent-head"><div><strong>Annapurna Guide</strong><small>Focus · navigate · compare</small></div><button class="agent-close" type="button" aria-label="Close guide">×</button></div><div class="agent-body"><p class="agent-output" id="agent-output" aria-live="polite">Tell me what you want to explore. I can focus this page, move to a product, or show evidence.</p><div class="agent-actions"><button type="button" data-agent-action="follow">Follow connection</button><button type="button" data-agent-action="enterprise">AI governance</button><button type="button" data-agent-action="concise">Less detail</button><button type="button" data-agent-action="evidence">Evidence</button></div><form class="agent-form" id="agent-form"><input id="agent-input" autocomplete="off" aria-label="Tell the guide what to do" placeholder="e.g. show me AI governance"><button type="submit">Go</button></form><small class="agent-note">Your page preferences stay on this device.</small></div>`;
    document.body.append(panel,launcher);
    const toggle=open=>{panel.hidden=!open;launcher.setAttribute('aria-expanded',String(open));if(open)$('#agent-input')?.focus()};launcher.addEventListener('click',()=>toggle(panel.hidden));panel.querySelector('.agent-close').addEventListener('click',()=>toggle(false));
    panel.addEventListener('click',e=>{const a=e.target.closest('[data-agent-action]');if(!a)return;const key=a.dataset.agentAction;const map={follow:'follow connection',enterprise:'show AI governance',concise:'less detail',evidence:'show evidence'};agentSay(handleAgentCommand(map[key]))});
    $('#agent-form')?.addEventListener('submit',e=>{e.preventDefault();const input=$('#agent-input');agentSay(handleAgentCommand(input.value));input.select()});
  }
  $$('#intent-chooser [data-intent]').forEach(b=>b.addEventListener('click',()=>selectIntent(b.dataset.intent)));
  $('#why-view')?.addEventListener('click',()=>{mountAgent();$('#page-agent').hidden=false;$('#agent-launcher').setAttribute('aria-expanded','true');agentSay(explainCurrentView())});
  $('#inspect-response')?.addEventListener('click',()=>{mountAgent();$('#page-agent').hidden=false;$('#agent-launcher').setAttribute('aria-expanded','true');agentSay(explainCurrentView())});
  $('#temporal-why')?.addEventListener('click',()=>{mountAgent();$('#page-agent').hidden=false;$('#agent-launcher').setAttribute('aria-expanded','true');agentSay(explainTemporalState())});
  mountAgent();
  configureAgentActions();mountPageContext();mountNavigationContinuity();
  const hashWorld=worldFromHash();if(hashWorld&&$('.v3-atlas'))setTimeout(()=>setWorld(hashWorld,'resume'),60);
  const needsLivingModels=document.body.matches('.v2-home,.v3-home,.v3-explore');
  if(needsLivingModels)(async()=>{
    const [model,temporal,sensory,perceived]=await Promise.all([loadJSON('data/adaptive-model.json'),loadJSON('data/temporal-state.json'),loadJSON('data/sensory-model.json'),loadJSON('data/perceived-liveness-model.json')]);
    if(model?.intents)adaptiveModel=model;if(perceived)perceivedModel=perceived;
    const decision=deriveIntent();adaptiveDecision=decision;const config=applyIntent(decision.intent,decision.source,false);
    if(temporal)applyTemporalState(temporal);renderLivingReceipt(config);renderCrossPageContext(config);
    if(sensory){sensoryModel=sensory;mountScrollChoreography(sensory)}
  })();

  if(needsLivingModels)(async()=>{
    const [model,worldData]=await Promise.all([loadJSON('data/interaction-model.json'),loadJSON('data/world-presentation.json')]);
    if(model){
      if(model.connections) related=model.connections;
      if(Array.isArray(model.phases)&&model.phases.length) phaseRules=model.phases;
      if(Array.isArray(model.returnStates)&&model.returnStates.length) returnRules=model.returnStates;
      if(Number(model.storage?.maxTrailWorlds)>0) maxTrailWorlds=Number(model.storage.maxTrailWorlds);
      if(Number(model.sessionPolicy?.gapMinutes)>0) sessionGapMinutes=Number(model.sessionPolicy.gapMinutes);
      if(model.gestures) gesturePolicy={...gesturePolicy,...model.gestures};
    }
    if(Array.isArray(worldData?.worlds)){
      presentation={...presentation,...Object.fromEntries(worldData.worlds.map(x=>[x.id,{caption:x.caption,sceneArchetype:x.sceneArchetype,story:x.story}]))};
    }
    renderMemory();renderRelated(activeWorld);renderBehavior(activeWorld);
  })();

  // v2.0 continuity field: one restrained ambient system follows world + section state.
  function mountContinuityField(){
    if(!document.querySelector('.site-ambient')){const a=document.createElement('div');a.className='site-ambient';a.setAttribute('aria-hidden','true');a.innerHTML='<i></i><i></i><i></i>';document.body.prepend(a)}
    const sections=[...document.querySelectorAll('main > section')];
    if('IntersectionObserver'in window&&sections.length){
      const io=new IntersectionObserver(entries=>{const hit=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(!hit)return;document.body.dataset.sceneSection=hit.target.id||hit.target.classList[0]||'section'}, {rootMargin:'-30% 0px -45% 0px',threshold:[.1,.3,.55]});sections.forEach(s=>io.observe(s));
    }
  }
  mountContinuityField();

  // v1.9 immersive choreography: spatial depth is driven only by pointer/scroll/user state.
  function mountHeroChoreography(){
    const hero=$('.home-hero'),stage=$('.living-stage');if(!hero||!stage)return;let ticking=false;
    const update=()=>{ticking=false;const r=hero.getBoundingClientRect();const span=Math.max(1,r.height+innerHeight*.35);const progress=Math.max(0,Math.min(1,(-r.top+innerHeight*.08)/span));
      stage.style.setProperty('--scroll-shift',`${progress*14}px`);stage.style.setProperty('--scroll-depth',`${progress*18}px`);stage.style.setProperty('--scroll-scale',String(1-progress*.018));
      stage.dataset.immersiveBeat=progress<.22?'establish':progress<.5?'approach':progress<.78?'connect':'handoff';document.body.dataset.depthBeat=stage.dataset.immersiveBeat;document.documentElement.style.setProperty('--handoff-progress',String(Math.max(0,Math.min(1,(progress-.58)/.42))));
    };
    const onScroll=()=>{if(reducedMotion||motionMode==='minimal')return;if(!ticking){ticking=true;requestAnimationFrame(update)}};
    addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll,{passive:true});update();
  }
  mountHeroChoreography();

  // Living ecosystem renderer: connections + world-specific visual physics + return-state density.
  const canvas=$('#living-canvas');
  if(canvas){
    const ctx=canvas.getContext('2d'),stage=canvas.parentElement,reduced=reducedMotion;
    let dpr=Math.min(devicePixelRatio||1,2),pointer={x:.5,y:.45,inside:false},raf=0,swipe=null,stageVisible=true,lastFrame=0;
    function resize(){const r=canvas.getBoundingClientRect();canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);if(reduced)draw(performance.now(),true)}
    function pointOf(el){const sr=stage.getBoundingClientRect(),r=el.getBoundingClientRect();if(stage.classList.contains('v2-stage')&&el.classList.contains('world-node'))return{x:r.left-sr.left+5,y:r.top-sr.top+r.height/2};return{x:r.left-sr.left+r.width/2,y:r.top-sr.top+r.height/2}}
    function curve(a,b,bend=0){const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,dx=b.x-a.x,dy=b.y-a.y,len=Math.max(1,Math.hypot(dx,dy));return{cx:mx-dy/len*bend,cy:my+dx/len*bend}}
    function bez(a,c,b,t){const u=1-t;return{x:u*u*a.x+2*u*t*c.cx+t*t*b.x,y:u*u*a.y+2*u*t*c.cy+t*t*b.y}}
    function line(a,b,color,width=1,alpha=1,bend=0,dash=[]){const c=curve(a,b,bend);ctx.save();ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo(c.cx,c.cy,b.x,b.y);ctx.strokeStyle=rgba(color,alpha);ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.restore();return c}
    function circle(x,y,r,color,alpha){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=rgba(color,alpha);ctx.fill()}
    function drawSignature(now,center){
      const meta=presentation[activeWorld]||fallbackPresentation[activeWorld],color=worlds[activeWorld].color,density=returnInfo().density*publicActivity.intensity,alpha=.09*density,t=now*.00035*(.88+publicActivity.intensity*.22);
      ctx.save();ctx.strokeStyle=rgba(color,alpha);ctx.fillStyle=rgba(color,alpha);ctx.lineWidth=1;
      if(meta.sceneArchetype==='network'){
        for(let i=0;i<6;i++){const a=i*Math.PI/3+t*.12,r=52+(i%2)*18,x=center.x+Math.cos(a)*r,y=center.y+Math.sin(a)*r*.72;line(center,{x,y},color,.8,alpha*.9,0);circle(x,y,2.2,color,alpha*2.1)}
      }else if(meta.sceneArchetype==='constellation'){
        for(let i=0;i<12;i++){const a=i*2.399+t*.08,r=38+(i%5)*12,x=center.x+Math.cos(a)*r,y=center.y+Math.sin(a)*r*.62;circle(x,y,1.4+(i%3)*.4,color,alpha*(1.5+(Math.sin(t+i)+1)*.45))}
      }else if(meta.sceneArchetype==='city'){
        const heights=[22,34,26,48,31,20,38];heights.forEach((bh,i)=>{const x=center.x-72+i*22,y=center.y+58-bh;ctx.fillStyle=rgba(color,alpha*.85);ctx.fillRect(x,y,13,bh);ctx.strokeStyle=rgba(color,alpha*1.3);ctx.strokeRect(x+.5,y+.5,12,bh-1)});
      }else if(meta.sceneArchetype==='lanes'){
        for(let i=-2;i<=2;i++){const y=center.y+i*18;ctx.beginPath();ctx.moveTo(center.x-92,y);ctx.lineTo(center.x+92,y);ctx.stroke();const px=center.x-82+((t*42+i*31)%164);circle(px,y,1.8,color,alpha*2.1)}
      }else if(meta.sceneArchetype==='frames'){
        for(let i=0;i<4;i++){const w=82+i*28,h=48+i*18;ctx.strokeStyle=rgba(color,alpha*(1.25-i*.12));ctx.strokeRect(center.x-w/2,center.y-h/2,w,h)}
      }else{
        for(let y=-2;y<=2;y++)for(let x=-3;x<=3;x++){const on=(x+y+Math.floor(t))%4===0;circle(center.x+x*22,center.y+y*20,on?2.3:1.25,color,alpha*(on?2:.9))}
      }
      ctx.restore();
    }
    function draw(now,once=false){
      if(!once&&!stageVisible){raf=0;return}
      if(!once&&lowPower&&now-lastFrame<32){raf=requestAnimationFrame(draw);return}lastFrame=now;
      const r=canvas.getBoundingClientRect(),w=r.width,h=r.height;ctx.clearRect(0,0,w,h);
      const coreEl=$('#ecosystem-core')||$('.core');if(!coreEl)return;const center=pointOf(coreEl);
      const nodeEls=Object.fromEntries(ids.map(id=>[id,$(`.world-node[data-world="${id}"]`)]).filter(([,el])=>el));
      const points=Object.fromEntries(Object.entries(nodeEls).map(([id,el])=>[id,pointOf(el)]));
      if(pointer.inside){const g=ctx.createRadialGradient(pointer.x*w,pointer.y*h,0,pointer.x*w,pointer.y*h,95);g.addColorStop(0,rgba(worlds[activeWorld].color,.05));g.addColorStop(1,rgba(worlds[activeWorld].color,0));ctx.fillStyle=g;ctx.fillRect(0,0,w,h)}
      drawSignature(now,center);
      const density=returnInfo().density*publicActivity.intensity;
      ids.forEach((id,i)=>{
        const p=points[id];if(!p)return;const selected=id===activeWorld,bend=((i%2)?1:-1)*(10+(i%3)*5);
        const c=line(center,p,worlds[id].color,selected?1.45:.75,(selected?.34:.085)*density,bend);
        const phase=((now*.000035*(1+(i%3)*.16)*(.82+publicActivity.intensity*.34))+i*.17)%1,packet=bez(center,c,p,phase);
        circle(packet.x,packet.y,selected?2.7:1.65,worlds[id].color,(selected?.78:.28)*density);
      });
      if(memory.trail.length>1)memory.trail.slice(-5).forEach((id,i,arr)=>{if(i===0)return;const a=points[arr[i-1]],b=points[id];if(a&&b)line(a,b,worlds[id].color,1,.16*density,0,[3,6])});
      Object.values(consequenceState).forEach((cause,i)=>{
        const a=points[cause.from],b=points[cause.target];if(!a||!b)return;
        const color=worlds[cause.from]?.color||worlds[cause.target]?.color||'#2563eb';
        const cc=line(a,b,color,1.25,.24*density,(i%2?1:-1)*8,[4,7]);
        const phase=((now*.000095)+(i*.31))%1,p=bez(a,cc,b,phase);
        circle(p.x,p.y,2.7,color,.72*density);
      });
      if(activeComposite){
        const seq=activeComposite.sequence,pts=seq.map(id=>points[id]).filter(Boolean);
        if(pts.length===3){
          const color=activeComposite.color;
          for(let i=0;i<3;i++){
            const a=pts[i],b=pts[(i+1)%3],cc=line(a,b,color,1.6,.34*density,(i-1)*7,[2,5]);
            const phase=((now*.00011)+(i*.28))%1,p=bez(a,cc,b,phase);
            circle(p.x,p.y,3.2,color,.82*density);
          }
          const cx=(pts[0].x+pts[1].x+pts[2].x)/3,cy=(pts[0].y+pts[1].y+pts[2].y)/3;
          circle(cx,cy,4.2,color,.24+.12*Math.sin(now*.003));
        }
      }
      bursts=bursts.filter(b=>now-b.start<950);
      bursts.forEach(b=>{
        if(now<b.start||!points[b.id])return;const elapsed=Math.min(1,(now-b.start)/720),c=curve(center,points[b.id],12),p=bez(center,c,points[b.id],easeOut(elapsed));
        circle(p.x,p.y,3.6+(1-elapsed)*2.5,worlds[b.id].color,.9*(1-elapsed*.35));
      });
      if(!once)raf=requestAnimationFrame(draw);
    }
    stage.addEventListener('pointermove',e=>{const r=stage.getBoundingClientRect();pointer={x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height,inside:true};stage.style.setProperty('--px',`${pointer.x*100}%`);stage.style.setProperty('--py',`${pointer.y*100}%`);stage.style.setProperty('--atmo-x',`${(pointer.x-.5)*12}px`);stage.style.setProperty('--atmo-y',`${(pointer.y-.5)*9}px`);stage.style.setProperty('--core-x',`${(pointer.x-.5)*4}px`);stage.style.setProperty('--core-y',`${(pointer.y-.5)*3}px`);document.documentElement.style.setProperty('--word-shift-x',`${(pointer.x-.5)*2.4}px`);document.documentElement.style.setProperty('--word-shift-y',`${(pointer.y-.5)*1.8}px`)});
    stage.addEventListener('pointerleave',()=>{pointer.inside=false;stage.style.removeProperty('--px');stage.style.removeProperty('--py');stage.style.setProperty('--atmo-x','0px');stage.style.setProperty('--atmo-y','0px');stage.style.setProperty('--core-x','0px');stage.style.setProperty('--core-y','0px');document.documentElement.style.setProperty('--word-shift-x','0px');document.documentElement.style.setProperty('--word-shift-y','0px')});
    stage.addEventListener('pointerdown',e=>{if(!gesturePolicy.horizontalSwipe||!['touch','pen'].includes(e.pointerType))return;swipe={x:e.clientX,y:e.clientY,id:e.pointerId}});
    stage.addEventListener('pointerup',e=>{
      if(!swipe||e.pointerId!==swipe.id)return;const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;swipe=null;
      if(Math.abs(dx)>=gesturePolicy.minSwipePx&&Math.abs(dy)<=gesturePolicy.verticalTolerancePx){const i=ids.indexOf(activeWorld),delta=dx<0?1:-1;setWorld(ids[(i+delta+ids.length)%ids.length],gesturePolicy.rememberSwipeSelection?'swipe':'preview')}
    });
    stage.addEventListener('pointercancel',()=>{swipe=null});
    if('IntersectionObserver'in window)new IntersectionObserver(([entry])=>{stageVisible=entry.isIntersecting;if(stageVisible&&!reduced&&!raf)raf=requestAnimationFrame(draw)},{rootMargin:'120px'}).observe(stage);
    addEventListener('resize',resize,{passive:true});resize();if(!reduced)raf=requestAnimationFrame(draw);
  }

  function animateCard(name){
    const card=$(`[data-sim-card="${name}"]`);if(!card)return;card.classList.remove('is-changing');void card.offsetWidth;card.classList.add('is-changing');setTimeout(()=>card.classList.remove('is-changing'),520)
  }

  function activateLabMode(mode,source='interaction'){
    const safe=['runtime','axon','design'].includes(mode)?mode:'runtime';
    document.body.dataset.labMode=safe;
    const theatre=$('.v3-lab-theatre');if(theatre&&source==='interaction'){runMotionGrammar('lab');theatre.classList.remove('material-hit','state-propagate');void theatre.offsetWidth;theatre.classList.add('material-hit');setTimeout(()=>theatre.classList.add('state-propagate'),250);setTimeout(()=>theatre.classList.remove('material-hit','state-propagate'),780)}
    $$('.v3-lab-modes [data-lab-mode]').forEach(b=>{const on=b.dataset.labMode===safe;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});
    $$('[data-sim-card]').forEach(card=>card.classList.toggle('active-lab',card.dataset.simCard===safe));
    if(source==='interaction'){
      const card=$(`[data-sim-card="${safe}"]`);card?.classList.remove('is-changing');void card?.offsetWidth;card?.classList.add('is-changing');setTimeout(()=>card?.classList.remove('is-changing'),480);
      const contextWorld={runtime:'ai',axon:'axon',design:'web'}[safe];if(contextWorld)markInteraction(contextWorld);
    }
  }
  $$('.v3-lab-modes [data-lab-mode]').forEach(b=>b.addEventListener('click',()=>activateLabMode(b.dataset.labMode)));
  if($('.v3-lab-modes [data-lab-mode]'))activateLabMode('runtime','init');
  const runtimeStates={
    healthy:{label:'ALLOW',meter:'',steps:[['Context','ok'],['Policy','ok'],['Tool','ok'],['Recovery','ok']],text:'Execution allowed: evidence complete.',feedback:'Healthy path is active.'},
    context:{label:'BLOCK + RECOVER',meter:'warn',steps:[['Context','fail'],['Policy','warn'],['Tool','dim'],['Recovery','ok']],text:'Context blocked; recovery path preserves safe state.',feedback:'Context fault changes the path before tool execution.'},
    tool:{label:'ISOLATE',meter:'fail',steps:[['Context','ok'],['Policy','ok'],['Tool','fail'],['Recovery','warn']],text:'Tool failure isolated; retry/rollback path prepared.',feedback:'Tool failure is isolated and recovery becomes active.'}
  };
  $$('[data-runtime]').forEach(b=>b.addEventListener('click',()=>{
    $$('[data-runtime]').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-pressed','false')});b.classList.add('active');b.setAttribute('aria-pressed','true');
    const s=runtimeStates[b.dataset.runtime];document.body.dataset.runtimeState=b.dataset.runtime;runMotionGrammar('runtime');$('#runtime-flow').innerHTML=s.steps.map(([n,k],i)=>`<div class="flow-step ${k==='ok'?'':k}" style="--i:${i}"><span>${n}</span><i></i></div>`).join('');
    $('#runtime-outcome').textContent=s.text;$('#runtime-feedback').textContent=s.feedback;const meter=$('.runtime-meter');if(meter){meter.className=`runtime-meter ${s.meter}`;$('#runtime-state').textContent=s.label}animateCard('runtime');
  }));

  const axonPresets={
    support:{code:'agent SupportAgent\n  tools: [knowledge, ticket]\n  memory: scoped\nflow triage -> answer -> handoff',graph:['Intent','SupportAgent','2 tools','Handoff'],feedback:'Support reshapes the graph around triage and handoff.'},
    research:{code:'agent ResearchAgent\n  tools: [search, sources]\n  memory: session\nflow question -> retrieve -> verify -> synthesize',graph:['Question','ResearchAgent','2 tools','Synthesize'],feedback:'Research introduces retrieval, verification and synthesis.'},
    compliance:{code:'agent ComplianceAgent\n  tools: [policy, evidence]\n  memory: restricted\nflow intake -> classify -> approve -> record',graph:['Intake','ComplianceAgent','2 tools','Record'],feedback:'Compliance tightens memory and adds an explicit approval path.'}
  };
  $$('[data-axon]').forEach(b=>b.addEventListener('click',()=>{
    $$('[data-axon]').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-pressed','false')});b.classList.add('active');b.setAttribute('aria-pressed','true');
    const p=axonPresets[b.dataset.axon];document.body.dataset.axonState=b.dataset.axon;runMotionGrammar('axon');$('#axon-code').textContent=p.code;$('#axon-graph').innerHTML=p.graph.map((x,i)=>`<span style="--i:${i}">${escapeHTML(x)}</span>`).join('');$('#axon-feedback').textContent=p.feedback;animateCard('axon');
  }));

  const designModes={
    enterprise:{outcome:'Dense information, restrained motion, clear evidence hierarchy.',eyebrow:'TRUSTED SYSTEMS',headline:'Complex systems, made inspectable.',copy:'Evidence-first architecture for enterprise teams.',action:'Explore platform',feedback:'Enterprise mode prioritizes evidence density and restraint.'},
    education:{outcome:'Friendly pacing, visual hints, progressive disclosure and play.',eyebrow:'LEARN BY EXPLORING',headline:'Turn curiosity into a path.',copy:'Visual journeys that reward experimentation and discovery.',action:'Start exploring',feedback:'Education mode increases guidance, pacing and visual invitation.'},
    luxury:{outcome:'Editorial whitespace, controlled typography and deliberate interaction.',eyebrow:'CRAFTED EXPERIENCE',headline:'Quiet detail, deliberate movement.',copy:'A restrained digital environment shaped around the object.',action:'Discover collection',feedback:'Luxury mode shifts emphasis toward whitespace and deliberate reveal.'}
  };
  $$('[data-design]').forEach(b=>b.addEventListener('click',()=>{
    $$('[data-design]').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-pressed','false')});b.classList.add('active');b.setAttribute('aria-pressed','true');
    const mode=b.dataset.design,p=designModes[mode],preview=$('#design-preview');preview.className=`design-preview ${mode}`;preview.classList.add('is-changing');setTimeout(()=>preview.classList.remove('is-changing'),500);
    $('#design-outcome').textContent=p.outcome;$('#preview-eyebrow').textContent=p.eyebrow;$('#preview-headline').textContent=p.headline;$('#preview-copy').textContent=p.copy;$('#preview-action').textContent=p.action;$('#design-feedback').textContent=p.feedback;animateCard('design');
  }));

  // v4.1 — context rail integrity, semantic world-state URLs and resilient page restoration.
  let evidenceClaims=[],selectedEvidenceClaim=null;
  function worldFromHash(){const raw=decodeURIComponent((location.hash||'').replace(/^#/,''));if(!raw)return null;const id=raw.replace(/^world[=-]/,'').split(/[?&/]/)[0];return worlds[id]?id:null}
  function semanticWorldHref(id){return siteHref(`explore.html#world=${encodeURIComponent(id)}`)}
  function mountPageContext(){
    const home=location.pathname.endsWith('/')||location.pathname.endsWith('/index.html')||location.pathname.endsWith('index.html');if(home||$('.page-context-ribbon'))return;
    const ids=(memory.trail?.length?memory.trail.slice(-3):[memory.lastWorld]).filter(id=>worlds[id]);const last=ids[ids.length-1]||'pramana';
    const trailAge=memory.trailUpdatedAt?Math.max(0,now-memory.trailUpdatedAt):Infinity;const DAY=86_400_000;
    if(trailAge>90*DAY)return;
    const stale=trailAge>30*DAY;document.documentElement.style.setProperty('--world-accent',worlds[last].color);
    const intro=$('.v3-page-intro .wrap,.page-hero .wrap');if(!intro)return;
    let meta=$('.page-intro-meta',intro);if(!meta){meta=document.createElement('div');meta.className='page-intro-meta';const eyebrow=intro.querySelector(':scope > .eyebrow');if(eyebrow){intro.insertBefore(meta,eyebrow);meta.appendChild(eyebrow)}else intro.prepend(meta)}
    const ribbon=document.createElement('nav');ribbon.className='page-context-ribbon';ribbon.setAttribute('aria-label','Exploration context');
    const trailText=ids.map(id=>worlds[id].short).join(' → ')||worlds[last].short;const secondary=document.body.classList.contains('v3-evidence')?['lab.html','Interactive Lab']:['evidence.html','Evidence'];
    const contextLabel=stale?'Previous trail':'Current trail',resumeLabel=stale?`Revisit ${worlds[last].short}`:`Resume ${worlds[last].short}`;
    ribbon.innerHTML=`<div class="context-inner"><i aria-hidden="true"></i><span class="context-copy"><span class="context-label">${contextLabel}</span><strong class="context-path">${escapeHTML(trailText)}</strong></span><span class="context-actions"><button class="context-resume" type="button" data-context-resume>${escapeHTML(resumeLabel)}</button><a class="context-secondary" href="${secondary[0]}">${secondary[1]}</a></span></div>`;
    meta.appendChild(ribbon);document.documentElement.style.setProperty('--context-h','0px');
    ribbon.querySelector('[data-context-resume]')?.addEventListener('click',()=>{memory.trailUpdatedAt=now;persist();if($('.v3-atlas')){setWorld(last,'resume');$('.v3-atlas-section')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'})}else navigateToSection(semanticWorldHref(last))});
  }
  function updateHeaderOffset(){const h=$('.site-header')?.getBoundingClientRect().height||72;document.documentElement.style.setProperty('--header-h',`${Math.round(h)}px`)}
  function markActiveNavigation(){
    const path=location.pathname.replace(/\/+$/,'').toLowerCase();
    const active=path.endsWith('/explore.html')?'explore':path.endsWith('/lab.html')?'lab':path.endsWith('/evidence.html')?'evidence':(/\/about(?:\/index\.html)?$/.test(path)?'about':(/\/contact(?:\/index\.html)?$/.test(path)?'contact':''));
    $$('.site-header a[href]').forEach(a=>{let ap;try{ap=new URL(a.getAttribute('href'),location.href).pathname.replace(/\/+$/,'').toLowerCase()}catch(_){return}const match=(active==='explore'&&ap.endsWith('/explore.html'))||(active==='lab'&&ap.endsWith('/lab.html'))||(active==='evidence'&&ap.endsWith('/evidence.html'))||(active==='about'&&/\/about(?:\/index\.html)?$/.test(ap))||(active==='contact'&&/\/contact(?:\/index\.html)?$/.test(ap));if(match)a.setAttribute('aria-current','page')});
  }
  function navigateWithContinuity(href){let u;try{u=new URL(href,location.href)}catch(_){location.href=href;return}try{sessionStorage.setItem('annapurnaNavContext',JSON.stringify({at:Date.now(),world:activeWorld,trail:memory.trail,from:location.pathname,to:u.pathname}))}catch(_){}document.body.classList.add('page-leaving');setTimeout(()=>{location.href=u.href},matchMedia('(prefers-reduced-motion:reduce)').matches?0:190)}
  function mountNavigationContinuity(){
    try{history.scrollRestoration='manual'}catch(_){}updateHeaderOffset();markActiveNavigation();
    const header=$('.site-header');if(header&&'ResizeObserver'in window)new ResizeObserver(updateHeaderOffset).observe(header);else addEventListener('resize',updateHeaderOffset,{passive:true});
    const semanticHash=worldFromHash();
    try{const mark=JSON.parse(sessionStorage.getItem('annapurnaNavContext')||'null');if(mark&&Date.now()-mark.at<5000){document.body.classList.add('page-arriving');if(!location.hash||semanticHash)scrollTo(0,0);setTimeout(()=>document.body.classList.remove('page-arriving'),520);sessionStorage.removeItem('annapurnaNavContext')}}catch(_){}
    if(semanticHash)requestAnimationFrame(()=>scrollTo(0,0));
    addEventListener('pageshow',e=>{if((e.persisted||semanticHash)&&(!location.hash||semanticHash))requestAnimationFrame(()=>scrollTo(0,0))},{passive:true});
    document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target||a.hasAttribute('download'))return;const href=a.getAttribute('href');if(!href||href.startsWith('#')||/^(mailto:|tel:|javascript:)/i.test(href))return;let u;try{u=new URL(href,location.href)}catch(_){return}if(!['http:','https:','file:'].includes(u.protocol)||u.host&&u.host!==location.host)return;if(u.pathname===location.pathname&&u.search===location.search)return;
      e.preventDefault();navigateWithContinuity(u.href)
    });
  }
  function evidenceLimit(c){if(c?.conflictsWith?.length){const other=evidenceClaims.find(x=>c.conflictsWith.includes(x.id));return other?`Conflict preserved with: ${other.statement}`:'Conflict preserved across public sources.'}return c?.note||'This source supports only the stated scope; it is not a broader maturity or adoption claim.'}
  function selectEvidenceClaim(id,scrollFocus=false){
    const c=evidenceClaims.find(x=>x.id===id);if(!c)return null;selectedEvidenceClaim=c;$$('.evidence-card[data-evidence-id]').forEach(x=>{const current=x.dataset.evidenceId===id;x.dataset.selected=String(current);if(current)x.setAttribute('aria-current','true');else x.removeAttribute('aria-current')});
    const set=(sel,val)=>{const el=$(sel);if(el)el.textContent=val||'—'};set('#evidence-focus-title',c.statement);set('#evidence-focus-note',c.note||c.scope);set('#evidence-step-claim',c.statement);set('#evidence-step-source',c.sourceName);set('#evidence-step-scope',c.scope);set('#evidence-step-limit',c.conflictsWith?.length?'Conflict preserved':'Source-scoped limit');
    const meta=$('#evidence-focus-meta');if(meta)meta.innerHTML=`<span>${escapeHTML(c.status.replaceAll('_',' '))}</span><span>${escapeHTML(c.evidenceClass.replaceAll('_',' '))}</span>${c.conflictsWith?.length?'<span>conflict visible</span>':''}`;
    $$('[data-evidence-step]').forEach(b=>b.classList.toggle('active',b.dataset.evidenceStep==='claim'));document.documentElement.style.setProperty('--world-accent',c.evidenceClass.includes('repository')?worlds.axon.color:c.evidenceClass.includes('demo')?worlds.web.color:worlds.ai.color);
    if(scrollFocus)$('#evidence-focus')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});return c;
  }
  function initEvidenceField(data){
    evidenceClaims=data?.claims||[];const root=$('#evidence-list'),toolbar=$('#evidence-toolbar');if(!root||!evidenceClaims.length)return;
    const cards=$$('.evidence-card[data-evidence-id]',root);cards.forEach(card=>{card.tabIndex=0;card.dataset.selected='false';const pick=()=>selectEvidenceClaim(card.dataset.evidenceId);card.addEventListener('click',e=>{if(!e.target.closest('a'))pick()});card.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('a')){e.preventDefault();pick()}})});
    const summary=$('#evidence-summary'),conflicts=evidenceClaims.filter(c=>c.conflictsWith?.length).length,verified=evidenceClaims.filter(c=>c.status==='verified').length,sources=new Set(evidenceClaims.map(c=>c.sourceName)).size;if(summary)summary.innerHTML=`<span><strong>${evidenceClaims.length}</strong> claims</span><span><strong>${verified}</strong> verified</span><span><strong>${sources}</strong> sources</span><span><strong>${conflicts}</strong> conflict paths</span>`;if(toolbar)toolbar.hidden=false;
    $$('.evidence-filters button',toolbar||document).forEach(b=>b.addEventListener('click',()=>{const f=b.dataset.evidenceFilter;$$('.evidence-filters button',toolbar).forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b))});cards.forEach(card=>{const c=evidenceClaims.find(x=>x.id===card.dataset.evidenceId),show=f==='all'||c?.status===f||(f==='conflict'&&c?.conflictsWith?.length);card.classList.toggle('is-filtered',!show)});const visible=cards.find(x=>!x.classList.contains('is-filtered'));if(visible)selectEvidenceClaim(visible.dataset.evidenceId)}));
    $$('[data-evidence-step]').forEach(b=>b.addEventListener('click',()=>{if(!selectedEvidenceClaim)return;$$('[data-evidence-step]').forEach(x=>x.classList.toggle('active',x===b));const map={claim:selectedEvidenceClaim.statement,source:`Source: ${selectedEvidenceClaim.sourceName}`,scope:`Scope: ${selectedEvidenceClaim.scope}`,limit:evidenceLimit(selectedEvidenceClaim)};$('#evidence-focus-note').textContent=map[b.dataset.evidenceStep]||selectedEvidenceClaim.note}));
    const hint=(memory.lastWorld||'').toLowerCase(),needle={axon:'axon',web:'website',ai:'agentops',wonder:'wonder',idea:'idea',software:'software'}[hint];const preferred=evidenceClaims.find(c=>needle&&(c.statement+c.sourceName).toLowerCase().includes(needle))||evidenceClaims.find(c=>c.conflictsWith?.length)||evidenceClaims[0];selectEvidenceClaim(preferred.id);
  }
  function repoClaimCount(r){const key=(r.name||'').toLowerCase();return evidenceClaims.filter(c=>(c.sourceUrl||'').toLowerCase().includes(key)||(c.sourceName||'').toLowerCase().includes(key.replace('open-enterprise-',''))).length}
  function contextualExplanation(){
    if(document.body.classList.contains('v3-evidence')&&selectedEvidenceClaim)return`Selected evidence: ${selectedEvidenceClaim.statement} Source: ${selectedEvidenceClaim.sourceName}. Scope: ${selectedEvidenceClaim.scope}. Limit: ${evidenceLimit(selectedEvidenceClaim)}`;
    if(location.pathname.endsWith('lab.html')){const active=$('.v3-lab-modes button.active strong')?.textContent||'the active model';const h=$('.sim-card.active h2,.v3-sim-card.active h2')?.textContent||$('.v3-sim-heading h2')?.textContent||'';return`${active} is active. ${h} Change an input to see the system consequence, then use Evidence for source-backed maturity claims.`}
    return explainCurrentView();
  }
  function focusEvidenceConflict(){const c=evidenceClaims.find(x=>x.conflictsWith?.length);if(c){selectEvidenceClaim(c.id,true);return`Conflict path selected: ${c.statement}`}return'No preserved evidence conflict is loaded.'}
  function configureAgentActions(){
    const actions=$('.agent-actions');if(!actions)return;actions.classList.add('contextual');let items;
    if(document.body.classList.contains('v3-evidence'))items=[['explain','Explain selected claim'],['conflict','Show a conflict'],['products','Return to product field'],['concise','Less detail']];
    else if(location.pathname.endsWith('lab.html'))items=[['explain','Explain this model'],['evidence','Related evidence'],['axon','Open AXON structure'],['concise','Less detail']];
    else if(document.body.classList.contains('v42-about'))items=[['products','Explore products'],['evidence','Inspect evidence'],['contact','Contact'],['github','GitHub']];
    else if(document.body.classList.contains('v42-contact'))items=[['products','Explore products'],['evidence','Inspect evidence'],['github','GitHub'],['concise','Less detail']];
    else if($('.v3-atlas'))items=[['explain','Explain selected world'],['follow','Follow connection'],['evidence','Show evidence'],['concise','Less detail']];
    else items=[['next','Trace next step'],['explain','Explain this view'],['evidence','Show evidence'],['concise','Less detail']];
    actions.innerHTML=items.map(([k,label])=>`<button type="button" data-agent-v40="${k}">${label}</button>`).join('');actions.insertAdjacentHTML('beforebegin','<span class="agent-context-label">Actions in this view</span>');
    actions.addEventListener('click',e=>{const b=e.target.closest('[data-agent-v40]');if(!b)return;const k=b.dataset.agentV40,map={explain:'why',conflict:'focus conflict',products:'products',concise:'less detail',evidence:'evidence',axon:'axon structure',follow:'follow connection',next:'next route',contact:'contact',github:'github'};agentSay(handleAgentCommand(map[k]))});
  }
  async function loadJSON(path){
    try{const r=await fetch(siteDataHref(path),{cache:'no-store'});if(!r.ok)throw new Error(String(r.status));return await r.json()}
    catch(_){
      const d=window.ANNAPURNA_PUBLIC_DATA||{};
      if(path.endsWith('evidence-manifest.json'))return d.evidence||null;
      if(path.endsWith('repository-signals.json'))return d.repositories||null;
      if(path.endsWith('public-history.json'))return d.history||null;
      return null;
    }
  }
  const needsPublicSignals=Boolean($('.living-stage')||$('#evidence-list')||$('#repo-list')||$('#history-list')||$('#public-pulse'));
  if(needsPublicSignals)(async()=>{
    const repoSignals=await loadJSON('data/repository-signals.json');
    if(repoSignals?.repositories?.length){
      const totals=repoSignals.repositories.reduce((a,r)=>({commits:a.commits+(Number(r.commits)||0),issues:a.issues+(Number(r.openIssues)||0)}),{commits:0,issues:0});
      const score=Math.min(1,Math.max(.58,.58+Math.log10(1+totals.commits)*.15+repoSignals.repositories.length*.035));
      publicActivity={repos:repoSignals.repositories.length,commits:totals.commits,issues:totals.issues,intensity:score,key:score>.91?'active':score>.74?'steady':'quiet'};
      const stage=$('.living-stage');if(stage){stage.dataset.activity=publicActivity.key;stage.style.setProperty('--activity-strength',String(publicActivity.intensity))}
      const track=$('#route-track');if(track)track.dataset.live='true';
    }
    const evRoot=$('#evidence-list');
    if(evRoot){
      const evidenceData=await loadJSON('data/evidence-manifest.json');
      if(evidenceData?.claims?.length){
        evRoot.innerHTML=evidenceData.claims.map(c=>`<article class="evidence-card evidence-lens" data-evidence-id="${escapeHTML(c.id)}" data-evidence-status="${escapeHTML(c.status)}"><header><span class="status">${escapeHTML(c.status)}</span><span class="tag">${escapeHTML(c.evidenceClass.replaceAll('_',' '))}</span></header><h3>${escapeHTML(c.statement)}</h3><span class="evidence-note-label">Evidence note</span><p>${escapeHTML(c.note||c.scope||'')}</p><div class="evidence-source"><span>Source</span><strong>${escapeHTML(c.sourceName||'Public source')}</strong><small>${escapeHTML(c.scope||'')}</small></div>${c.conflictsWith?.length?'<span class="evidence-conflict">Conflict preserved</span>':''}<a href="${safeUrl(c.sourceUrl)}" target="_blank" rel="noopener noreferrer">Inspect source ↗</a></article>`).join('');
        initEvidenceField(evidenceData);
      }else evRoot.innerHTML='<article class="evidence-card evidence-empty"><h3>Evidence unavailable</h3><p>The public evidence bundle could not be loaded. The rest of the site remains available.</p></article>';
    }
    const repoRoot=$('#repo-list');
    if(repoRoot){const data=repoSignals;if(data?.repositories?.length)repoRoot.innerHTML=data.repositories.map(r=>`<a class="repo-card evidence-lens" href="${safeUrl(r.htmlUrl)}" target="_blank" rel="noopener noreferrer"><small>PUBLIC REPOSITORY</small><h3>${escapeHTML(r.fullName)}</h3><div class="repo-metrics"><div><span>Commits</span><strong>${Number(r.commits)||0}</strong></div><div><span>Open issues</span><strong>${Number(r.openIssues)||0}</strong></div><div><span>Forks</span><strong>${Number(r.forks)||0}</strong></div><div><span>Evidence claims</span><strong>${repoClaimCount(r)}</strong></div></div><div class="repo-evidence-meta"><span>Evidence snapshot</span><strong>${escapeHTML((data.generatedAt||'').slice(0,10)||'versioned')}</strong></div></a>`).join('');else repoRoot.innerHTML='<article class="repo-card evidence-empty"><h3>Repository signals unavailable</h3><p>Public repository data could not be loaded.</p></article>'}
    const tl=$('#history-list');if(tl){const data=await loadJSON('data/public-history.json');if(data?.entries?.length)tl.innerHTML=[...data.entries].reverse().map(e=>`<article class="history-lens"><small>${new Date(e.capturedAt).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})}</small><h3>${escapeHTML(e.label)}</h3><p>${escapeHTML(e.summary)}</p></article>`).join('');else tl.innerHTML='<article class="history-lens evidence-empty"><h3>History unavailable</h3><p>No semantic-history bundle could be loaded.</p></article>'}
    const pulse=$('#public-pulse');if(pulse){const data=repoSignals;if(data){const totals=data.repositories.reduce((a,r)=>({commits:a.commits+(r.commits||0),issues:a.issues+(r.openIssues||0)}),{commits:0,issues:0});pulse.innerHTML=`<div class="pulse-line"><span>Tracked public repositories</span><strong data-live-count="${data.repositories.length}">0</strong></div><div class="pulse-line"><span>Repository commits captured</span><strong data-live-count="${totals.commits}">0</strong></div><div class="pulse-line"><span>Open issues captured</span><strong data-live-count="${totals.issues}">0</strong></div>`;pulse.querySelectorAll('[data-live-count]').forEach(animateLiveCount)}}
  })();

  function animateLiveCount(el){
    const target=Math.max(0,Number(el.dataset.liveCount)||0),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;if(reduced){el.textContent=target;return}
    const start=performance.now(),duration=420;function tick(now){const t=Math.min(1,(now-start)/duration);el.textContent=Math.round(target*easeOut(t));if(t<1)requestAnimationFrame(tick)}requestAnimationFrame(tick);
  }

  function rgba(hex,a){const h=hex.replace('#',''),n=parseInt(h.length===3?h.split('').map(x=>x+x).join(''):h,16);return`rgba(${n>>16},${n>>8&255},${n&255},${a})`}
  function easeOut(t){return 1-Math.pow(1-t,3)}
  function escapeHTML(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function safeUrl(u){try{const x=new URL(u,location.href);return /^https?:$/.test(x.protocol)?x.href:'#'}catch(_){return '#'}}
})();
