import {ApiError} from '../http.ts';

type BudgetDB={prepare(sql:string):{bind(...args:unknown[]):{run():Promise<{meta:{changes:number}}>;first<T>():Promise<T|null>}}};
export const R2_GALLERY_LIMITS=Object.freeze({bytes:8_000_000_000,warning:6_000_000_000,urgent:7_200_000_000,a:500_000,b:5_000_000,dayA:5_000,dayB:20_000});
export type R2Budget={reserve:(operation:'A'|'B',bytes?:number)=>Promise<void>};
/**
 * Conservative reservation BEFORE physical R2 call. Failed/ambiguous/repeated
 * writes count in full until a separately authorized inventory reconciliation.
 * No refund, no automatic monthly reset, no optimistic fallback.
 * One SQLite UPDATE serializes both gallery and digital reservations.
 */
export function galleryR2Budget(db:BudgetDB,clock:()=>number=Date.now):R2Budget{
 return {async reserve(operation,bytes=0){
   if(!['A','B'].includes(operation)||!Number.isSafeInteger(bytes)||bytes<0||(operation==='B'&&bytes!==0)||(operation==='A'&&bytes===0))throw new ApiError('存储预算参数无效',503);
   const now=clock(),date=new Date(now).toISOString(),month=date.slice(0,7),day=date.slice(0,10);
   const a=Number(operation==='A'),b=Number(operation==='B'),l=R2_GALLERY_LIMITS;
   let changes=0;
   try{
     const result=await db.prepare(`UPDATE gallery_r2_budget SET
       reserved_bytes=reserved_bytes+?,class_a=class_a+?,class_b=class_b+?,
       day_a=CASE WHEN day=? THEN day_a+? ELSE ? END,
       day_b=CASE WHEN day=? THEN day_b+? ELSE ? END,day=?
       WHERE id=1 AND enabled=1 AND billing_month=? AND verified_until_ms>?
       AND verified_until_ms<=? AND day<=?
       AND external_bytes+reserved_bytes+?<=?
       AND class_a+?<=? AND class_b+?<=?
       AND (CASE WHEN day=? THEN day_a ELSE 0 END)+?<=?
       AND (CASE WHEN day=? THEN day_b ELSE 0 END)+?<=?`)
       .bind(bytes,a,b,day,a,a,day,b,b,day,month,now,now+86_400_000,day,bytes,l.bytes,a,l.a,b,l.b,day,a,l.dayA,day,b,l.dayB).run();
     changes=result.meta.changes;
   }catch{throw new ApiError('存储预算未配置或无法核验，操作已暂停',503);}
   if(changes!==1)throw new ApiError('存储预算已达限制或核验过期，操作已暂停',429);
 }};
}
