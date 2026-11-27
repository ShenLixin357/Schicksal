import {apiFailure} from '../../../../server/http.ts';
import {visualSearch} from '../../../../server/search/visual.ts';
import {headers} from '../../../../server/operations/authority.ts';
export async function POST(r:Request){try{return Response.json(await visualSearch(r),{headers})}catch(e){return apiFailure(e,'视觉检索失败')}}
