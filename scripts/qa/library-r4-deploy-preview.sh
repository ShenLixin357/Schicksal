#!/usr/bin/env bash
# Dedicated library review only. Never invoke the main-site deployment command.
set -euo pipefail
test "$GITHUB_REF_NAME" = "intake/library-r4-20261127"
test "$(gh api "repos/$GITHUB_REPOSITORY" --jq '.private')" = true
test "$(git rev-parse HEAD)" = "$CANDIDATE_SHA"
test "$(gh api "repos/$GITHUB_REPOSITORY/branches/feature%2Flibrary-integration-20261127" --jq '.commit.sha')" = "$CANDIDATE_SHA"
test -n "$CLOUDFLARE_API_TOKEN"
test -n "$CLOUDFLARE_ACCOUNT_ID"
test -n "$SCHICKSAL_PREVIEW_PASSWORDS"
export LIBRARY_WORKER=schicksal-library-r4-preview-20261127
export LIBRARY_DB=schicksal-library-r4-preview-20261127-db
export LIBRARY_ROOT=https://schicksal-library-r4-preview-20261127.m17686100216.workers.dev
export INVENTORY="$RUNNER_TEMP/library-r4-db-inventory.json"
npx wrangler d1 list --json > "$INVENTORY"
node --input-type=module - <<'NODE'
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
assert.match(process.env.CLOUDFLARE_ACCOUNT_ID,/^[a-f0-9]{32}$/);
assert.equal(process.env.LIBRARY_DB,"schicksal-library-r4-preview-20261127-db");
const inventory=JSON.parse(readFileSync(process.env.INVENTORY,"utf8"));
assert.ok(Array.isArray(inventory));
assert.equal(inventory.filter(x=>x.name==="schicksal-db").length,1);
assert.ok(inventory.filter(x=>x.name===process.env.LIBRARY_DB).length<=1);
const passwords=JSON.parse(process.env.SCHICKSAL_PREVIEW_PASSWORDS);
assert.ok(typeof passwords.amberina==="string"&&passwords.amberina.length>=12);
assert.ok(Object.keys(passwords).every(k=>["amberina","zxy","truth","kaito","harry"].includes(k)));
NODE
if ! node --input-type=module -e 'import {readFileSync} from "node:fs"; process.exit(JSON.parse(readFileSync(process.env.INVENTORY)).some(x=>x.name===process.env.LIBRARY_DB)?0:1)'; then
  npx wrangler d1 create "$LIBRARY_DB" --no-update-config
  npx wrangler d1 list --json > "$INVENTORY"
fi
node --input-type=module - <<'NODE'
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
const inventory=JSON.parse(readFileSync(process.env.INVENTORY,"utf8"));
const found=inventory.filter(x=>x.name===process.env.LIBRARY_DB);
assert.equal(found.length,1);
const id=found[0].uuid;
assert.match(id,/^[a-f0-9-]{36}$/i);
assert.equal(inventory.filter(x=>x.uuid===id).length,1);
assert.ok(inventory.filter(x=>x.name!==process.env.LIBRARY_DB).every(x=>x.uuid!==id));
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
const result=await fetch("https://api.cloudflare.com/client/v4/accounts/"+account+"/workers/scripts/"+process.env.LIBRARY_WORKER+"/settings",{headers:{Authorization:"Bearer "+token}});
if(result.ok){
 const body=await result.json();
 assert.ok(body.success);
 const bindings=body.result.bindings||[];
 assert.ok(bindings.some(x=>x.name==="SCHICKSAL_PREVIEW_COMMIT"&&/^[0-9a-f]{40}$/.test(x.text||"")));
 const db=bindings.filter(x=>x.type==="d1");assert.equal(db.length,1);assert.equal(db[0].id??db[0].database_id,id);
 assert.ok(!bindings.some(x=>x.type==="r2_bucket"));
}else assert.equal(result.status,404,"Cannot safely determine whether dedicated preview already exists");
const built=JSON.parse(readFileSync("dist/server/wrangler.json","utf8"));
const config={name:process.env.LIBRARY_WORKER,account_id:account,main:"index.js",compatibility_date:built.compatibility_date,compatibility_flags:built.compatibility_flags,no_bundle:true,...(built.rules?{rules:built.rules}:{}),workers_dev:true,preview_urls:false,keep_vars:false,assets:{directory:"../client",binding:"ASSETS",run_worker_first:true},vars:{SCHICKSAL_HOSTING:"cloudflare",SUPABASE_STORAGE_BUCKET:"library-r4-disabled",SCHICKSAL_PREVIEW_COMMIT:process.env.CANDIDATE_SHA},d1_databases:[{binding:"DB",database_name:process.env.LIBRARY_DB,database_id:id,migrations_dir:"../../drizzle"}]};
assert.equal(config.name,"schicksal-library-r4-preview-20261127");
assert.equal(config.d1_databases[0].database_name,"schicksal-library-r4-preview-20261127-db");
assert.ok(!("r2_buckets" in config));
writeFileSync("dist/server/library-r4-preview.wrangler.json",JSON.stringify(config,null,2));
console.log("PASS dedicated Worker and D1 inventory; no R2 or production bindings");
NODE
CONFIG=dist/server/library-r4-preview.wrangler.json
npx wrangler deploy --dry-run --config "$CONFIG"
npx wrangler d1 migrations apply DB --remote --config "$CONFIG"
npx wrangler deploy --config "$CONFIG"
printf "%s" "$SCHICKSAL_PREVIEW_PASSWORDS" | npx wrangler secret put SCHICKSAL_MEMBER_PASSWORDS --config "$CONFIG"
node --input-type=module - <<'NODE'
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const config=JSON.parse(readFileSync("dist/server/library-r4-preview.wrangler.json","utf8"));
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
const sr=await fetch("https://api.cloudflare.com/client/v4/accounts/"+account+"/workers/scripts/"+config.name+"/settings",{headers:{Authorization:"Bearer "+token}});
assert.ok(sr.ok);
const settings=(await sr.json()).result,bindings=settings.bindings||[];
assert.equal(bindings.filter(x=>x.type==="d1").length,1);
const db=bindings.find(x=>x.type==="d1");
assert.equal(db.id??db.database_id,config.d1_databases[0].database_id);
assert.ok(!bindings.some(x=>x.type==="r2_bucket"));
assert.ok(bindings.some(x=>x.name==="SCHICKSAL_PREVIEW_COMMIT"&&x.text===process.env.CANDIDATE_SHA));
const root=process.env.LIBRARY_ROOT,headers={Origin:root,"Content-Type":"application/json"};
for(const path of ["/","/library/data/nation-building.json","/api/library/debug"]){const r=await fetch(root+path);assert.equal(r.status,401,path);await r.body?.cancel();}
const password=JSON.parse(process.env.SCHICKSAL_PREVIEW_PASSWORDS).amberina;
const login=await fetch(root+"/api/member-session",{method:"POST",headers,body:JSON.stringify({citizenId:"amberina",password})});assert.equal(login.status,200);
headers.Cookie=login.headers.get("set-cookie")?.split(";")[0];assert.ok(headers.Cookie);
try{
 const version=await fetch(root+"/api/preview-version",{headers});assert.equal(version.status,200);assert.deepEqual(await version.json(),{preview:true,sourceSha:process.env.CANDIDATE_SHA});
 assert.equal((await fetch(root+"/api/library/debug",{headers})).status,403);
 const catalog=await fetch(root+"/library/data/nation-building.json",{headers});assert.equal(catalog.status,200);assert.equal((await catalog.json()).chapters.length,7);
 assert.equal((await fetch(root+"/api/member-session/switch",{method:"POST",headers,body:JSON.stringify({target:"technology"})})).status,200);
 const dbg=await fetch(root+"/api/library/debug",{headers});assert.equal(dbg.status,200);assert.deepEqual(await dbg.json(),{authorized:true,mode:"local-preview-only",publish:false});
}finally{assert.equal((await fetch(root+"/api/member-session",{method:"DELETE",headers})).status,200);}
console.log("PASS verified dedicated preview URL, exact SHA, private assets, seven chapters and minister authorization");
NODE
{
  echo "### Verified Library R4 isolated preview"
  echo "Candidate: $CANDIDATE_SHA"
  echo "URL: $LIBRARY_ROOT"
  echo "Dedicated Worker and D1 only; no R2, no V1.1; production and other previews unchanged."
  echo "User visual acceptance and manual native Safari/physical touch checks are separate from automated gates."
} >> "$GITHUB_STEP_SUMMARY"
