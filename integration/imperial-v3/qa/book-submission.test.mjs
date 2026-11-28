import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {commitBook} from '../../../server/library/book-submission.mjs';
import {reviewDecision} from '../../../server/imperial-v3/review.mjs';
const dir=mkdtempSync(join(tmpdir(),'schicksal-book-review-'));
const root='integration/imperial-v3/qa/';
const sql=join(dir,'seed.sql'),review=join(dir,'review.sql');
execFileSync('python3',[root+'prepare-library-seed.py','--output',sql]);execFileSync('python3',[root+'prepare-collection-review.py','--output',review]);
const id='book-11111111-2222-4333-8444-555555555555';
function fixture(){
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');db.exec(readFileSync(sql,'utf8'));db.exec(readFileSync(review,'utf8'));
 db.exec("CREATE TABLE member_sessions(token_hash TEXT PRIMARY KEY,citizen_id TEXT,expires_at INTEGER,account_mode TEXT,minister_grant_expires_at INTEGER);CREATE TABLE current_office_holders(office_id TEXT,citizen_id TEXT,term_id TEXT);");
 const now=Date.now(),a={actor:'zxy',mode:'citizen',term:null,tokenHash:'a'.repeat(64),now},b={actor:'truth',mode:'citizen',term:null,tokenHash:'b'.repeat(64),now},m={actor:'amberina',mode:'technology',term:'term1',tokenHash:'c'.repeat(64),now};
 for(const u of [a,b,m])db.prepare('INSERT INTO member_sessions VALUES(?,?,?,?,?)').run(u.tokenHash,u.actor,now+60000,u.mode,now+60000);
 db.exec("INSERT INTO current_office_holders VALUES('technology','amberina','term1')");
 const port={prepare(q){return {bind(...args){return {q,args,async first(){return db.prepare(q).get(...args)??null},async all(){return {results:db.prepare(q).all(...args)}}}}}},async batch(stmts){db.exec('BEGIN');try{const out=stmts.map(s=>({meta:{changes:Number(db.prepare(s.q).run(...s.args).changes)}}));db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}};
 const payload=(title,book=id)=>JSON.stringify({id:book,title,author:'zxy',status:'bound',chapters:[{id:'c',title:'正文',markdown:'text'}]});
 return {db,port,a,b,m,payload};
}
test('citizen submission, retry, rejection, original retained and old approved visible',async()=>{const f=fixture();try{const {db,port,a,b,m,payload}=f;assert.equal(db.prepare("SELECT count(*) n FROM imperial_visible_library_revisions WHERE kind='book'").get().n,11);const p={id,revision:'v1',base:null,payload:payload('One')};assert.equal((await commitBook(port,p,a)).state,'pending');assert.equal((await commitBook(port,p,a)).replayed,true);await assert.rejects(commitBook(port,{...p,revision:'v2',base:'v1'},b),e=>e.status===403);await reviewDecision(port,{kind:'book',entity:id,version:'v1',state:'approved',expected:1,reason:'reviewed'},m);await commitBook(port,{id,revision:'v2',base:'v1',payload:payload('Two')},a);await reviewDecision(port,{kind:'book',entity:id,version:'v2',state:'rejected',expected:1,reason:'revise'},m);assert.deepEqual(db.prepare("SELECT revision FROM imperial_visible_library_revisions WHERE entity_id=?").all(id).map(x=>x.revision),['v1']);assert.ok(db.prepare("SELECT payload FROM library_revisions WHERE revision='v2'").get());}finally{f.db.close()}});
test('minister edit preserves original author, audit actor and rejects stale term',async()=>{const f=fixture();try{const {db,port,a,m,payload}=f;await commitBook(port,{id,revision:'v1',base:null,payload:payload('One')},a);assert.equal((await commitBook(port,{id,revision:'v2',base:'v1',payload:payload('Two')},m)).state,'approved');assert.equal(db.prepare("SELECT author FROM imperial_review_items WHERE version='v2'").get().author,'zxy');assert.equal(db.prepare("SELECT actor FROM imperial_review_history WHERE version='v2'").get().actor,'amberina');db.exec("UPDATE current_office_holders SET term_id='term2'");await assert.rejects(commitBook(port,{id,revision:'v3',base:'v2',payload:payload('Three')},m),e=>e.status===409);assert.equal(db.prepare("SELECT COUNT(*) n FROM library_revisions WHERE revision='v3'").get().n,0);await assert.rejects(commitBook(port,{id:'AVS',revision:'bad',base:null,payload:payload('Invalid','AVS')},a));}finally{f.db.close()}});
test.after(()=>rmSync(dir,{recursive:true,force:true}));
