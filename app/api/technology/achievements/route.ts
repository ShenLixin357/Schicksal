import {apiFailure,readJson} from '../../../../server/http.ts';
import {achievementAdmin,changeAchievement} from '../../../../server/achievements/admin.ts';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
export async function GET(r:Request){try{return Response.json(await achievementAdmin(r),{headers});}catch(e){return apiFailure(e,'成就管理暂不可用');}}
export async function POST(r:Request){try{return Response.json(await changeAchievement(r,await readJson(r,4096)),{headers});}catch(e){return apiFailure(e,'成就变更未保存');}}
