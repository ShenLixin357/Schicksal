import {env} from 'cloudflare:workers';
import {requireLibraryPreview} from '../../../../server/library/preview-gate.ts';
import {requireMember} from '../../../../server/auth/member.ts';
import {ApiError} from '../../../../server/http.ts';
import {libraryStore} from '../../../../server/library/revisions.ts';
import {bookReady} from '../../../../server/imperial-v3/review.mjs';
import {publicReadDb} from '../../../../server/imperial-v3/public-read.ts';
const headers={'Cache-Control':'private, no-store'};
export async function GET(request:Request){try{await requireMember(request);requireLibraryPreview(env,'v11');const rows=await libraryStore(bookReady(env)?publicReadDb(env.DB,env):env.DB).published();return Response.json({archiveRestructureAllowed:(env as unknown as Record<string,unknown>).SCHICKSAL_ARCHIVE_RESTRUCTURE_ENABLED==='true',books:rows.filter(r=>r.kind==='book').map(r=>({...r.payload,revision:r.revision})),animations:rows.filter(r=>r.kind==='animation').map(r=>({...r.payload,revision:r.revision}))},{headers});}catch(e){return Response.json({error:e instanceof ApiError?e.message:'馆藏暂时无法读取'},{status:e instanceof ApiError?e.status:503,headers});}}
