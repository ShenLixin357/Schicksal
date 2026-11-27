import {env} from 'cloudflare:workers';
import {ApiError} from '../http.ts';
import {enabled,ACTIVE} from '../ministry/policy.ts';
import {requireMember} from '../auth/member.ts';
import {ACHIEVEMENTS} from './registry.ts';
const config=env as unknown as Record<string,unknown>;
export const achievementsOn=()=>enabled(env)&&config.SCHICKSAL_ACHIEVEMENTS_ENABLED==='true';
type Award={achievement_id:string;at:number};
export async function currentAchievements(actor:string){
 if(!achievementsOn())return [];
 const rows=(await env.DB.prepare("SELECT achievement_id,at FROM imperial_achievement_current WHERE citizen_id=? AND state='granted' ORDER BY at DESC").bind(actor).all<Award>()).results;
 return rows.flatMap(r=>{const a=ACHIEVEMENTS.find(x=>x.id===r.achievement_id);return a?[{id:a.id,title:a.title,description:a.description,explanation:a.explanation,unlockedAt:r.at}]:[]});
}
export async function myAchievements(request:Request){
 const actor=await requireMember(request);
 if(!achievementsOn())throw new ApiError('成就系统尚未启用',404);
 return {achievements:await currentAchievements(actor),cardProducerReady:config.SCHICKSAL_CARD_ACHIEVEMENTS_READY==='true'};
}
/** Internal port only: the real card producer must batch this statement with
 * its own authoritative mutation, check source-id replay and map final card IDs.
 * Do not accept card ID / action / actor from an unverified browser request.
 */
export function cardActionStatement(event:{sourceId:string;actor:string;action:'draw'|'use';cardId:string;at:number}){
 if(!achievementsOn()||config.SCHICKSAL_CARD_ACHIEVEMENTS_READY!=='true')throw new Error('Card achievement producer not activated');
 if(!ACTIVE.some(x=>x===event.actor)||!['draw','use'].includes(event.action)||!event.sourceId||event.sourceId.length>160||!/^[A-Za-z0-9_-]{1,120}$/.test(event.cardId)||!Number.isSafeInteger(event.at)||event.at<=0)throw new Error('Invalid authoritative card event');
 // A repeated source event cannot create a new sequence position or award.
 return env.DB.prepare("INSERT INTO imperial_card_actions(source_id,citizen_id,action,card_id,at) VALUES(?,?,?,?,?) ON CONFLICT(source_id) DO NOTHING").bind(event.sourceId,event.actor,event.action,event.cardId,event.at);
}
