import {env} from 'cloudflare:workers';
import {requireTechnologyMinister} from '../auth/member.ts';
import {requireEnabled} from '../ministry/store.ts';
import {FEATURES} from '../ministry/policy.ts';
/** Read-only, fixed queries. Does not inspect private content or external credentials. */
export async function siteHealth(request:Request){await requireTechnologyMinister(request);requireEnabled();const e=env as unknown as Record<string,unknown>;const started=Date.now();const checks=[
 {id:'sessions',label:'有效期内登录会话',sql:'SELECT COUNT(*) n FROM member_sessions WHERE expires_at>?',args:[started],enabled:true},
 {id:'ministry',label:'科技部配置对象',sql:'SELECT COUNT(*) n FROM ministry_current',args:[],enabled:true},
 {id:'books',label:'当前正式书籍',sql:"SELECT COUNT(*) n FROM library_revisions a WHERE kind='book' AND state='published' AND NOT EXISTS(SELECT 1 FROM library_revisions b WHERE b.kind=a.kind AND b.entity_id=a.entity_id AND b.state='published' AND b.seq>a.seq)",args:[],enabled:e.SCHICKSAL_LIBRARY_V11_ENABLED==='true'},
 {id:'gallery',label:'待完成图片对象',sql:"SELECT COUNT(*) n FROM gallery_blobs WHERE state='pending'",args:[],enabled:e.SCHICKSAL_GALLERY_ENABLED==='true'},
 {id:'digital',label:'待完成数字文件对象',sql:"SELECT COUNT(*) n FROM digital_blobs WHERE state='pending'",args:[],enabled:e.SCHICKSAL_DIGITAL_ENABLED==='true'},
 {id:'search',label:'语义向量记录',sql:'SELECT COUNT(*) n FROM search_embeddings',args:[],enabled:e.SCHICKSAL_SEARCH_ENABLED==='true'},
 ];const results=await Promise.all(checks.map(async c=>{if(!c.enabled)return {id:c.id,label:c.label,status:'disabled',count:null,ms:null};const at=Date.now();try{const row=await env.DB.prepare(c.sql).bind(...c.args).first<{n:number}>();if(!row||!Number.isSafeInteger(row.n)||row.n<0)throw Error('invalid count');return {id:c.id,label:c.label,status:'readable',count:row.n,ms:Date.now()-at};}catch{return {id:c.id,label:c.label,status:'unavailable',count:null,ms:Date.now()-at};}}));const policies=(await env.DB.prepare("SELECT target,payload FROM ministry_current WHERE kind='feature'").bind().all<{target:string;payload:string}>()).results;return {asOf:Date.now(),durationMs:Date.now()-started,checks:results,features:FEATURES.map(f=>({id:f.id,label:f.label,mode:policies.find(p=>p.target===f.id)?JSON.parse(policies.find(p=>p.target===f.id)!.payload).mode:'open',coverage:f.state})),bindings:{gallery:!!e.GALLERY_BUCKET,digital:!!e.DIGITAL_BUCKET,embedding:!!e.SEARCH_AI||!!e.SEARCH_EMBEDDINGS},note:'仅数据库可读性及配置快照；不代表实际云服务、浏览器或公网可用性。'};}
