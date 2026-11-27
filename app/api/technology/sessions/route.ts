import {apiFailure,readJson} from '../../../../server/http.ts';
import {sessionOverview,revokeSessions} from '../../../../server/operations/sessions.ts';
import {headers} from '../../../../server/operations/authority.ts';
export async function GET(r:Request){try{return Response.json(await sessionOverview(r),{headers})}catch(e){return apiFailure(e,'会话监察不可用')}}
export async function POST(r:Request){try{return Response.json(await revokeSessions(r,await readJson(r,4096)),{headers})}catch(e){return apiFailure(e,'会话撤销失败')}}
