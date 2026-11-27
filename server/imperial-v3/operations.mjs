import {githubOverview,cloudflareOverview} from '../../integration/imperial-v3/foundation/monitor.mjs';
import {normalizePolicy,effectiveAccess} from '../../integration/imperial-v3/foundation/permissions.mjs';
import {scoreRanking} from '../../integration/imperial-v3/foundation/evaluation.mjs';
import {registry,editEnabled,enforcementConfigured,policySnapshot,savePolicyLive} from './policy-runtime.mjs';

const groups={
 events:['imperial_events','imperial_deliveries'],
 incidents:['imperial_incidents','imperial_incident_audit','imperial_probe_watermarks'],
 policy:['imperial_policy_sets','imperial_policy_current'],
 exploration:['imperial_exploration_steps','imperial_exploration_completions'],
 art:['imperial_art_versions','imperial_art_relations'],
 producers:['imperial_source_changes','imperial_source_fanout','imperial_book_published','imperial_gallery_version','imperial_digital_version','imperial_permission_changed','imperial_gallery_visibility','imperial_digital_visibility','imperial_gallery_tags_insert','imperial_gallery_tags_update','imperial_caption_changed','imperial_verified_discovery','imperial_advanced_policy_changed'],
 collection:['library_revisions','gallery_versions','digital_versions','ministry_current','search_embeddings','exploration_discoveries']
};
const {members,features,templates}=registry;
export const previewEnabled=config=>config.SCHICKSAL_V3_STATUS_ENABLED==='true'&&config.SCHICKSAL_HOSTING==='cloudflare'&&typeof config.SCHICKSAL_PREVIEW_COMMIT==='string'&&/^[a-f0-9]{40}$/i.test(config.SCHICKSAL_PREVIEW_COMMIT);
const mutationEnabled=config=>previewEnabled(config)&&config.SCHICKSAL_V3_MUTATIONS_ENABLED==='true';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
const json=(body,status=200)=>Response.json(body,{status,headers});
const fail=(status,message)=>json({error:message},status);
const safeId=x=>typeof x==='string'&&/^[a-z][a-z0-9_.-]{0,79}$/.test(x);
async function inventory(db){
 const rows=await db.prepare("SELECT name FROM sqlite_master WHERE name LIKE 'imperial_%' OR name IN ('library_revisions','gallery_versions','digital_versions','ministry_current','search_embeddings','exploration_discoveries')").all();
 const names=new Set(rows.results.map(r=>r.name));
 return Object.fromEntries(Object.entries(groups).map(([id,required])=>[id,{ready:required.every(n=>names.has(n)),present:required.filter(n=>names.has(n)).length,required:required.length}]));
}
async function term(db,actor){
 const rows=await db.prepare("SELECT citizen_id,term_id FROM current_office_holders WHERE office_id='technology' LIMIT 2").all();
 if(rows.results.length!==1||rows.results[0].citizen_id!==actor)return null;
 return rows.results[0].term_id;
}
export async function status(db,config,actor){
 const appointment=await term(db,actor);if(!appointment)return null;
 const schema=await inventory(db);
 let queue=null,incidents=null;
 if(schema.events.ready){
  const r=await db.prepare("SELECT consumer,state,count(*) count FROM imperial_deliveries GROUP BY consumer,state ORDER BY consumer,state").all();
  queue=r.results.map(x=>({consumer:x.consumer,state:x.state,count:x.count}));
 }
 if(schema.incidents.ready){
  const r=await db.prepare("SELECT code,severity,state,generation,revision,observed_at,opened_at,acknowledged_at,resolved_at FROM imperial_incidents WHERE state<>'resolved' ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,observed_at DESC,code LIMIT 51").all();
  incidents={items:r.results.slice(0,50),hasMore:r.results.length>50};
 }
 return {asOf:Date.now(),previewCommit:config.SCHICKSAL_PREVIEW_COMMIT,term:appointment,schema,queue,incidents,
  mutations:mutationEnabled(config)&&schema.incidents.ready,policyEditable:editEnabled(config)&&schema.policy.ready,policyEnforcementConfigured:enforcementConfigured(config),externalConfigured:config.SCHICKSAL_V3_EXTERNAL_READS==='true',
  registry:{members,features,templates},note:'表结构存在不表示功能已启用；此处仅显示真实查询结果。'};
}
export async function externalStatus(config,fetcher=fetch){
 if(config.SCHICKSAL_V3_EXTERNAL_READS!=='true')return {github:{state:'unconfigured'},cloudflare:{state:'unconfigured'}};
 // All targets are fixed server configuration. Do not return token or raw response.
 const tasks=[
  config.IMPERIAL_GITHUB_TOKEN&&config.IMPERIAL_GITHUB_OWNER&&config.IMPERIAL_GITHUB_REPO&&config.IMPERIAL_GITHUB_BRANCH?
    githubOverview({owner:config.IMPERIAL_GITHUB_OWNER,repo:config.IMPERIAL_GITHUB_REPO,branch:config.IMPERIAL_GITHUB_BRANCH,token:config.IMPERIAL_GITHUB_TOKEN,fetcher,timeoutMs:5000}):Promise.resolve({state:'unconfigured'}),
  config.IMPERIAL_CF_TOKEN&&config.IMPERIAL_CF_ACCOUNT&&config.IMPERIAL_CF_PREVIEW_WORKER?
    cloudflareOverview({account:config.IMPERIAL_CF_ACCOUNT,worker:config.IMPERIAL_CF_PREVIEW_WORKER,token:config.IMPERIAL_CF_TOKEN,fetcher,timeoutMs:5000}):Promise.resolve({state:'unconfigured'})
 ];
 const r=await Promise.allSettled(tasks);
 return {github:r[0].status==='fulfilled'?r[0].value:{state:'invalid_configuration'},cloudflare:r[1].status==='fulfilled'?r[1].value:{state:'invalid_configuration'}};
}
function simulate(p,at){
 if(!members.includes(p.member)||!features.includes(p.feature)||typeof p.baseRead!=='boolean'||typeof p.baseWrite!=='boolean'||!Array.isArray(p.assignedTemplates)||p.assignedTemplates.some(t=>!templates.includes(t)))throw new TypeError('Invalid simulation');
 const rules=normalizePolicy(p.rules,{members:new Set(members),features:new Set(features),templates:new Set(templates),now:at});
 return {simulation:true,result:effectiveAccess({baseRead:p.baseRead,baseWrite:p.baseWrite,member:p.member,feature:p.feature,assignedTemplates:p.assignedTemplates,rules,at}),at,note:'仅按输入的假设基础权限试算，不读取实际权限、不保存、不授权。'};
}
export async function acknowledgeLive(db,{actor,tokenHash,expectedTerm,code,revision,now}){
 if(!safeId(code)||!Number.isSafeInteger(revision)||revision<1||typeof expectedTerm!=='string'||!expectedTerm||expectedTerm.length>200||typeof tokenHash!=='string'||!/^[a-f0-9]{64}$/.test(tokenHash)||!Number.isSafeInteger(now)||now<0)throw new TypeError('Invalid acknowledgement');
 const at=Math.floor(now/1000);
 // Single authoritative conditional write: no stale-session or prior-office approval.
 return db.prepare(`UPDATE imperial_incidents SET state='acknowledged',revision=revision+1,acknowledged_by=?,acknowledged_at=?
 WHERE code=? AND state='open' AND revision=? AND observed_at<=?
 AND EXISTS(SELECT 1 FROM current_office_holders o WHERE o.office_id='technology' AND o.citizen_id=? AND o.term_id=?)
 AND (SELECT count(*) FROM current_office_holders WHERE office_id='technology')=1
 AND EXISTS(SELECT 1 FROM member_sessions s WHERE s.token_hash=? AND s.citizen_id=? AND s.account_mode='technology' AND s.expires_at>? AND s.minister_grant_expires_at>?)
 RETURNING code,revision,state`).bind(actor,at,code,revision,at,actor,expectedTerm,tokenHash,actor,now,now).first();
}
// Dependency injection enables the same actual route policy to be tested without Cloudflare.
export async function handle(request,{db,config,requireMinister,readBody,tokenHash,fetcher=fetch,clock=()=>Date.now()}){
 try{
  const actor=await requireMinister(request); // real elevated-session authority supplied by route
  if(!previewEnabled(config))return fail(404,'V3 预览监察未启用');
  if(request.method==='GET'){
   const url=new URL(request.url);
   if(url.searchParams.get('view')==='policy'){
    if(!(await inventory(db)).policy.ready)return fail(503,'高级权限表尚未安装');
    const appointment=await term(db,actor);if(!appointment)return fail(403,'部长任期已变化');
    const result=await policySnapshot(db,config);if(await requireMinister(request)!==actor||await term(db,actor)!==appointment)return fail(403,'部长任期已变化');return json({...result,term:appointment});
   }
   if(url.searchParams.get('view')==='external'){
    const appointment=await term(db,actor);if(!appointment)return fail(403,'部长任期已变化');
    const result=await externalStatus(config,fetcher);if(await requireMinister(request)!==actor||await term(db,actor)!==appointment)return fail(403,'部长任期已变化');
    return json(result);
   }
   const result=await status(db,config,actor);if(await requireMinister(request)!==actor||!result||await term(db,actor)!==result.term)return fail(403,'部长任期已变化');
   return json(result);
  }
  if(request.method!=='POST')return fail(405,'不支持该操作');
  if(request.headers.get('origin')!==new URL(request.url).origin)return fail(403,'请从天命网站内操作');
  const p=await readBody(request,32768);
  if(p.action==='simulate')return json(simulate(p,Math.floor(clock()/1000)));
  if(p.action==='evaluate'){
   if(!Array.isArray(p.ranking)||p.ranking.length>1000)return fail(400,'评估结果数量无效');
   return json({simulation:true,metrics:scoreRanking(p.ranking,p.judgments,p.k),note:'仅计算输入的排序与标注，未调用模型或实时检索。'});
  }
  if(p.action==='savePolicy'){
   if(!editEnabled(config))return fail(403,'高级权限编辑未获预览许可');
   const hash=await tokenHash(request);if(!hash)return fail(401,'会话已失效');
   if(!(await inventory(db)).policy.ready)return fail(503,'高级权限表尚未安装');
   const result=await savePolicyLive(db,{actor,tokenHash:hash,expectedTerm:p.expectedTerm,expectedRevision:p.expectedRevision,reason:p.reason,rules:p.rules,assignments:p.assignments,restoreRevision:p.restoreRevision,now:clock()});
   return result?json(result):fail(409,'配置版本、部长任期或会话已变化，请刷新');
  }
  if(p.action!=='acknowledge')return fail(400,'未知操作');
  if(!mutationEnabled(config))return fail(403,'预览写入未获许可');
  const hash=await tokenHash(request);if(!hash)return fail(401,'会话已失效');
  if(!(await inventory(db)).incidents.ready)return fail(503,'异常表尚未安装');
  const result=await acknowledgeLive(db,{actor,tokenHash:hash,expectedTerm:p.expectedTerm,code:p.code,revision:p.revision,now:clock()});
  return result?json(result):fail(409,'异常版本、部长任期或会话已变化，请刷新');
 }catch(e){
  const code=typeof e?.status==='number'&&[400,401,403,404,409,413,429,503].includes(e.status)?e.status:e instanceof TypeError?400:503;
  return fail(code,code===400?'请求格式无效':code===401?'请先登录':code===403?'需要现任科技部长权限':code===413?'请求过大':'监察暂不可用');
 }
}
