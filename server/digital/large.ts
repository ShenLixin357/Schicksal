import {createHash} from 'node:crypto';
import {ApiError} from '../http.ts';
import {sha256,type ObjectPort} from '../gallery/store.ts';
import {classifyFilename,digitalAttachment} from './store.ts';
export type DigitalDB={prepare(sql:string):{bind(...args:unknown[]):{first<T>():Promise<T|null>;all<T>():Promise<{results:T[]}>;run():Promise<{meta:{changes:number}}>}}};
const fail=(message:string,status=400):never=>{throw new ApiError(message,status)};
const id=(s:unknown):string=>{if(typeof s!=='string'||!(/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/).test(s))return fail('编号无效');return s;};
const hash=(s:unknown):string=>{if(typeof s!=='string'||!/^[a-f0-9]{64}$/.test(s))return fail('SHA-256 无效');return s;};
export const PART_BYTES=4*1024*1024, MAX_LARGE_BYTES=256*1024*1024, DIRECT_BYTES=32*1024*1024;
type Upload={id:string;object_id:string;version_id:string;base_id:string|null;filename:string;kind:string;actor:string;total_bytes:number;part_bytes:number;expected_sha:string;state:'open'|'complete'|'cancelled';created_at:string};
type Part={idx:number;bytes:number;sha256:string;storage_key:string;state:'pending'|'ready'};
type Version={id:string;object_id:string;parent_id:string|null;sha256:string;filename:string;kind:string;created_by:string;ordinal:number};
type Blob={sha256:string;bytes:number;storage_key:string;state:string};
/** Segmented immutable storage. No R2 multipart dependency, no giant concatenated buffer,
 * no automatic deletion. Reservation budget counts retained staging including completed/cancelled
 * sessions conservatively; logical canonical byte quota is independent. No public object URLs. */
export function largeDigitalStore(db:DigitalDB,objects:ObjectPort,config:{quotaBytes:number;stagingQuotaBytes:number;partBytes?:number;minBytes?:number;maxBytes?:number}){
 const {quotaBytes,stagingQuotaBytes,partBytes=PART_BYTES,minBytes=DIRECT_BYTES+1,maxBytes=MAX_LARGE_BYTES}=config;
 if(![quotaBytes,stagingQuotaBytes,partBytes,minBytes,maxBytes].every(x=>Number.isSafeInteger(x)&&x>0)||partBytes>PART_BYTES||maxBytes>MAX_LARGE_BYTES||minBytes>maxBytes||Math.ceil(maxBytes/partBytes)>256)fail('独立分块配置无效',503);
 const get=(key:string)=>db.prepare('SELECT * FROM digital_uploads WHERE id=?').bind(id(key)).first<Upload>();
 const parts=async(key:string)=>(await db.prepare('SELECT idx,bytes,sha256,storage_key,state FROM digital_upload_parts WHERE upload_id=? ORDER BY idx').bind(key).all<Part>()).results;
 async function owned(key:string,actor:string){const u=await get(key);if(!u||u.actor!==id(actor))return fail('上传任务不存在',404);return u;}
 const latest=(key:string)=>db.prepare('SELECT id,ordinal FROM digital_versions WHERE object_id=? ORDER BY ordinal DESC LIMIT 1').bind(key).first<{id:string;ordinal:number}>();
 const version=(key:string)=>db.prepare('SELECT * FROM digital_versions WHERE id=?').bind(key).first<Version>();
 const active=(key:string)=>db.prepare('SELECT id FROM digital_objects WHERE id=? AND trashed_at IS NULL').bind(key).first();
 const sizeFor=(u:Upload,idx:number)=>{if(!Number.isInteger(idx)||idx<0||idx>=Math.ceil(u.total_bytes/u.part_bytes))return fail('分块编号无效');return Math.min(u.part_bytes,u.total_bytes-idx*u.part_bytes);};
 async function checkedPart(p:Part){const b=await objects.get(p.storage_key);if(!b||b.byteLength!==p.bytes||await sha256(b)!==p.sha256)return fail('分块完整性异常',503);return b;}
 async function manifest(u:Upload){const ps=await parts(u.id);if(ps.length!==Math.ceil(u.total_bytes/u.part_bytes)||ps.some((p,i)=>p.idx!==i||p.bytes!==sizeFor(u,i)||p.state!=='ready'||p.storage_key!==`digital/parts/sha256/${p.sha256}`))return fail('分块尚未完整',409);return ps;}
 function sameVersion(v:Version,u:Upload){return v.object_id===u.object_id&&v.parent_id===u.base_id&&v.sha256===u.expected_sha&&v.filename===u.filename&&v.kind===u.kind&&v.created_by===u.actor;}
 return {
  async start(p:{id:string;objectId:string;versionId:string;baseId:string|null;filename:string;totalBytes:number;expectedSha:string},actor:string):Promise<{id:string;state:Upload["state"];partBytes:number}>{
   id(p.id);id(p.objectId);id(p.versionId);if(p.baseId!==null)id(p.baseId);id(actor);hash(p.expectedSha);const f=classifyFilename(p.filename);
   if(!Number.isSafeInteger(p.totalBytes)||p.totalBytes<minBytes||p.totalBytes>maxBytes)fail('分块文件大小超限',413);
   const prior=await get(p.id);if(prior){if(prior.actor!==actor||prior.object_id!==p.objectId||prior.version_id!==p.versionId||prior.base_id!==p.baseId||prior.filename!==f.name||prior.total_bytes!==p.totalBytes||prior.expected_sha!==p.expectedSha)fail('上传任务编号冲突',409);return {id:prior.id,state:prior.state,partBytes:prior.part_bytes};}
   if(!await active(p.objectId))fail('藏品不存在',404);if(((await latest(p.objectId))?.id??null)!==p.baseId)fail('版本已变化',409);
   const r=await db.prepare(`INSERT OR IGNORE INTO digital_uploads(id,object_id,version_id,base_id,filename,kind,actor,total_bytes,part_bytes,expected_sha,state,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,'open',? WHERE (SELECT COALESCE(SUM(total_bytes),0) FROM digital_uploads)+?<=? AND EXISTS(SELECT 1 FROM digital_objects WHERE id=? AND trashed_at IS NULL) AND (SELECT id FROM digital_versions WHERE object_id=? ORDER BY ordinal DESC LIMIT 1) IS ? AND NOT EXISTS(SELECT 1 FROM digital_versions WHERE id=?)`).bind(p.id,p.objectId,p.versionId,p.baseId,f.name,f.kind,actor,p.totalBytes,partBytes,p.expectedSha,new Date().toISOString(),p.totalBytes,stagingQuotaBytes,p.objectId,p.objectId,p.baseId,p.versionId).run();
   if(r.meta.changes!==1){if(await get(p.id))return this.start(p,actor);if(await version(p.versionId)||await db.prepare('SELECT id FROM digital_uploads WHERE version_id=?').bind(p.versionId).first())fail('版本编号冲突',409);if(!await active(p.objectId)||((await latest(p.objectId))?.id??null)!==p.baseId)fail('版本已变化',409);fail('分块预留配额不足',413);}return {id:p.id,state:'open',partBytes};
  },
  async tasks(actor:string,limit=50,offset=0){id(actor);if(!Number.isInteger(limit)||limit<1||limit>100||!Number.isSafeInteger(offset)||offset<0)fail('分页无效');return (await db.prepare(`SELECT u.id,u.object_id AS objectId,u.version_id AS versionId,u.base_id AS baseId,u.filename,u.total_bytes AS totalBytes,u.expected_sha AS expectedSha,u.state,o.title,o.collection FROM digital_uploads u JOIN digital_objects o ON o.id=u.object_id WHERE u.actor=? ORDER BY u.created_at DESC,u.id LIMIT ? OFFSET ?`).bind(actor,limit,offset).all()).results;},
  async status(key:string,actor:string){const u=await owned(key,actor);return {id:u.id,state:u.state,partBytes:u.part_bytes,totalBytes:u.total_bytes,expectedSha:u.expected_sha,parts:(await parts(key)).map(({idx,bytes,sha256,state})=>({idx,bytes,sha256,state}))};},
  async putPart(key:string,idx:number,digest:string,bytes:Uint8Array,actor:string){const u=await owned(key,actor);hash(digest);if(u.state!=='open')fail('任务已关闭',409);if(bytes.byteLength!==sizeFor(u,idx)||await sha256(bytes)!==digest)fail('分块大小或指纹不符',422);const storageKey=`digital/parts/sha256/${digest}`;
   await db.prepare(`INSERT OR IGNORE INTO digital_upload_parts(upload_id,idx,bytes,sha256,storage_key,state) SELECT ?,?,?,?,?,'pending' WHERE EXISTS(SELECT 1 FROM digital_uploads WHERE id=? AND state='open')`).bind(key,idx,bytes.byteLength,digest,storageKey,key).run();
   const p=await db.prepare('SELECT idx,bytes,sha256,storage_key,state FROM digital_upload_parts WHERE upload_id=? AND idx=?').bind(key,idx).first<Part>();if(!p||p.sha256!==digest||p.bytes!==bytes.byteLength||p.storage_key!==storageKey)return fail('分块编号冲突或任务已关闭',409);
   if(p.state==='pending'){await objects.put(storageKey,bytes,'application/octet-stream');await db.prepare("UPDATE digital_upload_parts SET state='ready' WHERE upload_id=? AND idx=? AND state='pending'").bind(key,idx).run();}else await checkedPart(p);
   return {idx,sha256:digest};
  },
  async finish(key:string,actor:string){const u=await owned(key,actor);if(u.state==='cancelled')fail('任务已取消',409);const replay=await version(u.version_id);if(replay){if(!sameVersion(replay,u))fail('版本编号冲突',409);await db.prepare("UPDATE digital_uploads SET state='complete' WHERE id=? AND state='open'").bind(key).run();return {id:u.version_id,sha256:u.expected_sha};}
   if(u.state!=='open'||!await active(u.object_id))fail('藏品不可用',409);const prev=await latest(u.object_id);if((prev?.id??null)!==u.base_id)fail('版本已变化',409);
   const ps=await manifest(u);const h=createHash('sha256');for(const p of ps)h.update(await checkedPart(p));if(h.digest('hex')!==u.expected_sha)fail('整文件指纹不符',422);
   // Canonical content points at the verified retained manifest. Cross-upload identical content shares one logical blob; shared SHA-addressed parts retained/reported.
   const storageKey='digital/segments/'+u.id;
   await db.prepare(`INSERT OR IGNORE INTO digital_blobs(sha256,bytes,storage_key,state) SELECT ?,?,?,'ready' WHERE (SELECT COALESCE(SUM(bytes),0) FROM digital_blobs)+?<=? AND EXISTS(SELECT 1 FROM digital_uploads WHERE id=? AND state='open')`).bind(u.expected_sha,u.total_bytes,storageKey,u.total_bytes,quotaBytes,key).run();
   const b=await db.prepare('SELECT * FROM digital_blobs WHERE sha256=?').bind(u.expected_sha).first<Blob>();if(!b)return fail('正式配额不足或任务关闭',413);if(b.state!=='ready'||b.bytes!==u.total_bytes||!b.storage_key.startsWith('digital/segments/'))fail('正式对象元数据冲突',409);
   const r=await db.prepare(`INSERT OR IGNORE INTO digital_versions(id,object_id,parent_id,ordinal,sha256,filename,kind,created_by,created_at) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM digital_uploads WHERE id=? AND state='open') AND EXISTS(SELECT 1 FROM digital_objects WHERE id=? AND trashed_at IS NULL) AND (SELECT id FROM digital_versions WHERE object_id=? ORDER BY ordinal DESC LIMIT 1) IS ?`).bind(u.version_id,u.object_id,u.base_id,(prev?.ordinal??0)+1,u.expected_sha,u.filename,u.kind,actor,new Date().toISOString(),key,u.object_id,u.object_id,u.base_id).run();
   if(r.meta.changes!==1){const v=await version(u.version_id);if(!v||!sameVersion(v,u))fail('版本冲突或任务关闭',409);}
   await db.prepare("UPDATE digital_uploads SET state='complete' WHERE id=? AND state='open'").bind(key).run();return {id:u.version_id,sha256:u.expected_sha};
  },
  async cancel(key:string,actor:string){const u=await owned(key,actor);if(u.state==='cancelled')return;const r=await db.prepare("UPDATE digital_uploads SET state='cancelled' WHERE id=? AND state='open' AND NOT EXISTS(SELECT 1 FROM digital_versions WHERE id=?)").bind(key,u.version_id).run();if(r.meta.changes!==1)fail('已发布任务不可取消',409);},
  async stats(){return db.prepare(`SELECT COUNT(*) uploads,COALESCE(SUM(total_bytes),0) reserved_bytes,COALESCE(SUM(CASE WHEN state='cancelled' THEN total_bytes ELSE 0 END),0) cancelled_reserved_bytes,(SELECT COALESCE(SUM(bytes),0) FROM digital_upload_parts) recorded_part_bytes,(SELECT COALESCE(SUM(bytes),0) FROM (SELECT storage_key,MAX(bytes) bytes FROM digital_upload_parts GROUP BY storage_key)) unique_part_bytes FROM digital_uploads`).bind().first();},
  async download(key:string,versionId:string){const r=await db.prepare(`SELECT b.*,v.filename FROM digital_versions v JOIN digital_blobs b ON b.sha256=v.sha256 JOIN digital_objects o ON o.id=v.object_id WHERE o.id=? AND v.id=? AND o.trashed_at IS NULL AND b.state='ready'`).bind(id(key),id(versionId)).first<Blob&{filename:string}>();if(!r)return fail('藏品不存在',404);if(!r.storage_key.startsWith('digital/segments/')){const bytes=await objects.get(r.storage_key);if(!bytes||bytes.length!==r.bytes||await sha256(bytes)!==r.sha256)return fail('文件完整性异常',503);return digitalAttachment({bytes,filename:r.filename});}
   const u=await get(r.storage_key.slice('digital/segments/'.length));if(!u||u.expected_sha!==r.sha256||u.total_bytes!==r.bytes)return fail('分块清单异常',503);const ps=await manifest(u);let idx=0,cancelled=false;const stream=new ReadableStream<Uint8Array>({async pull(controller){if(cancelled)return;try{if(idx===ps.length){controller.close();return;}const b=await checkedPart(ps[idx++]);if(!cancelled)controller.enqueue(b);}catch(e){if(!cancelled)controller.error(e);}},cancel(){cancelled=true;}},{highWaterMark:1});const headers=new Headers(digitalAttachment({bytes:new Uint8Array(),filename:r.filename}).headers);headers.set('Content-Length',String(r.bytes));headers.set('X-Content-SHA256',r.sha256);return new Response(stream,{headers});
  }
 };
}
