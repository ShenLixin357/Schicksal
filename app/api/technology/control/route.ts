import {requireTechnologyMinister} from '../../../../server/auth/member.ts';
import {apiFailure,readJson,ApiError} from '../../../../server/http.ts';
import {requireEnabled,snapshot,history,mutate,accessSettings} from '../../../../server/ministry/store.ts';
import {ACTIVE,FEATURES,decide} from '../../../../server/ministry/policy.ts';
const reply=(x:object)=>Response.json(x,{headers:{'Cache-Control':'private, no-store'}});
export async function GET(request:Request){try{await requireTechnologyMinister(request);requireEnabled();const q=new URL(request.url).searchParams;
 if(q.get('view')==='history'){const before=Number(q.get('before')??Number.MAX_SAFE_INTEGER);if(!Number.isSafeInteger(before)||before<1)throw new ApiError('无效分页。',400);return reply({history:await history(before)});}
 if(q.get('view')==='explain'){const member=q.get('member')??'',feature=q.get('feature')??'';if(!ACTIVE.some(x=>x===member)||!FEATURES.some(x=>x.id===feature))throw new ApiError('未知对象。',400);const p=await accessSettings(member,feature);return reply({...p,read:decide(p.mode,p.policy,'GET'),write:decide(p.mode,p.policy,'POST'),note:'仅解释本层规则，原有权限仍有效。'});}
 return reply(await snapshot());}catch(e){return apiFailure(e,'科技部数据暂时不可用。');}}
export async function POST(request:Request){try{const actor=await requireTechnologyMinister(request);requireEnabled();return reply({entry:await mutate(request,actor,await readJson(request,16384))});}catch(e){return apiFailure(e,'变更未保存，请检查当前状态。');}}
