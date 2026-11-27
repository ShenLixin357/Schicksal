import {env} from 'cloudflare:workers';
import {galleryReady} from '../../../../server/imperial-v3/review.mjs';
import {requireMember} from '../../../../server/auth/member.ts';
import {ApiError,readJson} from '../../../../server/http.ts';
import {workspace,target} from '../../../../server/library/discovery.ts';
import {discoveryConfig} from '../../../../server/library/discovery-config.ts';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
const failure=(e:unknown)=>Response.json({error:e instanceof ApiError?e.message:'个人馆藏暂时不可用'},{status:e instanceof ApiError?e.status:503,headers});
export async function GET(request:Request){try{if(galleryReady(env))throw new ApiError('个人收藏功能暂缓开放',404);const actor=await requireMember(request);return Response.json(await workspace(env.DB,discoveryConfig()).list(actor),{headers});}catch(e){return failure(e)}}
export async function POST(request:Request){try{if(galleryReady(env))throw new ApiError('个人收藏功能暂缓开放',404);if(request.headers.get('origin')!==new URL(request.url).origin)throw new ApiError('必须从本站提交',403);const actor=await requireMember(request),s=workspace(env.DB,discoveryConfig()),p=await readJson(request,4096),t=target(p);if(p.action==='save')await s.save(actor,t);else if(p.action==='remove')await s.remove(actor,t);else if(p.action==='note')await s.note(actor,t,p.note,p.expected);else throw new ApiError('未知操作',400);return Response.json({ok:true},{headers});}catch(e){return failure(e)}}
