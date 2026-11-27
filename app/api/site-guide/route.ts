import {ApiError,readJson,apiFailure} from '../../../server/http.ts';
import {requireMember} from '../../../server/auth/member.ts';
import {explorationOn} from '../../../server/exploration/service.ts';
import {guide,openGuide,headers} from '../../../server/guide/service.ts';
export async function GET(r:Request){try{await requireMember(r);if(new URL(r.url).searchParams.get("exploration")==="1"&&!explorationOn())throw new ApiError("探索模式尚未同步启用",503);const id=new URL(r.url).searchParams.get('open');return Response.json(id?await openGuide(r,id):await guide(r),{headers});}catch(e){return apiFailure(e,'帝国向导暂不可用');}}
export async function POST(r:Request){try{await requireMember(r);if(new URL(r.url).searchParams.get("exploration")==="1"&&!explorationOn())throw new ApiError("探索模式尚未同步启用",503);const p=await readJson(r,4096);if(typeof p.query!=='string'||!p.query.trim()||p.query.length>400||!['keyword','hybrid'].includes(String(p.mode))||(p.answer!==undefined&&typeof p.answer!=='boolean'))throw new ApiError('问询参数无效',400);return Response.json(await guide(r,p.query.trim(),p.mode as 'keyword'|'hybrid',p.answer===true),{headers});}catch(e){return apiFailure(e,'帝国向导暂不可用');}}
