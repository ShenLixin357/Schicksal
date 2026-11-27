import {apiFailure,readJson} from '../../../../server/http.ts';
import {requireTechnologyMinister} from '../../../../server/auth/member.ts';
import {documentList,extractDocument} from '../../../../server/search/documents.ts';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
export async function GET(r:Request){try{return Response.json(await documentList(r),{headers})}catch(e){return apiFailure(e,'文档索引不可用')}}
export async function POST(r:Request){try{await requireTechnologyMinister(r);return Response.json(await extractDocument(r,await readJson(r,4096)),{headers})}catch(e){return apiFailure(e,'文档提取失败')}}
