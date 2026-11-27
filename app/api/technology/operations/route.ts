import {apiFailure,readJson} from '../../../../server/http.ts';
import {inbox,acknowledge} from '../../../../server/operations/inbox.ts';
import {headers} from '../../../../server/operations/authority.ts';
export async function GET(r:Request){try{return Response.json(await inbox(r),{headers})}catch(e){return apiFailure(e,'运行待办暂不可用')}}
export async function POST(r:Request){try{return Response.json(await acknowledge(r,await readJson(r,4096)),{headers})}catch(e){return apiFailure(e,'确认失败')}}
