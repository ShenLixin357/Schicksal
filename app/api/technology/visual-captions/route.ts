import {apiFailure,readJson} from '../../../../server/http.ts';
import {requireTechnologyMinister} from '../../../../server/auth/member.ts';
import {captionList,generateCaption,publishCaption} from '../../../../server/search/captions.ts';
import {headers} from '../../../../server/operations/authority.ts';
export async function GET(r:Request){try{return Response.json(await captionList(r),{headers})}catch(e){return apiFailure(e,'图像描述管理不可用')}}
export async function POST(r:Request){try{await requireTechnologyMinister(r);const p=await readJson(r,8192);return Response.json(p.action==='suggest'?await generateCaption(r,p):await publishCaption(r,p),{headers})}catch(e){return apiFailure(e,'图像描述操作失败')}}
