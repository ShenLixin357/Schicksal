import {ApiError} from "../http.ts";
import {enabled,fullReviewReady} from "./review.mjs";
/** Read-only adapter over canonical D1 stores. The reviewed SQL views omit
 * unregistered/rejected versions before pagination, sorting or snippet generation.
 * Never use this wrapper for CAS/write paths or raw administrator inventory. */
export function publicReadDb<T extends {prepare(sql:string):unknown}>(db:T,config:unknown):T{
 if(!enabled(config))return db;
 if((config as Record<string,unknown>).SCHICKSAL_V32_CANONICAL_INTAKE_READY!=="true")throw new ApiError("馆藏审核迁移尚未验收",503);
 return new Proxy(db,{get(target,key){if(key==="prepare")return(sql:string)=>{
  if(!/^\s*(SELECT|WITH)\b/i.test(sql)||/;\s*\S/.test(sql))throw new ApiError("馆藏只读接口禁止写入",500);
  const visible=sql.replace(/\b(gallery_versions|digital_versions|library_revisions)\b/g,(_,name:string)=>name==="gallery_versions"||fullReviewReady(config)?({gallery_versions:"imperial_visible_gallery_versions",digital_versions:"imperial_visible_digital_versions",library_revisions:"imperial_visible_library_revisions"} as Record<string,string>)[name]:name);
  return target.prepare(visible);
 };const value=Reflect.get(target,key,target);return typeof value==="function"?value.bind(target):value;}});
}
