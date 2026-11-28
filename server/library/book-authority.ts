import {env} from 'cloudflare:workers';
import {requireMember,requireTechnologyMinister} from '../auth/member.ts';
import {currentSession,cookieToken,digest} from '../../app/member-session.ts';
import {incumbentTerm} from '../search/settings.ts';
import {accessSettings} from '../ministry/store.ts';
import {decide} from '../ministry/policy.ts';
import {ApiError} from '../http.ts';
import {bookReady} from '../imperial-v3/review.mjs';
export async function bookAuthority(request:Request){
 const actor=await requireMember(request),session=await currentSession(request),token=cookieToken(request);
 if(!session||session.citizenId!==actor||!token)throw new ApiError('身份已变化',401);
 if(!bookReady(env))throw new ApiError('书稿统一审核尚未启用',404);
 const mode=session.accountMode,term=mode==='technology'?(await requireTechnologyMinister(request),await incumbentTerm(actor)):null;
 const policy=await accessSettings(actor,'library');if(!decide(policy.mode,policy.policy,request.method,mode==='technology').allowed)throw new ApiError('没有馆藏操作权限',403);
 return {actor,mode,term,tokenHash:await digest(token),now:Date.now()};
}
