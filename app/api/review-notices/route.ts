import {apiFailure,readJson} from '../../../server/http.ts';
import {listNotices,readNotice} from '../../../server/operations/review-notices.ts';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
export async function GET(r:Request){try{return Response.json(await listNotices(r),{headers});}catch(e){return apiFailure(e,'馆藏通知暂不可用');}}
export async function POST(r:Request){try{return Response.json(await readNotice(r,await readJson(r,4096)),{headers});}catch(e){return apiFailure(e,'通知未标记');}}
