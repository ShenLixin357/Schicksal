import {env} from 'cloudflare:workers';
import {buildProgress,classifiedEggs,freeHintEggs} from '../imperial-v3/exploration-progress.mjs';
import {currentAchievements,achievementsOn} from '../achievements/service.ts';
import {createHash} from 'node:crypto';
import {ApiError} from '../http.ts';
import {requireMember,requireTechnologyMinister} from '../auth/member.ts';
import {currentSession} from '../../app/member-session.ts';
import {cookieToken,digest} from '../../app/member-session-core.ts';
import {enabled,decide} from '../ministry/policy.ts';
import {accessSettings} from '../ministry/store.ts';
import {settings} from '../search/settings.ts';
import {REGISTRY,type GuideTarget} from '../guide/registry.ts';
import {EGGS,type Egg} from './registry.ts';
import {hintChoices,clues} from './hint-policy.ts';
const e=env as unknown as Record<string,unknown>;
export const explorationOn=()=>enabled(env)&&e.SCHICKSAL_GUIDE_ENABLED==='true'&&e.SCHICKSAL_EXPLORATION_ENABLED==='true';
function gate(){if(!explorationOn())throw new ApiError('探索系统未启用',404);}
export const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
async function context(r:Request){const actor=await requireMember(r);gate();const session=await currentSession(r);if(!session||session.citizenId!==actor)throw new ApiError('身份已变化',401);const elevated=session.accountMode==='technology';const allowed=new Set<GuideTarget>();let searchOpen=false;try{searchOpen=(await settings()).effective.open}catch{/* search not ready */}
 for(const item of REGISTRY){if(item.audience==='minister'&&!elevated)continue;if(item.audience==='committee'&&!['amberina','zxy','truth'].includes(actor))continue;if(item.id==='profile'&&elevated)continue;if(item.id==='library'&&e.SCHICKSAL_GUIDE_LIBRARY_READY!=='true')continue;if(item.requiresSearch&&(e.SCHICKSAL_GUIDE_LIBRARY_READY!=='true'||e.SCHICKSAL_LIBRARY_V11_ENABLED!=='true'||e.SCHICKSAL_DISCOVERY_ENABLED!=='true'||e.SCHICKSAL_SEARCH_ENABLED!=='true'||!searchOpen))continue;if(item.requiresCollections&&e.SCHICKSAL_GUIDE_COLLECTIONS_READY!=='true')continue;
 if(item.feature){const p=await accessSettings(actor,item.feature);if(!decide(p.mode,p.policy,'GET',elevated).allowed)continue;}if(item.requiresSearch){const p=await accessSettings(actor,'archives');if(!decide(p.mode,p.policy,'GET',elevated).allowed)continue;}allowed.add(item.id);}
 return {actor,session,eggs:(classifiedEggs(EGGS) as Egg[]).filter((x:Egg)=>allowed.has(x.target)&&(!x.id.startsWith("lounge:")||e.SCHICKSAL_EXPLORATION_LOUNGE_READY==='true'))};}
type Seen={egg_id:string;first_seen_at:number};
async function seen(actor:string){return (await env.DB.prepare('SELECT egg_id,first_seen_at FROM exploration_discoveries WHERE citizen_id=?').bind(actor).all<Seen>()).results;}
export async function knownTargets(r:Request){const c=await context(r),ids=new Set((await seen(c.actor)).map(x=>x.egg_id));return new Set(c.eggs.filter(x=>x.kind==='visit'&&ids.has(x.id)).map(x=>x.target));}
export async function progress(r:Request){const c=await context(r),rows=new Map((await seen(c.actor)).map(x=>[x.egg_id,x.first_seen_at]));const awarded=await currentAchievements(c.actor);return {...buildProgress(c.eggs,rows,{achievements:awarded,achievementSeen:new Map(awarded.map(x=>[x.id,x.unlockedAt]))}),achievementCoverage:achievementsOn()?'awarded-only-card-producer-pending':'disabled'};}
export async function hint(r:Request,level:number){if(!Number.isInteger(level)||level<1||level>3)throw new ApiError('提示级别无效',400);const c=await context(r),ids=new Set((await seen(c.actor)).map(x=>x.egg_id));const choices=await hintChoices();const remaining=(freeHintEggs(c.eggs) as Egg[]).filter((x:Egg)=>!ids.has(x.id));if(!remaining.length)return {complete:true,hint:null};const eligible=remaining.filter(x=>clues(x,choices.get(x.id)?.palette).length===3);if(!eligible.length)return {complete:false,level,hint:'目前没有更多低语。请继续自由探索。'};const seed=createHash('sha256').update(c.actor+':'+new Date().toISOString().slice(0,10)).digest().readUInt32BE(0);const egg=eligible[seed%eligible.length];return {complete:false,level,hint:clues(egg,choices.get(egg.id)?.palette)[level-1]};}
/** Client interaction telemetry is cosmetic, never proof for entitlements. */
export async function record(r:Request,id:string){const c=await context(r),egg=c.eggs.find(x=>x.id===id);if(!egg)throw new ApiError('探索记录不可用',404);const token=cookieToken(r);if(!token)throw new ApiError('会话失效',401);const now=Date.now();const row=await env.DB.prepare(`INSERT INTO exploration_discoveries(citizen_id,egg_id,first_seen_at) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM member_sessions s WHERE s.token_hash=? AND s.citizen_id=? AND s.expires_at>? AND s.account_mode=? AND (?='citizen' OR (s.minister_grant_expires_at>? AND EXISTS(SELECT 1 FROM current_office_holders WHERE office_id='technology' AND citizen_id=?) AND (SELECT COUNT(*) FROM current_office_holders WHERE office_id='technology')=1))) ON CONFLICT(citizen_id,egg_id) DO NOTHING RETURNING first_seen_at`).bind(c.actor,egg.id,now,await digest(token),c.actor,now,c.session.accountMode,c.session.accountMode,now,c.actor).first<{first_seen_at:number}>();const live=await context(r);if(live.actor!==c.actor||!live.eggs.some(x=>x.id===id))throw new ApiError('探索资格已变化',409);return {recorded:!!row,member:c.actor,mode:c.session.accountMode};}
export async function audit(r:Request){await requireTechnologyMinister(r);gate();const data=(await env.DB.prepare('SELECT egg_id,COUNT(*) AS count FROM exploration_discoveries GROUP BY egg_id').bind().all<{egg_id:string;count:number}>()).results;const counts=new Map(data.map(x=>[x.egg_id,x.count]));return {coverage:'registered-preview',total:EGGS.length,entries:EGGS.map(({id,title,region,kind})=>({id,title,region,kind,count:counts.get(id)??0})),unknownRecords:data.filter(x=>!EGGS.some(e=>e.id===x.egg_id)).length};}
