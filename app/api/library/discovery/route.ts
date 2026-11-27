import {env} from 'cloudflare:workers';
import {requireMember} from '../../../../server/auth/member.ts';
import {ApiError} from '../../../../server/http.ts';
import {discovery,kind,target} from '../../../../server/library/discovery.ts';
import {discoveryConfig} from '../../../../server/library/discovery-config.ts';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
export async function GET(request:Request){try{await requireMember(request);const enabled=discoveryConfig(),q=new URL(request.url).searchParams,s=discovery(env.DB,enabled);if(q.has('detail')){const h=await s.resolve(target(Object.fromEntries(q)));if(!h)throw new ApiError('馆藏版本不可用',404);return Response.json(h,{headers});}if(q.has('sources'))return Response.json(enabled,{headers});if(q.get('kind')==='all'){const term=q.get('q')??'';if(term.length>180)throw new ApiError('检索参数无效',400);const groups=await Promise.all((['book','gallery','digital'] as const).map(async k=>enabled[k]?{kind:k,available:true,...await s.search(k,term,8,0)}:{kind:k,available:false,hits:[],next:null}));return Response.json({groups},{headers});}return Response.json(await s.search(kind(q.get('kind')),q.get('q')??'',Number(q.get('limit')??20),Number(q.get('offset')??0)),{headers});}catch(e){return Response.json({error:e instanceof ApiError?e.message:'馆藏检索暂时不可用'},{status:e instanceof ApiError?e.status:503,headers});}}
