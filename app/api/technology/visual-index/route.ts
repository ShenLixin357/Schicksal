import {apiFailure} from '../../../../server/http.ts';
import {visualStatus,visualBatch} from '../../../../server/search/visual.ts';
import {headers} from '../../../../server/operations/authority.ts';
export async function GET(r:Request){try{return Response.json(await visualStatus(r),{headers})}catch(e){return apiFailure(e,'视觉索引不可用')}}
export async function POST(r:Request){try{return Response.json(await visualBatch(r),{headers})}catch(e){return apiFailure(e,'视觉索引失败')}}
