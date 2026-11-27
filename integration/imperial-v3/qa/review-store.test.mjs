import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {galleryStore} from '../../../server/gallery/store.ts';
import {publicReadDb} from '../../../server/imperial-v3/public-read.ts';
import {submitReview,reviewDecision,reviewList,assignSlot,displayBook} from '../../../server/imperial-v3/review.mjs';
const root='integration/imperial-v3/';
const sql=name=>readFileSync(root+name,'utf8');
const config={SCHICKSAL_HOSTING:'cloudflare',SCHICKSAL_V32_REVIEW_ENABLED:'true',SCHICKSAL_V32_CANONICAL_INTAKE_READY:'true',SCHICKSAL_PREVIEW_COMMIT:'a'.repeat(40)};
function fixture(){
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON;');
 for(const p of ['gallery-v12','library-v11','digital-v13'])db.exec(sql('support/library-v11-v14-increment/sql/'+p+'.proposed.sql'));
 db.exec("CREATE TABLE member_sessions(token_hash TEXT PRIMARY KEY,citizen_id TEXT,expires_at INTEGER,account_mode TEXT,minister_grant_expires_at INTEGER);CREATE TABLE current_office_holders(office_id TEXT,citizen_id TEXT,term_id TEXT);");
 db.exec(sql('foundation/collection-review.proposed.sql'));
 const now=Date.now(),citizen={actor:'zxy',mode:'citizen',term:null,tokenHash:'a'.repeat(64),now},minister={actor:'amberina',mode:'technology',term:'term1',tokenHash:'b'.repeat(64),now};
 for(const a of [citizen,minister])db.prepare('INSERT INTO member_sessions VALUES(?,?,?,?,?)').run(a.tokenHash,a.actor,now+60000,a.mode,now+60000);
 db.exec("INSERT INTO current_office_holders VALUES('technology','amberina','term1')");
 const port={prepare(q){return {bind(...args){const st=db.prepare(q);return {async first(){return st.get(...args)??null},async all(){return {results:st.all(...args)}},async run(){return {meta:{changes:Number(st.run(...args).changes)}}}}}}}};
 const objects=new Map(),storage={async put(k,b){objects.set(k,b.slice())},async get(k){return objects.get(k)??null}};
 const raw=galleryStore(port,storage,{quotaBytes:1024}),visible=galleryStore(publicReadDb(port,config),storage,{quotaBytes:1024});
 // Real storage/ledger logic, object port in memory. Image inspection is a separate service.
 const bytes=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64'));
 return {db,port,citizen,minister,raw,visible,bytes,objects};
}
test('canonical Gallery: unregistered hidden, pending visible, minister rejection restores previous approved version, owner raw retained',async()=>{
 const f=fixture();try{
 const {raw,visible,port,bytes,citizen,minister}=f;
 await raw.create('Test','完成作品',citizen.actor,'work');
 await raw.addVersion('work',null,'first.png',bytes,citizen.actor,'v1');
 assert.equal((await visible.list()).length,0);
 await assert.rejects(visible.read('work','v1'),e=>e.status===404);
 await assert.rejects(submitReview(port,{kind:'gallery',entity:'work',version:'v1',category:'完成作品'},minister),e=>e.status===409);
 assert.equal((await submitReview(port,{kind:'gallery',entity:'work',version:'v1',category:'完成作品'},citizen)).state,'pending');
 assert.equal((await visible.list())[0].version_id,'v1');
 await assert.rejects(reviewDecision(port,{kind:'gallery',entity:'work',version:'v1',state:'approved',expected:1,reason:'ok'},citizen),e=>e.status===403);
 await reviewDecision(port,{kind:'gallery',entity:'work',version:'v1',state:'approved',expected:1,reason:'ok'},minister);
 await raw.addVersion('work','v1','second.png',bytes,citizen.actor,'v2');
 await submitReview(port,{kind:'gallery',entity:'work',version:'v2',category:'完成作品'},citizen);
 assert.equal((await visible.list())[0].version_id,'v2');
 await reviewDecision(port,{kind:'gallery',entity:'work',version:'v2',state:'rejected',expected:1,reason:'repair'},minister);
 assert.equal((await visible.list())[0].version_id,'v1');
 assert.deepEqual((await visible.history('work')).map(x=>x.id),['v1']);
 await assert.rejects(visible.read('work','v2'),e=>e.status===404);
 assert.deepEqual((await raw.read('work','v2')).bytes,bytes);
 assert.equal((await reviewList(port,citizen)).length,2);
 f.db.exec("UPDATE current_office_holders SET term_id='term2'");
 await assert.rejects(reviewDecision(port,{kind:'gallery',entity:'work',version:'v2',state:'approved',expected:2,reason:'stale'},minister),e=>e.status===409);
 }finally{f.db.close()}
});
test('minister direct submission, idempotency, quota and approved slot visibility',async()=>{
 const f=fixture();try{
 const {raw,visible,port,bytes,minister,citizen,db}=f;
 await raw.create('Direct','完成作品',minister.actor,'direct');
 await raw.addVersion('direct',null,'direct.png',bytes,minister.actor,'v3');
 const p={kind:'gallery',entity:'direct',version:'v3',category:'完成作品'};
 assert.equal((await submitReview(port,p,minister)).state,'approved');
 assert.equal((await submitReview(port,p,minister)).state,'approved');
 assert.equal((await reviewList(port,citizen)).length,0);
 assert.equal((await visible.list()).length,1);
 const insert=db.prepare("INSERT INTO library_revisions(revision,kind,entity_id,state,actor,created_at,payload) VALUES(?,'book',?,'published',?,'test','{}')");
 insert.run('b1','book1',minister.actor);
 await submitReview(port,{kind:'book',entity:'book1',version:'b1',category:'书籍'},minister);
 await assignSlot(port,{book:'book1',slot:'A',expected:0},minister);
 await displayBook(port,{book:'book1',slot:'A',expected:0},minister);
 assert.equal(db.prepare('SELECT count(*) n FROM imperial_slot_display_current').get().n,1);
 await reviewDecision(port,{kind:'book',entity:'book1',version:'b1',state:'rejected',expected:1,reason:'repair'},minister);
 assert.equal(db.prepare('SELECT count(*) n FROM imperial_slot_display_current').get().n,0);
 await assert.rejects(displayBook(port,{book:'book1',slot:'A',expected:1},minister),e=>e.status===409);
 await reviewDecision(port,{kind:'book',entity:'book1',version:'b1',state:'approved',expected:2,reason:'restore'},minister);
 assert.equal(db.prepare('SELECT count(*) n FROM imperial_slot_display_current').get().n,1);
 }finally{f.db.close()}
});
