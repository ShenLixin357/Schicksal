import {apiFailure,readJson} from '../../../../server/http.ts';
import {hintAdmin,changeHint} from '../../../../server/exploration/hint-policy.ts';
import {headers} from '../../../../server/operations/authority.ts';
export async function GET(r:Request){try{return Response.json(await hintAdmin(r),{headers})}catch(e){return apiFailure(e,'提示管理不可用')}}
export async function POST(r:Request){try{return Response.json(await changeHint(r,await readJson(r,4096)),{headers})}catch(e){return apiFailure(e,'提示保存失败')}}
