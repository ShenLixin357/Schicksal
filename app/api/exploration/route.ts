import {readJson,apiFailure,ApiError} from '../../../server/http.ts';
import {requireMember} from '../../../server/auth/member.ts';
import {progress,hint,record,headers} from '../../../server/exploration/service.ts';
export async function GET(r:Request){try{const level=new URL(r.url).searchParams.get('hint');return Response.json(level===null?await progress(r):await hint(r,Number(level)),{headers});}catch(e){return apiFailure(e,'探索记录暂不可用');}}
export async function POST(r:Request){try{await requireMember(r);const p=await readJson(r,512);if(Object.keys(p).length!==1||typeof p.id!=='string'||p.id.length>80)throw new ApiError('探索记录格式无效',400);return Response.json(await record(r,p.id),{headers});}catch(e){return apiFailure(e,'探索记录暂不可用');}}
