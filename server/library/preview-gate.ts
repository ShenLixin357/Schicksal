import {ApiError} from '../http.ts';
/** New persistent features require a dedicated preview configuration and an explicit feature flag.
 * No production enablement path in this increment. The deployment must also verify dedicated DB/bucket binding IDs. */
export function requireLibraryPreview(env:unknown,feature:'v11'|'gallery'|'digital'|'governance'){
 const e=env as {SCHICKSAL_PREVIEW_COMMIT?:string;SCHICKSAL_LIBRARY_V11_ENABLED?:string;SCHICKSAL_GALLERY_ENABLED?:string;SCHICKSAL_DIGITAL_ENABLED?:string;SCHICKSAL_ASSET_GOVERNANCE_ENABLED?:string};
 if(!/^[0-9a-f]{40}$/u.test(e.SCHICKSAL_PREVIEW_COMMIT??'')||(({v11:e.SCHICKSAL_LIBRARY_V11_ENABLED,gallery:e.SCHICKSAL_GALLERY_ENABLED,digital:e.SCHICKSAL_DIGITAL_ENABLED,governance:e.SCHICKSAL_ASSET_GOVERNANCE_ENABLED})[feature])!=='true')throw new ApiError('此功能尚未在独立预览环境启用',503);
}
