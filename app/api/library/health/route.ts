import {env} from 'cloudflare:workers';
import {requireTechnologyMinister} from '../../../../server/auth/member.ts';
import {ApiError} from '../../../../server/http.ts';
import {requireLibraryPreview} from '../../../../server/library/preview-gate.ts';
import {healthReport} from '../../../../server/library/health.ts';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
export async function GET(request:Request){try{await requireTechnologyMinister(request);requireLibraryPreview(env,'governance');return Response.json(await healthReport(env.DB),{headers});}catch(e){return Response.json({error:e instanceof ApiError?e.message:'馆藏健康检查暂时不可用'},{status:e instanceof ApiError?e.status:503,headers});}}
