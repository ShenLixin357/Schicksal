import {env} from 'cloudflare:workers';
import {ApiError} from '../http.ts';
import {requireTechnologyMinister} from '../auth/member.ts';
import {enabled} from '../ministry/policy.ts';
import {cookieToken,digest} from '../../app/member-session-core.ts';
import {incumbentTerm} from '../search/settings.ts';
import {EGGS} from './registry.ts';
// First release: only existing public, unrestricted navigation discoveries.
// The fixed item set and window are immutable once the event opens.
// Feature/room/identity-specific events need their own eligibility snapshots.
const IDs=['visit:home','visit:briefing','visit:calendar','visit:parliament','visit:honors','visit:market'] as const;
const items=IDs.map(id=>{const e=EGGS.find(x=>x.id===id);if(!e)throw Error('Missing public event source');return {id,title:e.title,region:e.region};});
type Row={event_id:string;revision:number;title:string;opens_at:number;closes_at:number;public_before:number;state:'scheduled'|'cancelled';items_json:string;actor:string;term:string;reason:string;at:number};
type Seen={event_id:string;item_id:string;first_seen_at:number};
const cfg=env as unknown as Record<string,unknown>;
export const limitedOn=()=>enabled(env)&&cfg.SCHICKSAL_EXPLORATION_ENABLED==='true'&&cfg.SCHICKSAL_LIMITED_EXPLORATION_ENABLED==='true';
function gate(){if(!limitedOn())throw new ApiError('限时探索尚未启用',404);}
const decode=(r:Row)=>({...r,items:(JSON.parse(r.items_json) as string[]).map(id=>{const x=items.find(i=>i.id===id);if(!x)throw Error('Unregistered event source');return x;})});
export async function limitedProgress(actor:string){
 if(!limitedOn())return {events:[],eventSeen:new Map<string,number>()};
 const [rows,seen]=await Promise.all([env.DB.prepare("SELECT * FROM imperial_limited_event_current WHERE state='scheduled' ORDER BY opens_at DESC,event_id").all<Row>(),env.DB.prepare('SELECT event_id,item_id,first_seen_at FROM imperial_limited_discoveries WHERE citizen_id=?').bind(actor).all<Seen>()]);
 return {events:rows.results.map(decode).map(r=>({id:r.event_id,title:r.title,opensAt:r.opens_at,closesAt:r.closes_at,publicBefore:r.public_before===1,items:r.items})),eventSeen:new Map(seen.results.map(r=>[r.event_id+':'+r.item_id,r.first_seen_at]))};
}
export async function limitedStatement(actor:string,id:string,now:number,tokenHash:string,mode:string){
 if(!limitedOn()||!IDs.some(x=>x===id))return null;
 // Same D1 batch as the existing cosmetic discovery. Repeated base interactions
 // can count once per event, but never create card/points/achievement evidence.
 return env.DB.prepare(`INSERT INTO imperial_limited_discoveries(citizen_id,event_id,event_revision,item_id,first_seen_at)
 SELECT ?,e.event_id,e.revision,?,? FROM imperial_limited_event_current e
 WHERE e.state='scheduled' AND e.opens_at<=? AND e.closes_at>? AND EXISTS(SELECT 1 FROM json_each(e.items_json) WHERE value=?)
 AND EXISTS(SELECT 1 FROM member_sessions s WHERE s.token_hash=? AND s.citizen_id=? AND s.expires_at>? AND s.account_mode=?
 AND (?='citizen' OR (s.minister_grant_expires_at>? AND EXISTS(SELECT 1 FROM current_office_holders WHERE office_id='technology' AND citizen_id=?) AND (SELECT COUNT(*) FROM current_office_holders WHERE office_id='technology')=1)))
 ON CONFLICT(citizen_id,event_id,item_id) DO NOTHING`).bind(actor,id,now,now,now,id,tokenHash,actor,now,mode,mode,now,actor);
}
export async function adminLimited(request:Request){
 const actor=await requireTechnologyMinister(request);gate();
 const term=await incumbentTerm(actor),r=await env.DB.prepare('SELECT * FROM imperial_limited_event_current ORDER BY opens_at DESC,event_id').all<Row>();
 const historyId=new URL(request.url).searchParams.get('history');
 if(historyId!==null){if(!/^[A-Za-z0-9_-]{1,80}$/.test(historyId))throw new ApiError('活动编号无效',400);const h=await env.DB.prepare('SELECT * FROM imperial_limited_event_history WHERE event_id=? ORDER BY revision DESC').bind(historyId).all<Row>();return {term,history:h.results.map(decode)};}
 return {term,items,events:r.results.map(decode)};
}
export async function saveLimited(request:Request,p:Record<string,unknown>){
 const actor=await requireTechnologyMinister(request);gate();
 const now=Date.now(),token=cookieToken(request),id=p.id,rev=p.expectedRevision,term=p.expectedTerm,reason=p.reason,title=p.title,opens=p.opensAt,closes=p.closesAt,selected=p.items;
 if(!token||typeof id!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(id)||typeof rev!=='number'||!Number.isSafeInteger(rev)||rev<0||typeof term!=='string'||!term||term.length>200||typeof reason!=='string'||!reason.trim()||reason.length>500||typeof title!=='string'||!title.trim()||title.length>100||typeof opens!=='number'||!Number.isSafeInteger(opens)||opens<=now||typeof closes!=='number'||!Number.isSafeInteger(closes)||closes<=opens||typeof p.publicBefore!=='boolean'||!['scheduled','cancelled'].includes(String(p.state))||!Array.isArray(selected)||!selected.length||selected.length>items.length||new Set(selected).size!==selected.length||selected.some(x=>!IDs.some(i=>i===x))||(rev===0&&p.state==='cancelled'))throw new ApiError('活动配置无效：须为未来时间、已登记公共项目及有效原因',400);
 const row=await env.DB.prepare(`INSERT INTO imperial_limited_event_history(event_id,revision,title,opens_at,closes_at,public_before,state,items_json,actor,term,reason,at)
 SELECT ?,?,?,?,?,?,?,?, ?,o.term_id,?,? FROM current_office_holders o
 WHERE o.office_id='technology' AND o.citizen_id=? AND o.term_id=? AND (SELECT COUNT(*) FROM current_office_holders WHERE office_id='technology')=1
 AND EXISTS(SELECT 1 FROM member_sessions s WHERE s.token_hash=? AND s.citizen_id=? AND s.account_mode='technology' AND s.expires_at>? AND s.minister_grant_expires_at>?)
 AND COALESCE((SELECT MAX(revision) FROM imperial_limited_event_history WHERE event_id=?),0)=?
 AND NOT EXISTS(SELECT 1 FROM imperial_limited_event_current WHERE event_id=? AND opens_at<=?)
 RETURNING revision`).bind(id,rev+1,title.trim(),opens,closes,p.publicBefore?1:0,p.state,JSON.stringify(selected),actor,reason.trim(),now,actor,term,await digest(token),actor,now,now,id,rev,id,now).first<{revision:number}>();
 if(!row)throw new ApiError('任期、活动版本或开放状态已变化，请刷新',409);
 return {id,revision:row.revision};
}
