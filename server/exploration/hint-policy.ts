import {env} from 'cloudflare:workers';
import {ApiError} from '../http.ts';
import {requireTechnologyMinister} from '../auth/member.ts';
import {EGGS,type Egg} from './registry.ts';
import {gate,operationsOn,authority,authArgs,validAuthority} from '../operations/authority.ts';
import {incumbentTerm} from '../search/settings.ts';
// Fixed, reviewed palettes prevent admin or model text from accidentally revealing a trigger.
export const PALETTES={original:null,poetic:['未被照亮的记忆仍在等候。','某些回应不必用语言表达。','让好奇心决定下一步。'],quiet:['还有值得驻足的风景。','熟悉并不意味着看尽。','给自己一点探索的时间。'],observant:['表象之外，也许还有回响。','留意不同事物之间的联系。','从另一个角度观察熟悉的世界。'],withhold:[]} as const;
type Palette=keyof typeof PALETTES;
type Row={egg_id:string;revision:number;palette:Palette;actor:string;term:string;reason:string;created_at:number};
export async function hintChoices(){if(!operationsOn())return new Map<string,Row>();const r=await env.DB.prepare('SELECT h.* FROM exploration_hint_history h WHERE NOT EXISTS(SELECT 1 FROM exploration_hint_history n WHERE n.egg_id=h.egg_id AND n.revision>h.revision)').all<Row>();return new Map(r.results.map(x=>[x.egg_id,x]));}
export function clues(egg:Egg,p?:Palette){return p&&p!=='original'?PALETTES[p]:egg.hint;}
export async function hintAdmin(r:Request){const actor=await requireTechnologyMinister(r);gate();const rows=await hintChoices();return {term:await incumbentTerm(actor),entries:EGGS.map(e=>({id:e.id,title:e.title,region:e.region,revision:rows.get(e.id)?.revision??0,palette:rows.get(e.id)?.palette??'original'})),palettes:Object.keys(PALETTES)};}
export async function changeHint(r:Request,p:Record<string,unknown>){const a=await authority(r,p);const id=p.id,rev=p.expectedRevision;let palette=p.palette;if(typeof id!=='string'||!EGGS.some(e=>e.id===id)||typeof rev!=='number'||!Number.isSafeInteger(rev)||rev<0)throw new ApiError('无效提示对象或版本',400);if(p.restoreRevision!==undefined){const old=p.restoreRevision;if(typeof old!=='number'||!Number.isSafeInteger(old)||old<0||old>rev)throw new ApiError('无效历史版本',400);palette=old===0?'original':(await env.DB.prepare('SELECT palette FROM exploration_hint_history WHERE egg_id=? AND revision=?').bind(id,old).first<{palette:string}>())?.palette;}
if(typeof palette!=='string'||!Object.hasOwn(PALETTES,palette))throw new ApiError('仅允许已审核的无剧透提示方案',400);const row=await env.DB.prepare(`INSERT INTO exploration_hint_history(egg_id,revision,palette,actor,term,reason,created_at) SELECT ?,?,?,?,o.term_id,?,? FROM current_office_holders o WHERE ${validAuthority} AND COALESCE((SELECT MAX(revision) FROM exploration_hint_history WHERE egg_id=?),0)=? RETURNING revision`).bind(id,rev+1,palette,a.actor,a.reason,a.now,...authArgs(a),id,rev).first();if(!row)throw new ApiError('任期或配置已变化',409);return row;}
