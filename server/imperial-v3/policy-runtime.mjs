import {normalizePolicy,effectiveAccess} from '../../integration/imperial-v3/foundation/permissions.mjs';
export const registry={members:['amberina','zxy','truth','kaito','harry'],features:['photos','archives','library','gallery','digital'],templates:['visitor','reader','editor']};
const sets=()=>Object.fromEntries(Object.entries(registry).map(([k,v])=>[k,new Set(v)]));
const safeNow=n=>Number.isSafeInteger(n)&&n>=0;
const preview=config=>config.SCHICKSAL_HOSTING==='cloudflare'&&config.SCHICKSAL_V3_STATUS_ENABLED==='true'&&/^[a-f0-9]{40}$/i.test(config.SCHICKSAL_PREVIEW_COMMIT??'');
export const editEnabled=config=>preview(config)&&config.SCHICKSAL_V3_POLICY_EDIT_ENABLED==='true';
export const enforcementConfigured=config=>preview(config)&&config.SCHICKSAL_MINISTRY_V2==='1'&&config.SCHICKSAL_V3_POLICY_ENFORCEMENT==='true';
export function validateAssignments(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('Invalid assignments');
 const out={};
 for(const [member,assigned] of Object.entries(value)){
  if(!registry.members.includes(member)||!Array.isArray(assigned)||assigned.some(t=>!registry.templates.includes(t))||new Set(assigned).size!==assigned.length)throw new TypeError('Invalid template assignment');
  out[member]=[...assigned].sort();
 }
 return out;
}
const normalized=(rules,assignments,at)=>({rules:normalizePolicy(rules,{...sets(),now:at}),assignments:validateAssignments(assignments)});
async function current(db){
 const row=await db.prepare("SELECT revision,actor,term,reason,created_at,rules,assignments FROM imperial_policy_current WHERE id='global'").first();
 if(!row)return {revision:0,rules:[],assignments:{},created_at:0};
 const p=normalized(JSON.parse(row.rules),JSON.parse(row.assignments),row.created_at);
 return {...row,...p};
}
export async function policySnapshot(db,config){
 const value=await current(db);
 const history=await db.prepare("SELECT revision,actor,term,reason,created_at FROM imperial_policy_sets WHERE id='global' ORDER BY revision DESC LIMIT 30").all();
 return {current:value,history:history.results,editable:editEnabled(config),enforcementConfigured:enforcementConfigured(config),registry};
}
export async function savePolicyLive(db,{actor,tokenHash,expectedTerm,expectedRevision,reason,rules,assignments,restoreRevision,now}){
 if(!registry.members.includes(actor)||typeof tokenHash!=='string'||!/^[a-f0-9]{64}$/.test(tokenHash)||typeof expectedTerm!=='string'||!expectedTerm||expectedTerm.length>200||!safeNow(expectedRevision)||!safeNow(now)||typeof reason!=='string'||!reason.trim()||reason.length>500)throw new TypeError('Invalid policy write');
 const at=Math.floor(now/1000);
 let value;
 if(restoreRevision!==undefined){
  if(!safeNow(restoreRevision)||restoreRevision>expectedRevision)throw new TypeError('Invalid restore revision');
  if(restoreRevision===0)value={rules:[],assignments:{}};
  else{
   const old=await db.prepare("SELECT rules,assignments,created_at FROM imperial_policy_sets WHERE id='global' AND revision=?").bind(restoreRevision).first();
   if(!old)return null;
   const checked=normalized(JSON.parse(old.rules),JSON.parse(old.assignments),old.created_at);
   // Historical temporary rules are never renewed; drop only those already expired.
   value=normalized(checked.rules.filter(r=>r.expiresAt==null||r.expiresAt>at),checked.assignments,at);
  }
 }else value=normalized(rules,assignments,at);
 return db.prepare(`INSERT INTO imperial_policy_sets(id,revision,actor,term,reason,created_at,rules,assignments)
 SELECT 'global',?, ?,o.term_id,?,?,?,? FROM current_office_holders o
 WHERE o.office_id='technology' AND o.citizen_id=? AND o.term_id=?
 AND (SELECT count(*) FROM current_office_holders WHERE office_id='technology')=1
 AND EXISTS(SELECT 1 FROM member_sessions s WHERE s.token_hash=? AND s.citizen_id=? AND s.account_mode='technology' AND s.expires_at>? AND s.minister_grant_expires_at>?)
 AND COALESCE((SELECT max(revision) FROM imperial_policy_sets WHERE id='global'),0)=?
 ON CONFLICT(id,revision) DO NOTHING RETURNING revision`).bind(expectedRevision+1,actor,reason.trim(),at,JSON.stringify(value.rules),JSON.stringify(value.assignments),actor,expectedTerm,tokenHash,actor,now,now,expectedRevision).first();
}
// Used by the reviewed post-intake hook. Do not weaken V2's existing restrictions.
// DB or validation error when enforcement is configured must fail closed at callers.
export async function combineRestriction(db,config,member,feature,basePolicy,at=Math.floor(Date.now()/1000)){
 if(!enforcementConfigured(config))return basePolicy;
 if(!registry.members.includes(member)||!registry.features.includes(feature)||!['inherit','deny','read','use'].includes(basePolicy)||!safeNow(at))throw new TypeError('Invalid access context');
 const p=await current(db);
 const result=effectiveAccess({baseRead:true,baseWrite:true,member,feature,rules:p.rules,assignedTemplates:p.assignments[member]??[],at});
 if(basePolicy==='deny'||!result.read)return 'deny';
 if(basePolicy==='read'||!result.write)return 'read';
 return basePolicy;
}
