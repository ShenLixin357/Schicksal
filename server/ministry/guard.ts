import {env} from 'cloudflare:workers';
import {currentSession} from '../../app/member-session.ts';
import {enabled,featuresForRequest,decide} from './policy.ts';
import {accessSettings} from './store.ts';
/** Worker calls this AFTER the original standalone boundary and BEFORE assets/router. */
export async function ministryFeatureBoundary(request:Request):Promise<Response|null>{
 if(!enabled(env))return null;const url=new URL(request.url);const f=featuresForRequest(url);if(!f.length)return null;
 const reply=(error:string,status:number)=>Response.json({error},{status,headers:{'Cache-Control':'private, no-store'}});
 try{const s=await currentSession(request);if(!s)return reply('请先登录。',401);for(const feature of f){const {mode,policy}=await accessSettings(s.citizenId,feature);const d=decide(mode,policy,request.method,s.accountMode==='technology');if(!d.allowed)return reply(d.reason,403);}return null;}catch{return reply('权限校验暂时不可用。',503);}
}
