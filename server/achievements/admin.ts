import {env} from 'cloudflare:workers';
import {ApiError} from '../http.ts';
import {requireTechnologyMinister} from '../auth/member.ts';
import {ACTIVE} from '../ministry/policy.ts';
import {incumbentTerm} from '../search/settings.ts';
import {cookieToken,digest} from '../../app/member-session-core.ts';
import {achievementsOn} from './service.ts';
import {ACHIEVEMENTS} from './registry.ts';
function gate(){if(!achievementsOn())throw new ApiError('成就管理尚未启用',404);}
type History={citizen_id:string;achievement_id:string;revision:number;state:string;source_seq:number|null;actor:string;reason:string;at:number};
export async function achievementAdmin(r:Request){
 const actor=await requireTechnologyMinister(r);gate();const term=await incumbentTerm(actor);
 const [current,history]=await Promise.all([env.DB.prepare('SELECT * FROM imperial_achievement_current ORDER BY citizen_id,achievement_id').all<History>(),env.DB.prepare('SELECT * FROM imperial_achievement_history ORDER BY at DESC,citizen_id,achievement_id,revision DESC LIMIT 100').all<History>()]);
 return {term,members:ACTIVE,definitions:ACHIEVEMENTS.map(({id,title})=>({id,title})),current:current.results,history:history.results};
}
export async function changeAchievement(r:Request,p:Record<string,unknown>){
 const actor=await requireTechnologyMinister(r);gate();const token=cookieToken(r),now=Date.now();
 const {citizen,achievement,expectedRevision,expectedTerm,state,reason,confirm}=p;
 if(!token||confirm!==true||typeof citizen!=='string'||!ACTIVE.some(x=>x===citizen)||typeof achievement!=='string'||!ACHIEVEMENTS.some(x=>x.id===achievement)||typeof expectedRevision!=='number'||!Number.isSafeInteger(expectedRevision)||expectedRevision<0||typeof expectedTerm!=='string'||!expectedTerm||expectedTerm.length>200||(state!=='granted'&&state!=='revoked')||(expectedRevision===0&&state==='revoked')||typeof reason!=='string'||!reason.trim()||reason.length>500)throw new ApiError('须确认成就、当前版本、任期及原因',400);
 const row=await env.DB.prepare(`INSERT INTO imperial_achievement_history(citizen_id,achievement_id,revision,state,source_seq,actor,reason,at)
 SELECT ?,?,?,?,NULL,?,?,? FROM current_office_holders o
 WHERE o.office_id='technology' AND o.citizen_id=? AND o.term_id=? AND (SELECT COUNT(*) FROM current_office_holders WHERE office_id='technology')=1
 AND EXISTS(SELECT 1 FROM member_sessions s WHERE s.token_hash=? AND s.citizen_id=? AND s.account_mode='technology' AND s.expires_at>? AND s.minister_grant_expires_at>?)
 AND COALESCE((SELECT revision FROM imperial_achievement_current WHERE citizen_id=? AND achievement_id=?),0)=?
 AND COALESCE((SELECT state FROM imperial_achievement_current WHERE citizen_id=? AND achievement_id=?),'none')<>?
 RETURNING revision,state`).bind(citizen,achievement,expectedRevision+1,state,actor,'任期 '+expectedTerm+' · '+reason.trim(),now,actor,expectedTerm,await digest(token),actor,now,now,citizen,achievement,expectedRevision,citizen,achievement,state).first();
 if(!row)throw new ApiError('任期、成就状态或版本已变化',409);return row;
}
