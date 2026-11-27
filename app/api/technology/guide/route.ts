import {ApiError,apiFailure,readJson} from '../../../../server/http.ts';
import {requireTechnologyMinister} from '../../../../server/auth/member.ts';
import {adminGuide,guideHistory,updateGuide,syncGuide,headers} from '../../../../server/guide/service.ts';
export async function GET(r:Request){try{const id=new URL(r.url).searchParams.get('history');return Response.json(id?await guideHistory(r,id):await adminGuide(r),{headers});}catch(e){return apiFailure(e,'向导管理暂不可用');}}
export async function PUT(r:Request){try{await requireTechnologyMinister(r);return Response.json(await updateGuide(r,await readJson(r,16384)),{headers});}catch(e){return apiFailure(e,'向导说明保存失败');}}
export async function POST(r:Request){try{await requireTechnologyMinister(r);const action=new URL(r.url).searchParams.get('action');if(action!=='index')throw new ApiError('未知操作',400);return Response.json(await syncGuide(r),{headers});}catch(e){return apiFailure(e,'向导索引暂不可用');}}
