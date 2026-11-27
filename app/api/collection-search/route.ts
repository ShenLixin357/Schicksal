import {requireMember} from '../../../server/auth/member.ts';
import {ApiError,readJson,apiFailure} from '../../../server/http.ts';
import {executeSearch,sourceAccess} from '../../../server/search/service.ts';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
export async function GET(r:Request){try{return Response.json({available:await sourceAccess(r)},{headers});}catch(e){return apiFailure(e,'搜索服务暂不可用');}}
export async function POST(r:Request){try{await requireMember(r);const p=await readJson(r,8192);if(typeof p.query!=='string'||!p.query.trim()||p.query.length>400||!['books','all'].includes(String(p.scope))||!['hybrid','keyword'].includes(String(p.mode))||(p.answer!==undefined&&typeof p.answer!=='boolean'))throw new ApiError('检索参数无效',400);return Response.json(await executeSearch(r,p.query.trim(),p.scope as 'books'|'all',p.mode as 'hybrid'|'keyword',p.answer===true,p.filters,p.context),{headers});}catch(e){return apiFailure(e,'搜索服务暂不可用');}}
