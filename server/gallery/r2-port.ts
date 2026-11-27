import type {ObjectPort} from './store.ts';
import type {R2Budget} from './r2-budget.ts';
/** Private R2 binding. Every attempted operation must reserve a shared budget first. */
type Bucket={put(key:string,bytes:Uint8Array,options:{httpMetadata:{contentType:string}}):Promise<unknown>;get(key:string):Promise<{arrayBuffer():Promise<ArrayBuffer>}|null>};
export function r2ObjectPort(bucket:Bucket,budget:R2Budget):ObjectPort{
 return {
  async put(key,bytes,mime){await budget.reserve('A',bytes.byteLength);await bucket.put(key,bytes,{httpMetadata:{contentType:mime}})},
  async get(key){await budget.reserve('B');const result=await bucket.get(key);return result?new Uint8Array(await result.arrayBuffer()):null}
 };
}
