import {env} from 'cloudflare:workers';
import {enabled} from './policy.ts';
/** Import into existing session validation. Default off; DB faults fail closed. */
export async function accountFrozen(id:string):Promise<boolean>{
 if(!enabled(env))return false;
 const row=await env.DB.prepare("SELECT payload FROM ministry_current WHERE kind='account' AND target=?").bind(id).first<{payload:string}>();
 return row?JSON.parse(row.payload).frozen===true:false;
}
