const TOPICS = [
  ['map','Where personal data is used'],['roles','Who is responsible'],['purpose','Why data is used'],
  ['notice','What people are told'],['providers','Outside providers'],['security','Keeping data safe'],
  ['retention','Keeping and deleting data'],['requests','People’s requests'],['evidence','Records of decisions'],
  ['children','Children’s data'],['automated','AI or automated use'],['sdf','Special status'],
  ['transfers','Data sent abroad'],['scope','Which rules apply']
];
const LABELS = {'in-place':'In place, with evidence',partial:'In progress or evidence incomplete','not-in-place':'Not in place',unsure:'Not sure yet',na:'Not applicable'};
const json = (v,s=200) => new Response(JSON.stringify(v),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const toUtc = v => v ? Date.parse(v.includes('T') ? v : v.replace(' ','T')+'Z') : NaN;
async function hash(v) { const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)); return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join(''); }
async function bodyOf(r) {
  if (!(r.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json')) return null;
  if (Number(r.headers.get('Content-Length')||0)>1024) return null;
  const raw=await r.text(); if(new TextEncoder().encode(raw).length>1024) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function notes(v) {
  const rows=TOPICS.map(([key,label])=>label+': '+(LABELS[v.answers[key]]||'Not sure yet'));
  return ['Your Pramana DPDP discussion notes','','Context: '+v.sector,'',...rows,'',
    'These are your own selections, not a compliance score, legal opinion or certification.',
    'Review the facts and current official sources with responsible people.',
    'Official sources: https://annapurnaagenticsolutions.com/pramana/sources/','',
    'If you did not request this email, contact contact@annapurnaagenticsolutions.com.'].join('\n');
}
export async function onRequestPost({request,env}) {
  const origin=request.headers.get('Origin');
  if(origin && origin!==new URL(request.url).origin) return json({error:'origin_not_allowed',message:'Open the check on the Pramana website and try again.'},403);
  if(!env.PRAMANA_LEADS||!env.PRAMANA_OTP||!env.RESEND_API_KEY) return json({error:'email_unavailable',message:'Email is temporarily unavailable. You can still print your notes.'},503);
  const body=await bodyOf(request);
  const email=typeof body?.email==='string'?body.email.trim().toLowerCase():'';
  const code=typeof body?.code==='string'?body.code.trim():'';
  if(!/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/.test(email)||!/^\d{6}$/.test(code)) return json({error:'invalid_fields',message:'Enter your email and the six-digit code.'},400);
  const key='otp:'+await hash(email);
  try {
    const v=await env.PRAMANA_OTP.get(key,{type:'json'});
    if(!v||v.email!==email||v.expires_at<=Date.now()) return json({error:'code_expired',message:'The code has expired. Please request a new one.'},400);
    if(v.attempts>=5) return json({error:'too_many_attempts',message:'Too many attempts. Please request a new code later.'},429);
    if(await hash(v.nonce+':'+code)!==v.code_hash) {
      v.attempts++;
      await env.PRAMANA_OTP.put(key,JSON.stringify(v),{expirationTtl:Math.max(60,Math.ceil((v.expires_at-Date.now())/1000))});
      return json({error:'wrong_code',message:v.attempts>=5?'Too many attempts. Please request a new code later.':'That code did not match. '+(5-v.attempts)+' attempts left.'},400);
    }
    const recent=await env.PRAMANA_LEADS.prepare('SELECT resend_at FROM report_requests WHERE email = ? AND resend_at IS NOT NULL ORDER BY id DESC LIMIT 1').bind(email).first();
    const old=await env.PRAMANA_LEADS.prepare('SELECT created_at, resend_at, consent_ver FROM leads WHERE email = ?').bind(email).first();
    const last=Math.max(toUtc(recent?.resend_at)||0,toUtc(old?.resend_at||(old?.consent_ver==='email-check-v2'?null:old?.created_at))||0);
    if(last&&Date.now()-last<86400000) {
      await env.PRAMANA_OTP.delete(key);
      return json({error:'recent_request',message:'This address has already received notes in the last 24 hours. You can print your notes now.'},429);
    }
    const saved=await env.PRAMANA_LEADS.prepare('INSERT INTO report_requests (email,name,report_delivery_ack,privacy_notice_ver,source_url) VALUES (?,?,?,?,?)').bind(email,v.name,1,'website-2026-09-24','/pramana/demos/dpdp-check/').run();
    if(!saved?.success||!saved.meta?.last_row_id) throw new Error('D1 write failed');
    const reportId=saved.meta.last_row_id;
    let sent;
    try {
      sent=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'pramana-notes-'+v.nonce},body:JSON.stringify({from:'Pramana by Annapurna <noreply@annapurnaagenticsolutions.com>',to:[email],subject:'Your Pramana DPDP discussion notes',text:notes(v)})});
    } catch {
      sent=null;
    }
    if(!sent?.ok) {
      await env.PRAMANA_LEADS.prepare('DELETE FROM report_requests WHERE id = ? AND resend_at IS NULL').bind(reportId).run();
      return json({error:'email_unavailable',message:'Your address was verified, but the notes could not be emailed. Please print them here or try the code again.'},503);
    }
    const delivered=await env.PRAMANA_LEADS.prepare("UPDATE report_requests SET resend_at = datetime('now') WHERE id = ?").bind(reportId).run();
    if(!delivered?.success) throw new Error('D1 delivery update failed');
    if(v.contact_me) {
      const marketingSql="INSERT INTO marketing_leads (email,name,organization,role,company_size,sector,marketing_opt_in,marketing_consent_ver,privacy_notice_ver,source_url) VALUES (?,?,?,?,?,?,1,'website-contact-v1','website-2026-09-24','/pramana/demos/dpdp-check/') ON CONFLICT(email) DO UPDATE SET name=excluded.name,organization=excluded.organization,role=excluded.role,company_size=excluded.company_size,sector=excluded.sector,marketing_opt_in=1,marketing_consent_ver=excluded.marketing_consent_ver,privacy_notice_ver=excluded.privacy_notice_ver,source_url=excluded.source_url,updated_at=datetime('now')";
      const marketing=await env.PRAMANA_LEADS.prepare(marketingSql).bind(email,v.name,v.organization||null,v.role,v.company_size||null,v.sector).run();
      if(!marketing?.success) throw new Error('D1 marketing write failed');
    }
    await env.PRAMANA_OTP.delete(key);
    return json({status:'verified',email_sent:true,message:'Your notes were emailed. You can also print them here.'});
  } catch {
    return json({error:'email_unavailable',message:'Email is temporarily unavailable. You can still print your notes.'},503);
  }
}
