import {indexStatus,manualSync,saveSearchSettings} from '../../../../server/search/service.ts';
import {apiFailure,readJson} from '../../../../server/http.ts';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
export async function GET(r:Request){try{return Response.json(await indexStatus(r),{headers});}catch(e){return apiFailure(e,'索引状态不可用');}}
export async function POST(r:Request){try{return Response.json(await manualSync(r),{headers});}catch(e){return apiFailure(e,'索引任务未完成');}}

export async function PUT(r:Request){try{return Response.json(await saveSearchSettings(r,await readJson(r,4096)),{headers});}catch(e){return apiFailure(e,'搜索设置未保存');}}
