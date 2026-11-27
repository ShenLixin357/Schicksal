import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {galleryR2Budget,R2_GALLERY_LIMITS as L} from '../server/gallery/r2-budget.ts';
import {r2ObjectPort} from '../server/gallery/r2-port.ts';
const now=Date.parse('2026-11-28T00:00:00Z');
function fixture(seed=true){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(readFileSync(new URL('../integration/imperial-v3/foundation/gallery-r2-budget.proposed.sql',import.meta.url),'utf8'));
 const db={prepare(sql){return {bind(...args){return {async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}}}}}}}};
 if(seed)sqlite.prepare('INSERT INTO gallery_r2_budget VALUES(1,1,?,?,?,?,?,?,?,0,0)').run('2026-11',now+3600000,0,0,0,0,'2026-11-28');
 const budget=galleryR2Budget(db,()=>now);
 const calls=[];
 const bucket={async put(key,bytes){calls.push(['put',key,bytes.length]);if(key==='failed')throw Error('ambiguous R2 failure')},async get(key){calls.push(['get',key]);return null}};
 return {sqlite,budget,calls,port:r2ObjectPort(bucket,budget),second:r2ObjectPort(bucket,budget),row:()=>sqlite.prepare('SELECT * FROM gallery_r2_budget').get()};
}
test('no configured budget never touches R2',async()=>{const f=fixture(false);await assert.rejects(f.port.get('x'));await assert.rejects(f.port.put('x',new Uint8Array(4),'x'));assert.deepEqual(f.calls,[])});
test('combined ports reserve concurrent writes before R2',async()=>{const f=fixture();f.sqlite.exec('UPDATE gallery_r2_budget SET reserved_bytes='+ (L.bytes-5));const r=await Promise.allSettled([f.port.put('one',new Uint8Array(4),'x'),f.second.put('two',new Uint8Array(4),'x')]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(f.calls.length,1);assert.equal(f.row().reserved_bytes,L.bytes-1)});
test('failed attempts remain counted and retried writes count again',async()=>{const f=fixture();await assert.rejects(f.port.put('failed',new Uint8Array(4),'x'));await f.second.put('next',new Uint8Array(4),'x');assert.equal(f.row().reserved_bytes,8);assert.equal(f.row().class_a,2)});
test('account external storage reduces available space',async()=>{const f=fixture();f.sqlite.exec('UPDATE gallery_r2_budget SET external_bytes='+L.bytes);await assert.rejects(f.port.put('x',new Uint8Array(1),'x'));assert.equal(f.calls.length,0)});
test('every attempted get including missing object consumes B budget',async()=>{const f=fixture();f.sqlite.exec('UPDATE gallery_r2_budget SET class_b='+(L.b-1));await f.port.get('absent');await assert.rejects(f.second.get('absent'));assert.equal(f.calls.length,1);assert.equal(f.row().class_b,L.b)});
test('day caps reset only on forward day, not month; stale month blocks',async()=>{const f=fixture();f.sqlite.exec("UPDATE gallery_r2_budget SET day='2026-11-27',day_a="+L.dayA);await f.port.put('x',new Uint8Array(1),'x');assert.equal(f.row().day_a,1);f.sqlite.exec("UPDATE gallery_r2_budget SET billing_month='2026-10'");await assert.rejects(f.port.get('x'));assert.equal(f.calls.length,1)});
test('expired, disabled, implausibly long attestation block',async()=>{for(const update of ['enabled=0','verified_until_ms='+now,'verified_until_ms='+(now+86400001)]){const f=fixture();f.sqlite.exec('UPDATE gallery_r2_budget SET '+update);await assert.rejects(f.port.get('x'));assert.equal(f.calls.length,0)}});
test('malformed reserve cannot bypass or decrement budget',async()=>{const f=fixture();for(const [kind,bytes] of [['A',-1],['A',0],['B',1],['other',0],['A',NaN]])await assert.rejects(f.budget.reserve(kind,bytes));assert.equal(f.row().reserved_bytes,0)});
test('daily read cap blocks even if monthly quota remains',async()=>{const f=fixture();f.sqlite.exec('UPDATE gallery_r2_budget SET day_b='+L.dayB);await assert.rejects(f.port.get('x'));assert.equal(f.calls.length,0)});
