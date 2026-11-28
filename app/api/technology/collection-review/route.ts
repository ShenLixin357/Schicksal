import {env} from "cloudflare:workers";
import {currentSession,cookieToken,digest} from "../../../member-session.ts";
import {requireMember,requireTechnologyMinister} from "../../../../server/auth/member.ts";
import {ApiError,readJson} from "../../../../server/http.ts";
import {enabled,reviewList,reviewDecision,submitReview,assignSlot,displayBook,galleryReady,bookReady,fullReviewReady} from "../../../../server/imperial-v3/review.mjs";
const headers={"Cache-Control":"private,no-store","Vary":"Cookie"};
async function authority(request:Request){
 const actor=await requireMember(request),session=await currentSession(request),token=cookieToken(request);
 if(!session||session.citizenId!==actor||!token)throw new ApiError("会话已变化",401);
 let term:string|null=null;
 if(session.accountMode==="technology"){
  await requireTechnologyMinister(request);
  const rows=await env.DB.prepare("SELECT citizen_id,term_id FROM current_office_holders WHERE office_id='technology' LIMIT 2").all<{citizen_id:string;term_id:string}>();
  if(rows.results.length!==1||rows.results[0].citizen_id!==actor)throw new ApiError("部长任期已变化",403);
  term=rows.results[0].term_id;
 }
 return {actor,mode:session.accountMode,term,tokenHash:await digest(token),now:Date.now()};
}
function gate(){if(!enabled(env))throw new ApiError("馆藏审核预览尚未启用",404);}
function error(e:unknown){const s=e as {status?:number;message?:string};const status=[400,401,403,404,409,413].includes(s?.status??0)?s.status!:503;return Response.json({error:status===503?"馆藏审核暂不可用":s.message},{status,headers});}
export async function GET(request:Request){try{gate();const a=await authority(request);const list=await reviewList(env.DB,a,50,null,new URL(request.url).searchParams.get('own')==='1');const after=await authority(request);if(after.actor!==a.actor||after.mode!==a.mode||after.term!==a.term)throw new ApiError("会话已变化",403);return Response.json({items:list,mode:a.mode,actor:a.actor},{headers});}catch(e){return error(e)}}
export async function POST(request:Request){try{gate();if(request.headers.get("origin")!==new URL(request.url).origin)throw new ApiError("必须从本站提交",403);const p=await readJson(request,16384),a=await authority(request);
 // Submission is only registration of an already existing canonical version.
 // Do not expose this switch until public visibility and owner upload adapters are installed.
 if(p.action==="submit"){if(!fullReviewReady(env)||p.kind==="gallery")throw new ApiError("请通过对应的安全上传入口提交",503);return Response.json(await submitReview(env.DB,p,a),{headers,status:201});}
 await requireTechnologyMinister(request);
 if(!(p.action==="decision"&&((p.kind==="gallery"&&galleryReady(env))||(p.kind==="book"&&bookReady(env))))&&!fullReviewReady(env))throw new ApiError("该类馆藏可见性接入尚未验收",503);
 const result=p.action==="decision"?await reviewDecision(env.DB,p,a):p.action==="bind"?await assignSlot(env.DB,p,a):p.action==="display"?await displayBook(env.DB,p,a):null;
 if(!result)throw new ApiError("未知操作",400);return Response.json(result,{headers});
 }catch(e){return error(e)}}
