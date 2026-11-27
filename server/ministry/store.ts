import {env} from 'cloudflare:workers';
import {combineRestriction} from '../imperial-v3/policy-runtime.mjs';
import {ApiError} from '../http.ts';
import {cookieToken,digest} from '../../app/member-session-core.ts';
import {ACTIVE,MEMBERS,FEATURES,defaults,PROFILE_EMPTY,enabled,type Kind,type Profile,type Mode,type Policy} from './policy.ts';
export type Entry={id:number;kind:Kind;target:string;revision:number;payload:Record<string,unknown>;actor:string;term:string;reason:string;created_at:number};
type Row=Omit<Entry,'payload'>&{payload:string};
const decode=(r:Row):Entry=>({...r,payload:JSON.parse(r.payload)});
export function requireEnabled(){if(!enabled(env))throw new ApiError('此环境尚未启用科技部 V2。',404);}
const member=(s:string)=>MEMBERS.some(x=>x===s);
const active=(s:string)=>ACTIVE.some(x=>x===s);
const feature=(s:string)=>FEATURES.some(x=>x.id===s);
const kinds=['profile','account','permission','feature'] as const;
function validTarget(k:Kind,t:string){if(k==='profile')return member(t);if(k==='account')return active(t);if(k==='feature')return feature(t);const [m,f,...rest]=t.split(':');return rest.length===0&&active(m)&&feature(f);}
function object(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))throw new ApiError('无效配置。',400);return v as Record<string,unknown>;}
export function normalize(k:Kind,v:unknown):Record<string,unknown>{const p=object(v),expected=Object.keys(defaults(k));if(Object.keys(p).length!==expected.length||Object.keys(p).some(x=>!expected.includes(x)))throw new ApiError('字段不受支持或缺失。',400);
 if(k==='profile'){const out:Profile={...PROFILE_EMPTY};for(const key of Object.keys(out) as (keyof Profile)[]){const x=p[key];if(typeof x!=='string'||x.length>(key==='bio'?2000:120)||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x))throw new ApiError('资料格式或长度不合法。',400);out[key]=x.trim();}return out;}
 if(k==='account'){if(typeof p.frozen!=='boolean')throw new ApiError('无效账号状态。',400);return {frozen:p.frozen};}
 if(k==='permission'){if(typeof p.policy!=='string'||!['inherit','deny','read','use'].includes(p.policy))throw new ApiError('无效权限。',400);return {policy:p.policy};}
 if(typeof p.mode!=='string'||!['open','read-only','closed'].includes(p.mode))throw new ApiError('无效功能状态。',400);return {mode:p.mode};}
export async function latest(k:Kind,t:string){const r=await env.DB.prepare('SELECT * FROM ministry_current WHERE kind=? AND target=?').bind(k,t).first<Row>();return r?decode(r):null;}
export async function history(before:number,limit=50){const rows=await env.DB.prepare('SELECT * FROM ministry_changes WHERE id<? ORDER BY id DESC LIMIT ?').bind(before,limit).all<Row>();return rows.results.map(decode);}
export async function snapshot(){const rows=await env.DB.prepare('SELECT * FROM ministry_current ORDER BY kind,target').all<Row>();const sessions=await env.DB.prepare('SELECT citizen_id AS citizenId,COUNT(*) AS count FROM member_sessions WHERE expires_at>? GROUP BY citizen_id').bind(Date.now()).all<{citizenId:string;count:number}>();const offices=await env.DB.prepare("SELECT citizen_id AS citizenId,term_id AS term FROM current_office_holders WHERE office_id='technology'").all<{citizenId:string;term:string}>();return {members:MEMBERS.map(id=>({id,loginSupported:active(id)})),features:FEATURES,current:rows.results.map(decode),sessions:sessions.results,incumbent:offices.results.length===1?offices.results[0]:null,scope:'preview-only',coverage:'listed-paths-only',sourceSha:(env as unknown as {SCHICKSAL_PREVIEW_COMMIT:string}).SCHICKSAL_PREVIEW_COMMIT,asOf:Date.now()};}
export async function publicRoster(){const rows=await env.DB.prepare("SELECT target,payload,revision FROM ministry_current WHERE kind='profile'").all<{target:string;payload:string;revision:number}>();return rows.results.filter(x=>active(x.target)).map(x=>({id:x.target,profile:normalize('profile',JSON.parse(x.payload)),revision:x.revision}));}
export async function mutate(request:Request,actor:string,input:unknown){const p=object(input);const k=p.kind as Kind,t=p.target;if(!kinds.includes(k)||typeof t!=='string'||!validTarget(k,t))throw new ApiError('未知管理对象。',400);if(typeof p.expectedTerm!=='string'||!p.expectedTerm||p.expectedTerm.length>200)throw new ApiError('必须提供当前部长任期。',400);const expected=p.expectedRevision;if(typeof expected!=='number'||!Number.isSafeInteger(expected)||expected<0)throw new ApiError('必须提供当前版本。',400);if(typeof p.reason!=='string'||!p.reason.trim()||p.reason.length>500)throw new ApiError('必须填写变更原因（最多500字）。',400);
 let value:Record<string,unknown>;
 if(p.restoreRevision!==undefined){const rev=p.restoreRevision;if(typeof rev!=='number'||!Number.isSafeInteger(rev)||rev<0||rev>expected)throw new ApiError('无效历史版本。',400);if(rev===0)value=defaults(k);else{const old=await env.DB.prepare('SELECT payload FROM ministry_changes WHERE kind=? AND target=? AND revision=?').bind(k,t,rev).first<{payload:string}>();if(!old)throw new ApiError('历史版本不存在。',404);value=normalize(k,JSON.parse(old.payload));}}
 else value=normalize(k,p.payload);
 if(k==='account'&&value.frozen===true&&t===actor)throw new ApiError('不能冻结当前部长账号。',409);
 const token=cookieToken(request);if(!token)throw new ApiError('会话已失效。',401);const now=Date.now();const h=await digest(token);
 // Single conditional INSERT: revision CAS, current sole incumbent, exact elevated live session.
 // No session hashes are stored in the audit log. DB trigger revokes frozen sessions atomically.
 const result=await env.DB.prepare(`INSERT INTO ministry_changes(kind,target,revision,payload,actor,term,reason,created_at)
 SELECT ?,?,?,?, ?,o.term_id,?,? FROM current_office_holders o
 WHERE o.office_id='technology' AND o.citizen_id=? AND o.term_id=? AND (SELECT COUNT(*) FROM current_office_holders WHERE office_id='technology')=1
 AND EXISTS(SELECT 1 FROM member_sessions s WHERE s.token_hash=? AND s.citizen_id=? AND s.account_mode='technology' AND s.expires_at>? AND s.minister_grant_expires_at>?)
 AND COALESCE((SELECT MAX(revision) FROM ministry_changes WHERE kind=? AND target=?),0)=?
 RETURNING *`).bind(k,t,expected+1,JSON.stringify(value),actor,p.reason.trim(),now,actor,p.expectedTerm,h,actor,now,now,k,t,expected).first<Row>();
 if(!result)throw new ApiError('版本或部长身份已变化；请刷新后重试。',409);return decode(result);
}
export async function accessSettings(id:string,f:string):Promise<{mode:Mode;policy:Policy}>{const [a,b]=await Promise.all([latest('feature',f),latest('permission',id+':'+f)]);const policy=await combineRestriction(env.DB,env,id,f,(b?.payload.policy??'inherit') as Policy) as Policy;return {mode:(a?.payload.mode??'open') as Mode,policy};}
