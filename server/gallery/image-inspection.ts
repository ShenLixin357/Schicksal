import {ApiError} from '../http.ts';
import {imageMime,sha256} from './store.ts';
/** An internal service binding, never a URL supplied by a client. The decoder must
 * actually decompress all pixels, enforce resource limits and return the input hash. */
export type DecoderBinding={fetch(request:Request):Promise<Response>};
export async function inspectGalleryImage(binding:DecoderBinding|undefined,bytes:Uint8Array,role:'original'|'preview'|'thumbnail'){
 if(!binding)throw new ApiError('可信图片解码服务未配置，上传已关闭',503);
 if(bytes.length===0||bytes.length>12*1024*1024)throw new ApiError('图片大小超限',413);
 const mime=imageMime(bytes),hash=await sha256(bytes);
 let response:Response;
 try{response=await binding.fetch(new Request('https://image-inspector.internal/inspect',{method:'POST',headers:{'Content-Type':mime!},body:new Uint8Array(bytes).buffer,signal:AbortSignal.timeout(15000)}));}catch{throw new ApiError('可信图片解码服务暂不可用',503);}
 if(response.status===415||response.status===413)throw new ApiError('图片损坏、动画格式或尺寸超限',response.status);
 if(!response.ok)throw new ApiError('可信图片解码服务暂不可用',503);
 let d: {sha256?:unknown;mime?:unknown;width?:unknown;height?:unknown;frames?:unknown;decoded?:unknown};
 try{d=await response.json() as typeof d;}catch{throw new ApiError('图片解码响应无效',503);}
 if(!d||d.sha256!==hash||d.mime!==mime||d.decoded!==true||d.frames!==1||!Number.isSafeInteger(d.width)||!Number.isSafeInteger(d.height))throw new ApiError('图片解码响应无效',503);
 const w=Number(d.width),h=Number(d.height),max=role==='thumbnail'?320:role==='preview'?1600:12000;
 if(w<1||h<1||w>max||h>max||w*h>24_000_000)throw new ApiError('图片尺寸超限',413);
 return {width:w,height:h,mime,sha256:hash};
}
