import {requireMember} from '../../../../server/auth/member.ts';
import {ApiError} from '../../../../server/http.ts';
import {configuredDigital} from '../../../../server/digital/service.ts';
export async function GET(request:Request){try{await requireMember(request);const q=new URL(request.url).searchParams;return await configuredDigital().large.download(q.get('object')??'',q.get('version')??'');}catch(e){return Response.json({error:e instanceof ApiError?e.message:'藏品暂时不可用'},{status:e instanceof ApiError?e.status:503,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});}}
