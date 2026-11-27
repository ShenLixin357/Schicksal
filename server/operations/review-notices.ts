import {env} from 'cloudflare:workers';
import {ApiError} from '../http.ts';
import {requireMember,requireTechnologyMinister} from '../auth/member.ts';
import {currentSession,cookieToken,digest} from '../../app/member-session.ts';
import {enabled} from '../imperial-v3/review.mjs';
import {incumbentTerm} from '../search/settings.ts';
const cfg=env as unknown as Record<string,unknown>;
type Row={kind:string;entity:string;version:string;revision:number;state:string;at:number;reason:string;author:string;category:string;read_at:number|null};
async function context(r:Request){
 const actor=await requireMember(r),session=await currentSession(r),token=cookieToken(r);
 if(!session||session.citizenId!==actor||!token)throw new ApiError('身份已变化',401);
 if(!enabled(env)||cfg.SCHICKSAL_V32_CANONICAL_INTAKE_READY!=='true'||cfg.SCHICKSAL_REVIEW_NOTICES_ENABLED!=='true')throw new ApiError('馆藏审核通知尚未开放',404);
 const mode=session.accountMode,scope=mode==='technology'?(await requireTechnologyMinister(r),await incumbentTerm(actor)):'personal';
 return {actor,mode,scope,hash:await digest(token),now:Date.now()};
}
// Minister sees current unresolved pending items; author sees every actual decision
// revision. No duplicate notification event stream or invented message.
const citizenFilter="i.author=? AND h.revision>1";
const ministerFilter="h.state='pending' AND h.revision=(SELECT MAX(x.revision) FROM imperial_review_history x WHERE x.kind=h.kind AND x.entity=h.entity AND x.version=h.version)";
const base=" FROM imperial_review_history h JOIN imperial_review_items i ON i.kind=h.kind AND i.entity=h.entity AND i.version=h.version ";
const live="EXISTS(SELECT 1 FROM member_sessions s WHERE s.token_hash=? AND s.citizen_id=? AND s.account_mode=? AND s.expires_at>? AND (?='citizen' OR (s.minister_grant_expires_at>? AND EXISTS(SELECT 1 FROM current_office_holders o WHERE o.office_id='technology' AND o.citizen_id=s.citizen_id AND o.term_id=?) AND (SELECT COUNT(*) FROM current_office_holders WHERE office_id='technology')=1)))";
type C=Awaited<ReturnType<typeof context>>;
const auth=(c:C)=>[c.hash,c.actor,c.mode,c.now,c.mode,c.now,c.scope];
export async function listNotices(r:Request){
 const c=await context(r),f=c.mode==='technology'?ministerFilter:citizenFilter,args=c.mode==='technology'?[]:[c.actor];
 const rows=await env.DB.prepare("SELECT h.kind,h.entity,h.version,h.revision,h.state,h.at,h.reason,i.author,i.category,n.read_at"+base+" LEFT JOIN imperial_notice_reads n ON n.citizen_id=? AND n.mode=? AND n.scope=? AND n.kind=h.kind AND n.entity=h.entity AND n.version=h.version AND n.revision=h.revision WHERE "+f+" AND "+live+" ORDER BY (n.read_at IS NULL) DESC,h.at DESC,h.kind,h.entity,h.version,h.revision DESC LIMIT 100").bind(c.actor,c.mode,c.scope,...args,...auth(c)).all<Row>();
 const count=await env.DB.prepare("SELECT COUNT(*) total"+base+" WHERE "+f+" AND "+live+" AND NOT EXISTS(SELECT 1 FROM imperial_notice_reads n WHERE n.citizen_id=? AND n.mode=? AND n.scope=? AND n.kind=h.kind AND n.entity=h.entity AND n.version=h.version AND n.revision=h.revision)").bind(...args,...auth(c),c.actor,c.mode,c.scope).first<{total:number}>();
 const after=await context(r);if(after.actor!==c.actor||after.mode!==c.mode||after.scope!==c.scope)throw new ApiError('会话已变化',409);
 return {mode:c.mode,unread:count?.total??0,items:rows.results,limit:100};
}
export async function readNotice(r:Request,p:Record<string,unknown>){
 const c=await context(r),f=c.mode==='technology'?ministerFilter:citizenFilter,args=c.mode==='technology'?[]:[c.actor];
 const {kind,entity,version,revision}=p;
 if(typeof kind!=='string'||!['book','gallery','digital'].includes(kind)||typeof entity!=='string'||typeof version!=='string'||![entity,version].every(x=>/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(x))||typeof revision!=='number'||!Number.isSafeInteger(revision)||revision<1)throw new ApiError('通知编号无效',400);
 const result=await env.DB.prepare("INSERT INTO imperial_notice_reads(citizen_id,mode,scope,kind,entity,version,revision,read_at) SELECT ?,?,?,h.kind,h.entity,h.version,h.revision,?"+base+" WHERE h.kind=? AND h.entity=? AND h.version=? AND h.revision=? AND "+f+" AND "+live+" ON CONFLICT DO NOTHING").bind(c.actor,c.mode,c.scope,c.now,kind,entity,version,revision,...args,...auth(c)).run();
 // No read or existence disclosure for non-recipient / stale sessions.
 return {recorded:result.meta.changes===1};
}
