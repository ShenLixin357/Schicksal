import {apiFailure} from '../../../../server/http.ts';
import {jobStatus,manualDocumentBatch} from '../../../../server/operations/document-jobs.ts';
import {headers} from '../../../../server/operations/authority.ts';
export async function GET(r:Request){try{return Response.json(await jobStatus(r),{headers})}catch(e){return apiFailure(e,'任务状态不可用')}}
export async function POST(r:Request){try{return Response.json(await manualDocumentBatch(r),{headers})}catch(e){return apiFailure(e,'批量提取失败')}}
