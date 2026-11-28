import {env} from 'cloudflare:workers';
import {ApiError,readJson,apiFailure} from '../../../../server/http.ts';
import {bookAuthority} from '../../../../server/library/book-authority.ts';
import {commitBook,bookOwner} from '../../../../server/library/book-submission.mjs';
import {validate} from '../../../../server/library/revisions.ts';
const headers={'Cache-Control':'private,no-store','Vary':'Cookie'};
const directory=(x:unknown):x is string=>typeof x==='string'&&/^book-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(x);
const key=(x:unknown):x is string=>typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(x);
const fail=(e:unknown)=>{const status=(e as {status?:number})?.status;return typeof status==='number'&&[400,401,403,404,409,413].includes(status)?Response.json({error:(e as Error).message},{status,headers}):apiFailure(e,'书稿暂不可用');};
export async function GET(r:Request){try{
 const a=await bookAuthority(r),q=new URL(r.url).searchParams,id=q.get('id'),revision=q.get('revision');
 if(id||revision){if(!key(id)||!key(revision))throw new ApiError('无效书稿编号',400);
 const row=await env.DB.prepare("SELECT v.payload,i.author,h.state FROM library_revisions v JOIN imperial_review_items i ON i.kind='book' AND i.entity=v.entity_id AND i.version=v.revision JOIN imperial_review_current h USING(kind,entity,version) WHERE v.entity_id=? AND v.revision=? AND (i.author=? OR ?='technology')").bind(id,revision,a.actor,a.mode).first<{payload:string;author:string;state:string}>();
 if(!row)throw new ApiError('书稿不存在或无权限',404);
 const after=await bookAuthority(r);if(after.actor!==a.actor||after.mode!==a.mode||after.term!==a.term)throw new ApiError('会话已变化',409);
 return Response.json({id,revision,state:row.state,payload:JSON.parse(row.payload)},{headers});}
 const rows=await env.DB.prepare("SELECT v.entity_id id,v.revision,json_extract(v.payload,'$.title') title,h.state,h.reason FROM library_revisions v JOIN imperial_review_items i ON i.kind='book' AND i.entity=v.entity_id AND i.version=v.revision JOIN imperial_review_current h USING(kind,entity,version) WHERE i.author=? AND v.entity_id LIKE 'book-%' AND NOT EXISTS(SELECT 1 FROM library_revisions n WHERE n.kind='book' AND n.entity_id=v.entity_id AND n.state='published' AND n.seq>v.seq) ORDER BY v.seq DESC LIMIT 50").bind(a.actor).all();
 return Response.json({enabled:true,mode:a.mode,items:rows.results},{headers});
 }catch(e){return fail(e)}}
export async function POST(r:Request){try{
 const a=await bookAuthority(r),p=await readJson(r,900000);
 if(!directory(p.id)||!key(p.revision)||(p.base!==null&&!key(p.base))||!Array.isArray(p.chapters)||!p.chapters.length||!p.chapters.some(c=>c&&typeof c==='object'&&typeof (c as {markdown?:unknown}).markdown==='string'&&((c as {markdown:string}).markdown).trim()))throw new ApiError('需要完整书名、正文及版本编号',400);
 const owner=await bookOwner(env.DB,p.id);if(owner&&owner!==a.actor)throw new ApiError('只能修改自己的书稿',403);
 let prior=null;if(p.base!==null){const old=await env.DB.prepare("SELECT payload FROM library_revisions WHERE kind='book' AND entity_id=? AND revision=? AND state='published'").bind(p.id,p.base).first<{payload:string}>();if(!old)throw new ApiError('版本基线不存在',409);prior=JSON.parse(old.payload);}
 const cleaned=await validate('book',p.id,{title:p.title,author:prior?.author??a.actor,status:'bound',chapters:p.chapters},prior);
 const payload=JSON.stringify(cleaned);if(new TextEncoder().encode(payload).length>1500000)throw new ApiError('书稿大小超限',413);
 const after=await bookAuthority(r);if(after.actor!==a.actor||after.mode!==a.mode||after.term!==a.term)throw new ApiError('会话已变化',409);
 return Response.json(await commitBook(env.DB,{id:p.id,revision:p.revision,base:p.base,payload},after),{status:201,headers});
 }catch(e){return fail(e)}}
