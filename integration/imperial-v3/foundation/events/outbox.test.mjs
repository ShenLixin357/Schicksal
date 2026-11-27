import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {prepareEvent,claim,complete,fail,summary} from './outbox.mjs';
function setup(){
  const sql=new DatabaseSync(':memory:'); sql.exec('PRAGMA foreign_keys=ON;'+readFileSync(new URL('./outbox.sql',import.meta.url),'utf8'));
  const db={prepare(query){return {bind(...args){return {async first(){return sql.prepare(query).get(...args)??null},async run(){return sql.prepare(query).run(...args)},async all(){return {results:sql.prepare(query).all(...args)}}}},async all(){return {results:sql.prepare(query).all()}}}}};
  return {db,sql};
}
const event={kind:'book.published',resource:'book-A',revision:1};
const add=(db,e=event,t=100)=>prepareEvent(db,e,t).run();
test('duplicate publish fans out once; different revisions preserved',async()=>{const {db,sql}=setup();await add(db);await add(db);await add(db,{...event,revision:2});assert.equal(sql.prepare('SELECT count(*) n FROM imperial_events').get().n,2);assert.deepEqual((await summary(db)).map(r=>[r.consumer,r.state,r.count]),[['observatory','pending',2],['search','pending',2]]);});
test('reject extra data, unknown kind, unsafe identifiers, fractional revision',()=>{const {db}=setup();for(const e of [{...event,body:'private'}, {...event,kind:'anything'}, {...event,resource:'a/b'}, {...event,revision:1.5}])assert.throws(()=>prepareEvent(db,e));});
test('event and fanout rolled back with domain transaction',async()=>{const {db,sql}=setup();sql.exec('BEGIN');await add(db);sql.exec('ROLLBACK');assert.equal((await summary(db)).length,0);});
test('claim excludes competing lease and consumers are independent',async()=>{const {db}=setup();await add(db);const [a,b]=await Promise.all([claim(db,'search',{at:100}),claim(db,'search',{at:100})]);assert.equal([a,b].filter(Boolean).length,1);assert.ok(await claim(db,'observatory',{at:100}));assert.equal(await claim(db,'exploration',{at:100}),null);});
test('expired lease reclaimed; old worker fenced off',async()=>{const {db}=setup();await add(db);const a=await claim(db,'search',{at:100,leaseSeconds:5});const b=await claim(db,'search',{at:105,leaseSeconds:5});assert.equal(b.attempts,2);assert.notEqual(a.lease_token,b.lease_token);assert.equal(await complete(db,a,105),false);assert.equal(await fail(db,a,'temporary',105),null);assert.equal(await complete(db,b,106),true);assert.equal(await complete(db,b,106),false);});
test('retry delay and permanent failure',async()=>{const {db}=setup();await add(db);const a=await claim(db,'search',{at:100});assert.equal(await fail(db,a,'temporary',101),'pending');assert.equal(await claim(db,'search',{at:130}),null);const b=await claim(db,'search',{at:131});assert.equal(b.attempts,2);assert.equal(await fail(db,b,'invalid',132),'dead');assert.equal(await claim(db,'search',{at:999}),null);});
test('fifth expired lease becomes dead; does not loop forever',async()=>{const {db}=setup();await add(db);for(let i=0;i<5;i++)assert.equal((await claim(db,'search',{at:100+i*5,leaseSeconds:5})).attempts,i+1);assert.equal(await claim(db,'search',{at:125,leaseSeconds:5}),null);assert.ok((await summary(db)).some(r=>r.consumer==='search'&&r.state==='dead'));});
test('invalid worker arguments fail closed; error messages not persisted',async()=>{const {db}=setup();await add(db);await assert.rejects(claim(db,'arbitrary'));await assert.rejects(claim(db,'search',{at:100,leaseSeconds:0}));const a=await claim(db,'search',{at:100});await assert.rejects(fail(db,a,'private error text',101));assert.equal(await complete(db,a,101),true);});
test('event immutable; exploration not delivered to search',async()=>{const {db,sql}=setup();await add(db,{kind:'exploration.discovered',resource:'opaque-1',revision:1});assert.throws(()=>sql.exec('DELETE FROM imperial_events'));assert.throws(()=>sql.exec('UPDATE imperial_events SET revision=2'));assert.ok(await claim(db,'exploration',{at:100}));assert.equal(await claim(db,'search',{at:100}),null);});
