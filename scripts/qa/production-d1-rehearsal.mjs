import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, appendFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
const token=process.env.CLOUDFLARE_API_TOKEN, account=process.env.CLOUDFLARE_ACCOUNT_ID;
assert.ok(token && /^[a-f0-9]{32}$/.test(account ?? ""));
const work=mkdtempSync(join(tmpdir(),"schicksal-private-rehearsal-"));
const api="https://api.cloudflare.com/client/v4/accounts/"+account;
const note=s=>{console.log(s);if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,s+"\n");};
async function readApi(path) {
  const response=await fetch(api+path,{headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(30_000)});
  const data=await response.json().catch(()=>null);
  if(!response.ok||data?.success!==true)throw Error("Cloudflare read failed: HTTP "+response.status+" codes "+JSON.stringify(data?.errors?.map(e=>e.code)??[]));
  return data.result;
}
function wrangler(args) {
  const r=spawnSync(process.execPath,["node_modules/wrangler/bin/wrangler.js",...args],{encoding:"utf8",maxBuffer:16*1024*1024,env:{...process.env,CI:"true"}});
  if(r.status!==0)throw Error("Read-only Wrangler "+args.slice(0,2).join(" ")+" failed, exit "+r.status);
  return r.stdout;
}
function sqlQuote(x){return '"'+x.replaceAll('"','""')+'"';}
function rowDigest(row){return createHash("sha256").update(JSON.stringify(row,(_k,v)=>typeof v==="bigint"?v.toString():v)).digest("hex");}
function hashCounts(rows){const m=new Map();for(const row of rows){const h=rowDigest(row);m.set(h,(m.get(h)??0)+1);}return m;}
function readRows(db,table,columns){return db.prepare("SELECT "+columns.map(sqlQuote).join(",")+" FROM "+sqlQuote(table)).all();}
function verify(db){assert.equal(db.prepare("PRAGMA integrity_check").get().integrity_check,"ok");assert.equal(db.prepare("PRAGMA foreign_key_check").all().length,0,"Foreign key violations");}
try {
  const inventory=JSON.parse(wrangler(["d1","list","--json"]));
  const prod=inventory.filter(x=>x.name==="schicksal-db"), preview=inventory.filter(x=>x.name==="schicksal-ui-preview-db"||x.name==="schicksal-briefing-preview-db");
  assert.equal(prod.length,1,"Exact production database missing");
  assert.ok(preview.length>=1,"No independent preview database found");
  assert.ok(/^[a-f0-9-]{36}$/i.test(prod[0].uuid)&&preview.every(x=>x.uuid!==prod[0].uuid),"Production/preview D1 overlap");
  const dbId=prod[0].uuid;
  const settings=await readApi("/workers/scripts/schicksal/settings");
  const bindings=settings.bindings??[];
  const d1=bindings.filter(b=>b.type==="d1");
  assert.equal(d1.length,1,"Unexpected production D1 bindings");
  assert.equal(d1[0].name,"DB");
  assert.equal(d1[0].id,d1[0].id===undefined?undefined:dbId,"Production Worker binding mismatch");
  assert.equal(d1[0].id??d1[0].database_id,dbId,"Production Worker does not point at schicksal-db");
  const buckets=bindings.filter(b=>b.type==="r2_bucket");
  assert.ok(buckets.every(b=>!String(b.bucket_name??b.bucket??"").includes("preview")),"Preview R2 bound to production");
  note("Production Worker DB identity verified; isolated preview databases excluded. Storage binding types: "+JSON.stringify(buckets.map(b=>({name:b.name,type:b.type}))));
  const deployment=await readApi("/workers/scripts/schicksal/deployments");
  const current=(deployment.deployments??deployment)[0];
  assert.ok(current?.id,"No current production deployment ID");
  note("Existing production deployment ID: "+current.id);
  const bookmark=JSON.parse(wrangler(["d1","time-travel","info","schicksal-db","--json"]));
  const marker=bookmark.bookmark??bookmark.result?.bookmark??bookmark.data?.bookmark;
  assert.ok(typeof marker==="string"&&/^[-a-f0-9]{16,}$/i.test(marker),"No D1 recovery bookmark");
  note("Production D1 recovery bookmark: "+marker+" (captured "+new Date().toISOString()+")");
  const remote=JSON.parse(wrangler(["d1","execute","schicksal-db","--remote","--json","--command","SELECT name FROM d1_migrations ORDER BY id"]));
  const applied=remote[0]?.results?.map(r=>r.name);
  assert.ok(Array.isArray(applied)&&applied.length>0,"Production migration list unreadable");
  const files=readdirSync("drizzle").filter(n=>n.endsWith(".sql")).sort();
  assert.deepEqual(applied,files.slice(0,applied.length),"Production migrations differ from sealed prefix");
  const pending=files.slice(applied.length);
  note("Production applied migrations: "+applied.length+"; pending: "+pending.join(", "));
  const exportPath=join(work,"production.sql");
  wrangler(["d1","export","schicksal-db","--remote","--skip-confirmation","--output",exportPath]);
  const db=new DatabaseSync(":memory:");
  try{
    const sql=readFileSync(exportPath,"utf8");
    assert.ok(sql.length>1024,"Empty production export");
    db.exec(sql);verify(db);
    const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name).filter(t=>t!=="d1_migrations"&&!t.startsWith("_cf_"));
    for(const name of ["member_credentials","parliament_items","parliament_votes","committee_vase_history","archive_photos"])assert.ok(tables.includes(name),"Missing core table: "+name);
    const before=new Map(tables.map(t=>{const columns=db.prepare("PRAGMA table_info("+sqlQuote(t)+")").all().map(c=>c.name);return [t,{columns,rows:hashCounts(readRows(db,t,columns))}];}));
    for(const name of pending){
      try {db.exec(readFileSync(join("drizzle",name),"utf8"));}catch(e){throw Error("Local migration failed: "+name+" ("+(e.code??"SQLite")+")");}
    }
    verify(db);
    const violations=[];
    for(const [t,snapshot] of before){
      const after=hashCounts(readRows(db,t,snapshot.columns));
      let missing=0;for(const [h,count] of snapshot.rows)missing+=Math.max(0,count-(after.get(h)??0));
      if(missing)violations.push({table:t,existingRowsChangedOrMissing:missing});
      const sum=m=>[...m.values()].reduce((a,b)=>a+b,0);
      note("Preservation "+t+": before "+sum(snapshot.rows)+", after "+sum(after)+", changed/missing "+missing);
    }
    assert.equal(violations.length,0,"Existing rows changed during rehearsal: "+JSON.stringify(violations));
    const missing=db.prepare("SELECT count(*) n FROM parliament_items i LEFT JOIN parliament_document_versions d ON d.item_id=i.id AND d.version=i.version WHERE d.item_id IS NULL OR d.title IS NOT i.title OR d.summary IS NOT i.summary OR d.body IS NOT i.body").get().n;
    assert.equal(missing,0,"Production document baseline mismatch");
    note("PASS: actual production SQL restored in memory, all pending migrations rehearsed, all pre-existing rows preserved, current document history exact. No production or preview writes.");
  }finally{db.close();}
}finally{rmSync(work,{recursive:true,force:true});}
