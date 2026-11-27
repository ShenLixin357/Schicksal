import {apiFailure,readJson} from '../../../../server/http.ts';
import {adminLimited,saveLimited} from '../../../../server/exploration/limited.ts';
const headers={'Cache-Control':'private,no-store','Vary':'Cookie'};
export async function GET(r:Request){try{return Response.json(await adminLimited(r),{headers});}catch(e){return apiFailure(e,'限时活动暂不可用');}}
export async function POST(r:Request){try{return Response.json(await saveLimited(r,await readJson(r,8192)),{headers});}catch(e){return apiFailure(e,'限时活动未保存');}}
