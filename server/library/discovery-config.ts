import {env} from 'cloudflare:workers';
import {requireLibraryPreview} from './preview-gate.ts';
import {ApiError} from '../http.ts';
import type {Availability} from './discovery.ts';
/** Only the explicitly enabled isolated preview. Each source uses its existing feature gate. */
export function discoveryConfig():Availability{requireLibraryPreview(env,'v11');const e=env as unknown as Record<string,unknown>;if(e.SCHICKSAL_DISCOVERY_ENABLED!=='true')throw new ApiError('统一馆藏尚未启用',503);return {book:true,gallery:e.SCHICKSAL_GALLERY_ENABLED==='true'&&!!e.GALLERY_BUCKET&&Number.isSafeInteger(Number(e.SCHICKSAL_GALLERY_QUOTA_BYTES))&&Number(e.SCHICKSAL_GALLERY_QUOTA_BYTES)>0&&Number(e.SCHICKSAL_GALLERY_QUOTA_BYTES)<=10*1024**3,digital:e.SCHICKSAL_DIGITAL_ENABLED==='true'&&!!e.DIGITAL_BUCKET&&[e.SCHICKSAL_DIGITAL_QUOTA_BYTES,e.SCHICKSAL_DIGITAL_STAGING_QUOTA_BYTES].every(x=>Number.isSafeInteger(Number(x))&&Number(x)>0&&Number(x)<=10*1024**3)};}
