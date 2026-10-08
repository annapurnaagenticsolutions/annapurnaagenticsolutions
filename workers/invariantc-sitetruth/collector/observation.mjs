/**
 * Browser-independent extraction definitions for SiteTruth.
 * The source collector does not claim truth or origin attestation.
 * It gathers explicitly requested DOM values, never arbitrary page content.
 */
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_FIELDS = 128;
const MAX_STRING = 2048;
const MODES = new Set(['text', 'number_text', 'count_elements', 'attribute', 'attribute_json', 'json_text', 'exists']);

function requireKnownKeys(value, allowed, label) {
  if (Object.keys(value).some(key => !allowed.has(key))) throw new Error(`${label} contains unsupported fields`);
}

export function decodePointer(pointer) {
  if (typeof pointer !== 'string' || !pointer.startsWith('/') || pointer.length > 512 || /~(?![01])/.test(pointer)) {
    throw new Error('Invalid extraction JSON pointer');
  }
  const segments = pointer.slice(1).split('/').map(x=>x.replaceAll('~1','/').replaceAll('~0','~'));
  if (segments.some(x => !x || ['__proto__','prototype','constructor'].includes(x) || x.length > 100)) {
    throw new Error('Unsafe extraction JSON pointer');
  }
  return segments;
}

function safeSelector(s) {
  return typeof s === 'string' && s.length > 0 && s.length <= 256 && !/[\r\n]/.test(s);
}

export function validateSpec(spec) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec) || spec.version !== 1) throw new Error('Capture specification version must be 1');
  requireKnownKeys(spec, new Set(['version', 'url', 'sources', 'actions']), 'Capture specification');
  if (typeof spec.url !== 'string' || spec.url.length < 1 || spec.url.length > MAX_STRING) throw new Error('Capture specification must include a bounded URL');
  if (!Array.isArray(spec.sources) || !spec.sources.length || spec.sources.length > 32) throw new Error('sources must contain 1–32 entries');
  const declaredFieldCount = spec.sources.reduce((count, source) =>
    count + (Array.isArray(source?.extract) ? source.extract.length : 0), 0);
  if (declaredFieldCount > MAX_FIELDS) throw new Error(`Too many extraction fields (max ${MAX_FIELDS})`);
  let fields = 0;
  const seenSources = new Set();
  for (const source of spec.sources) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('Each source must be an object');
    requireKnownKeys(source, new Set(['id', 'layer', 'extract']), 'Capture source');
    if (typeof source.id !== 'string' || !SAFE_ID.test(source.id) || seenSources.has(source.id)) throw new Error('Invalid or duplicate source id');
    if (source.layer !== undefined && (typeof source.layer !== 'string' || !SAFE_ID.test(source.layer))) throw new Error(`Invalid source layer for ${source.id}`);
    seenSources.add(source.id);
    if (!Array.isArray(source.extract) || !source.extract.length) throw new Error(`Source ${source.id} must contain extraction rules`);
    const seenPointers = new Set();
    for (const field of source.extract) {
      if (!field || typeof field !== 'object' || Array.isArray(field)) throw new Error(`Source ${source.id} extractors must be objects`);
      requireKnownKeys(field, new Set(['pointer', 'kind', 'selector', 'within', 'attribute']), 'Capture extractor');
      fields++;
      decodePointer(field.pointer);
      if (seenPointers.has(field.pointer)) throw new Error(`Duplicate extraction pointer ${field.pointer}`);
      const segments=decodePointer(field.pointer);
      for (const other of seenPointers) {
        const otherSegments=decodePointer(other);
        const collision=(short,long)=>short.every((part,i)=>part===long[i]);
        if(collision(segments,otherSegments) || collision(otherSegments,segments)) throw new Error(`Conflicting extraction hierarchy: ${field.pointer}`);
      }
      seenPointers.add(field.pointer);
      if (!MODES.has(field.kind)) throw new Error(`Unsupported extraction kind: ${field.kind}`);
      if (!safeSelector(field.selector)) throw new Error(`Invalid selector for ${field.pointer}`);
      if (field.kind === 'count_elements' && !safeSelector(field.within)) throw new Error('count_elements requires a known container in within');
      if (['attribute', 'attribute_json'].includes(field.kind) && !/^[a-zA-Z_:][a-zA-Z0-9_:.-]{0,79}$/.test(field.attribute || '')) throw new Error('Invalid attribute name');
    }
  }
  if (fields > MAX_FIELDS) throw new Error(`Too many extraction fields (max ${MAX_FIELDS})`);
  if (spec.actions !== undefined) {
    if (!Array.isArray(spec.actions) || spec.actions.length > 12) throw new Error('actions must contain at most 12 steps');
    for (const action of spec.actions) {
      if (!action || typeof action !== 'object' || Array.isArray(action)) throw new Error('Each action must be an object');
      requireKnownKeys(action, new Set(['kind', 'selector']), 'Capture action');
      if (action.kind !== 'click' || !safeSelector(action.selector)) throw new Error('Only explicit click actions are permitted');
    }
  }
  return spec;
}

function insertPointer(destination, pointer, value) {
  const seg = decodePointer(pointer);
  let o = destination;
  for (let i=0;i<seg.length-1;i++) {
    if (!Object.hasOwn(o, seg[i])) o[seg[i]] = {};
    if (!o[seg[i]] || typeof o[seg[i]] !== 'object' || Array.isArray(o[seg[i]])) throw new Error('Pointer hierarchy collision');
    o=o[seg[i]];
  }
  if (Object.hasOwn(o, seg.at(-1))) throw new Error('Pointer collision');
  o[seg.at(-1)]=value;
}

function strictNumber(text) {
  if (typeof text !== 'string') throw new Error('Value is not text');
  const candidate=text.trim();
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(candidate)) throw new Error('Not an unambiguous decimal number');
  const n=Number(candidate);
  if (!Number.isFinite(n) || (Number.isInteger(n) && !Number.isSafeInteger(n))) throw new Error('Unsafe numeric value');
  return n;
}

async function readField(page, field) {
  const loc=page.locator(field.selector);
  const n=await loc.count();
  if (field.kind === 'count_elements') {
    if (await page.locator(field.within).count() !== 1) throw new Error('Collection container not uniquely present');
    if (n > 100000) throw new Error('Element count exceeds safety limit');
    return n;
  }
  if (field.kind === 'exists') return n > 0;
  if (n !== 1) throw new Error(n===0 ? 'Selector not found' : 'Selector is ambiguous');
  let raw;
  if (field.kind==='attribute' || field.kind==='attribute_json') raw=await loc.getAttribute(field.attribute);
  else raw=await loc.textContent();
  if (raw===null || raw===undefined) throw new Error('Value unavailable');
  if (raw.length > MAX_STRING) throw new Error('Observed text exceeds 2048-character field cap');
  switch(field.kind) {
    case 'text': case 'attribute': return raw.trim();
    case 'number_text': return strictNumber(raw);
    case 'json_text': case 'attribute_json': {
      const parsed=JSON.parse(raw);
      if (JSON.stringify(parsed).length > MAX_STRING) throw new Error('Parsed value too large');
      return parsed;
    }
    default: throw new Error('Unsupported extraction kind');
  }
}

/** Returns captured data and **no raw values** in the metadata. */
export async function extractObservations(page, spec) {
  validateSpec(spec);
  const observations = {};
  const evidence = [];
  for (const source of spec.sources) {
    const destination={};
    for (const field of source.extract) {
      try {
        const value=await readField(page,field);
        insertPointer(destination,field.pointer,value);
        evidence.push({source:source.id,pointer:field.pointer,kind:field.kind,status:'collected'});
      } catch(err) {
        // Missing values stay missing: the Rust engine reports UNKNOWN, never implicit success.
        evidence.push({source:source.id,pointer:field.pointer,kind:field.kind,status:'unavailable',reason:err.message.slice(0,160)});
      }
    }
    observations[source.id]=destination;
  }
  return { observations, evidence, policy_notice:'DOM observations are not a certified source of truth; independent API/state evidence is preferable.' };
}

export function validateTarget(urlText, options={}) {
  let url;
  try { url=new URL(urlText); } catch { throw new Error('Invalid target URL'); }
  if (!['http:','https:'].includes(url.protocol)) throw new Error('Only HTTP(S) is permitted');
  if (url.username || url.password) throw new Error('Embedded URL credentials are forbidden');
  if (url.hash) throw new Error('Fragments are not permitted in target URLs');
  const local = ['localhost','127.0.0.1','[::1]'].includes(url.hostname.toLowerCase());
  if (!local) {
    if (options.externalCaptureEnabled === false) {
      throw new Error('External website capture is disabled until the reviewed browser egress policy is available.');
    }
    // This flag is a local operator acknowledgment only; it is not a domain-control proof.
    if (options.allowOrigin !== url.origin || options.attestOwnership !== true) {
      throw new Error('External collection requires matching --allow-origin and explicit --attest-ownership');
    }
    if (/^[\d.]+$/.test(url.hostname) || url.hostname.startsWith('[')) throw new Error('External IP-literal targets are not supported');
  }
  return {url,local};
}
