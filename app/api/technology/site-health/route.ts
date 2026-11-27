import {siteHealth} from '../../../../server/search/site-health.ts';
import {apiFailure} from '../../../../server/http.ts';
export async function GET(r:Request){try{return Response.json(await siteHealth(r),{headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}})}catch(e){return apiFailure(e,'运行监察暂不可用')}}
