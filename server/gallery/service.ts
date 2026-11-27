import {env} from 'cloudflare:workers';
import {publicReadDb} from '../imperial-v3/public-read.ts';
import {ApiError} from '../http.ts';
import {requireLibraryPreview} from '../library/preview-gate.ts';
import {galleryStore} from './store.ts';
import {inspectGalleryImage,type DecoderBinding} from './image-inspection.ts';
import {r2ObjectPort} from './r2-port.ts';
/** Future dedicated preview only. An absent binding fails closed; no shared photos bucket fallback. */
export const MAX_GALLERY_BYTES=12*1024*1024;
export function configuredGallery(readOnly=false){requireLibraryPreview(env,'gallery');const e=env as unknown as {GALLERY_BUCKET?:Parameters<typeof r2ObjectPort>[0];SCHICKSAL_GALLERY_QUOTA_BYTES?:string};if(!e.GALLERY_BUCKET)throw new ApiError('馆藏存储尚未配置',503);const quota=Number(e.SCHICKSAL_GALLERY_QUOTA_BYTES);if(!Number.isSafeInteger(quota)||quota<=0||quota>10*1024**3)throw new ApiError('馆藏配额未配置或无效',503);return galleryStore(readOnly?publicReadDb(env.DB,env):env.DB,r2ObjectPort(e.GALLERY_BUCKET),{quotaBytes:quota,maxUpload:MAX_GALLERY_BYTES});}
export async function readGalleryBytes(request:Request){const declared=Number(request.headers.get('content-length'));if(Number.isFinite(declared)&&declared>MAX_GALLERY_BYTES)throw new ApiError('文件过大',413);const reader=request.body?.getReader();if(!reader)throw new ApiError('文件不能为空',400);let size=0;const chunks:Uint8Array[]=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_GALLERY_BYTES){await reader.cancel();throw new ApiError('文件过大',413);}chunks.push(value);}}finally{reader.releaseLock();}const result=new Uint8Array(size);let offset=0;for(const c of chunks){result.set(c,offset);offset+=c.length;}return result;}

export async function validateGalleryUpload(bytes:Uint8Array,role:'original'|'preview'|'thumbnail'){const e=env as unknown as {GALLERY_IMAGE_INSPECTOR?:DecoderBinding};return inspectGalleryImage(e.GALLERY_IMAGE_INSPECTOR,bytes,role);}
