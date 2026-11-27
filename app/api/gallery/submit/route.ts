import {env} from "cloudflare:workers";
import {requireMember,requireTechnologyMinister} from "../../../../server/auth/member.ts";
import {currentSession,cookieToken,digest} from "../../../member-session.ts";
import {ApiError} from "../../../../server/http.ts";
import {configuredGallery,readGalleryBytes,validateGalleryUpload} from "../../../../server/gallery/service.ts";
import {enabled,categories,submitReview} from "../../../../server/imperial-v3/review.mjs";
import {accessSettings} from "../../../../server/ministry/store.ts";
import {enabled as ministryEnabled,decide} from "../../../../server/ministry/policy.ts";
const headers={"Cache-Control":"private,no-store","Vary":"Cookie","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox"};
const id=(s:string|null)=>!!s&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(s);
function gate(){if(!enabled(env)||(env as unknown as Record<string,string>).SCHICKSAL_V32_CANONICAL_INTAKE_READY!=="true"||!ministryEnabled(env))throw new ApiError("全民上传预览未启用",404);}
async function authority(request:Request,method:string){
 const actor=await requireMember(request),session=await currentSession(request),token=cookieToken(request);
 if(!session||session.citizenId!==actor||!token)throw new ApiError("会话已变化",401);
 const p=await accessSettings(actor,"gallery");if(!decide(p.mode,p.policy,method,session.accountMode==="technology").allowed)throw new ApiError("无艺术馆藏操作权限",403);
 let term:string|null=null;
 if(session.accountMode==="technology"){await requireTechnologyMinister(request);const rows=await env.DB.prepare("SELECT citizen_id,term_id FROM current_office_holders WHERE office_id='technology' LIMIT 2").all<{citizen_id:string;term_id:string}>();if(rows.results.length!==1||rows.results[0].citizen_id!==actor)throw new ApiError("部长任期已变化",403);term=rows.results[0].term_id;}
 return {actor,mode:session.accountMode,term,tokenHash:await digest(token),now:Date.now()};
}
function failure(e:unknown){const s=e as {status?:number;message?:string};const status=[400,401,403,404,409,413,415,422,429].includes(s?.status??0)?s.status!:503;return Response.json({error:status===503?"艺术作品暂时无法提交":s.message},{status,headers});}
export async function GET(request:Request){try{gate();const a=await authority(request,"GET"),q=new URL(request.url).searchParams;if(q.get("availability")==="1"){await authority(request,"POST");configuredGallery();const inspector=(env as unknown as {GALLERY_IMAGE_INSPECTOR?:{fetch?:unknown}}).GALLERY_IMAGE_INSPECTOR;if(typeof inspector?.fetch!=="function")throw new ApiError("可信图片解码服务未配置",503);await env.DB.prepare("SELECT version FROM imperial_review_items LIMIT 0").bind().all();await env.DB.prepare("SELECT id FROM imperial_visible_gallery_versions LIMIT 0").bind().all();return Response.json({enabled:true,actor:a.actor,mode:a.mode},{headers});}
 const work=q.get("work"),version=q.get("version");
 if(q.get("metadata")==="1"){if(!id(work))throw new ApiError("作品编号无效",400);const row=await env.DB.prepare("SELECT title,collection,created_by FROM gallery_works WHERE id=? AND trashed_at IS NULL").bind(work).first<{title:string;collection:string;created_by:string}>();if(!row||row.created_by!==a.actor)throw new ApiError("作品不存在或无权追加",404);return Response.json({title:row.title,category:row.collection},{headers});}
 if(!id(work)||!id(version))throw new ApiError("作品版本无效",400);
 const row=await env.DB.prepare("SELECT i.author FROM imperial_review_items i WHERE i.kind='gallery' AND i.entity=? AND i.version=?").bind(work,version).first<{author:string}>();
 if(!row||(row.author!==a.actor&&a.mode!=="technology"))throw new ApiError("作品不存在或无权读取",404);
 const result=await configuredGallery().read(work!,version!,"original"),after=await authority(request,"GET");if(after.actor!==a.actor||after.mode!==a.mode||after.term!==a.term)throw new ApiError("会话已变化",403);
 return new Response(new Uint8Array(result.bytes).buffer,{headers:{...headers,"Content-Type":result.mime,"Content-Disposition":"attachment"}});
 }catch(e){return failure(e)}}
export async function POST(request:Request){try{gate();if(request.headers.get("origin")!==new URL(request.url).origin)throw new ApiError("必须从本站提交",403);
 const a=await authority(request,"POST"),q=new URL(request.url).searchParams,work=q.get("work"),version=q.get("version"),base=q.get("base"),name=q.get("name")??"",title=q.get("title")??"",category=q.get("category")??"";
 if(!id(work)||!id(version)||(base!==null&&!id(base))||!categories.includes(category)||!name.trim()||name.length>240||!title.trim()||title.length>180)throw new ApiError("上传信息无效",400);
 const bytes=await readGalleryBytes(request);await validateGalleryUpload(bytes,"original");
 const after=await authority(request,"POST");if(after.actor!==a.actor||after.mode!==a.mode||after.term!==a.term)throw new ApiError("会话已变化",409);
 const store=configuredGallery();
 if(base===null)await store.create(title,category,a.actor,work!);else{const owner=await env.DB.prepare("SELECT created_by,title,collection FROM gallery_works WHERE id=? AND trashed_at IS NULL").bind(work).first<{created_by:string;title:string;collection:string}>();if(owner?.created_by!==a.actor)throw new ApiError("只能修改自己的作品",403);if(owner.title!==title.trim()||owner.collection!==category)throw new ApiError("当前版本仅支持替换原稿；标题与分类保持不变",409);}
 const v=await store.addVersion(work!,base,name,bytes,a.actor,version!);
 const live=await authority(request,"POST");if(live.actor!==a.actor||live.mode!==a.mode||live.term!==a.term)throw new ApiError("上传已保全但权限已变化；尚未公开",409);
 const review=await submitReview(env.DB,{kind:"gallery",entity:work,version:v.id,category},live);
 return Response.json({id:work,version:v.id,...review},{status:201,headers});
 }catch(e){return failure(e)}}
