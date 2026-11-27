import {searchDiagnostics} from '../../../../server/search/service.ts';
import {apiFailure} from '../../../../server/http.ts';
export async function GET(r:Request){try{return Response.json(await searchDiagnostics(r),{headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}})}catch(e){return apiFailure(e,'搜索诊断暂不可用')}}
