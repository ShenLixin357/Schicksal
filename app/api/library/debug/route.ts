import {requireTechnologyMinister} from "../../../../server/auth/member.ts";
import {ApiError} from "../../../../server/http.ts";
const headers={"Cache-Control":"private, no-store"};
export async function GET(request:Request){
  try{await requireTechnologyMinister(request);return Response.json({authorized:true,mode:"local-preview-only",publish:false},{headers});}
  catch(e){return Response.json({error:e instanceof ApiError?e.message:"身份验证失败"},{status:e instanceof ApiError?e.status:503,headers});}
}
