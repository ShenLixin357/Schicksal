import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
const expected="83ce009837e212a2730bbb484fe130da889d94b0";
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
assert.match(account||"",/^[a-f0-9]{32}$/);assert.ok(token);
const report=(s)=>{console.log(s);if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,s+"\n");};
async function get(path){const r=await fetch("https://api.cloudflare.com/client/v4/accounts/"+account+path,{headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(20000)});const j=await r.json();if(!r.ok||!j.success)throw Error("Cloudflare read failed: HTTP "+r.status);return j.result;}
function wrangler(args){const r=spawnSync(process.execPath,["node_modules/wrangler/bin/wrangler.js",...args],{encoding:"utf8",env:{...process.env,CI:"true"}});assert.equal(r.status,0,"Read-only D1 command failed");return JSON.parse(r.stdout);}
const inventory=wrangler(["d1","list","--json"]);
const prod=inventory.filter(x=>x.name==="schicksal-db"),preview=inventory.filter(x=>x.name==="schicksal-ui-preview-db"||x.name==="schicksal-briefing-preview-db");
assert.equal(prod.length,1);assert.ok(preview.length>0&&preview.every(x=>x.uuid!==prod[0].uuid));
const settings=await get("/workers/scripts/schicksal/settings");
const bindings=settings.bindings||[],db=bindings.filter(x=>x.type==="d1");
assert.equal(db.length,1);assert.equal(db[0].name,"DB");assert.equal(db[0].id??db[0].database_id,prod[0].uuid);
assert.ok(!bindings.some(b=>b.name==="SCHICKSAL_PREVIEW_COMMIT"||b.type==="r2_bucket"&&/preview/i.test(b.bucket_name??b.bucket??"")));
const marker=bindings.find(b=>b.name==="SCHICKSAL_RELEASE_COMMIT")?.text;
const deployment=await get("/workers/scripts/schicksal/deployments");
const latest=(deployment.deployments??deployment)[0];
report("LIVE deployment unchanged from pre-release: "+(latest?.id==="2c9a522c-d8f6-4696-9826-284d16de705b"));
report("LIVE deployment created: "+(latest?.created_on??latest?.createdOn??"unknown"));
report("LIVE release marker matches approved main: "+(marker===expected));
report("LIVE release marker present: "+Boolean(marker));
const migrations=wrangler(["d1","execute","schicksal-db","--remote","--json","--command","SELECT name FROM d1_migrations ORDER BY id"])[0].results;
report("LIVE D1 last migration: "+migrations.at(-1)?.name+"; total: "+migrations.length);
const count=wrangler(["d1","execute","schicksal-db","--remote","--json","--command","SELECT (SELECT count(*) FROM committee_vase_history) AS vase_history, (SELECT count(*) FROM member_credentials) AS credentials, (SELECT count(*) FROM parliament_items) AS items"])[0].results[0];
report("LIVE D1 existing rows: "+JSON.stringify(count));assert.ok(count.vase_history>=47&&count.credentials>=5&&count.items>=4);
if(migrations.at(-1)?.name==="0020_parliament_document_versions.sql"){const m=wrangler(["d1","execute","schicksal-db","--remote","--json","--command","SELECT count(*) n FROM parliament_items i LEFT JOIN parliament_document_versions d ON d.item_id=i.id AND d.version=i.version WHERE d.item_id IS NULL OR d.title IS NOT i.title OR d.summary IS NOT i.summary OR d.body IS NOT i.body"])[0].results[0];report("LIVE document history mismatches: "+m.n);assert.equal(m.n,0);}
for(const path of ["/","/api/briefing","/api/parliament"]){const r=await fetch("https://schicksal.m17686100216.workers.dev"+path,{redirect:"manual",signal:AbortSignal.timeout(15000)});report("LIVE HTTP "+path+": "+r.status);assert.equal(r.status,401);await r.body?.cancel();}
report("Live production DB identity and privacy confirmed; exact release active: "+(marker===expected&&migrations.at(-1)?.name==="0020_parliament_document_versions.sql"));
