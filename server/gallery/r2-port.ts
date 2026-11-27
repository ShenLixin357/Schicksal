import type {ObjectPort} from './store.ts';
/** Future private R2 binding. No credentials, public URL, deletion or auto-activation. */
type Bucket={put(key:string,bytes:Uint8Array,options:{httpMetadata:{contentType:string}}):Promise<unknown>;get(key:string):Promise<{arrayBuffer():Promise<ArrayBuffer>}|null>};
export function r2ObjectPort(bucket:Bucket):ObjectPort{return {async put(key,bytes,mime){await bucket.put(key,bytes,{httpMetadata:{contentType:mime}})},async get(key){const result=await bucket.get(key);return result?new Uint8Array(await result.arrayBuffer()):null}};}
