import {env} from 'cloudflare:workers';
import {requireMember} from '../../../server/auth/member.ts';
import {apiFailure} from '../../../server/http.ts';
const headers={'Cache-Control':'private,no-store','Vary':'Cookie'};
export async function GET(request:Request){
 try{
  await requireMember(request);
  const c=env as unknown as Record<string,unknown>;
  const preview=c.SCHICKSAL_HOSTING==='cloudflare'&&typeof c.SCHICKSAL_PREVIEW_COMMIT==='string'&&/^[a-f0-9]{40}$/.test(c.SCHICKSAL_PREVIEW_COMMIT);
  return Response.json({dynamicLibrary:preview&&c.SCHICKSAL_LIBRARY_V11_ENABLED==='true',galleryEntry:preview&&c.SCHICKSAL_GALLERY_ENTRY_ENABLED==='true'},{headers});
 }catch(e){return apiFailure(e,'功能配置暂不可用');}
}
