import {apiFailure} from '../../../../server/http.ts';
import {audit,headers} from '../../../../server/exploration/service.ts';
export async function GET(r:Request){try{return Response.json(await audit(r),{headers});}catch(e){return apiFailure(e,'探索监察暂不可用');}}
