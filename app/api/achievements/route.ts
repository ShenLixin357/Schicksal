import {apiFailure} from '../../../server/http.ts';
import {myAchievements} from '../../../server/achievements/service.ts';
export async function GET(request:Request){
 try{return Response.json(await myAchievements(request),{headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});}
 catch(e){return apiFailure(e,'成就记录暂不可用');}
}
