#!/usr/bin/env bash
# ONLY local miniflare state; no Cloudflare account token, remote binding, production or R2.
set -euo pipefail
unset CLOUDFLARE_API_TOKEN CF_API_TOKEN CLOUDFLARE_ACCOUNT_ID SCHICKSAL_D1_DATABASE_ID
REPORT="$RUNNER_TEMP/v32-browser"
mkdir -p "$REPORT"
export V32_REPORT="$REPORT"
export SCHICKSAL_LOCAL_SHA="${V32_BUILT_SHA:-$GITHUB_SHA}"
export SCHICKSAL_LOCAL_URL=http://127.0.0.1:8787
export SCHICKSAL_TEST_MEMBER=amberina
export SCHICKSAL_TEST_PASSWORD="$(node -e 'console.log(require("node:crypto").randomBytes(24).toString("hex"))')"
export SCHICKSAL_TEST_TECH_PASSWORD="$(node -e 'console.log(require("node:crypto").randomBytes(24).toString("hex"))')"
echo "::add-mask::$SCHICKSAL_TEST_PASSWORD"
echo "::add-mask::$SCHICKSAL_TEST_TECH_PASSWORD"
node --input-type=module - <<'NODE'
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
const built=JSON.parse(readFileSync("dist/server/wrangler.json","utf8"));
assert.match(process.env.SCHICKSAL_LOCAL_SHA,/^[0-9a-f]{40}$/);
const config={name:"schicksal-v32-local",main:"index.js",compatibility_date:built.compatibility_date,compatibility_flags:built.compatibility_flags,no_bundle:true,...(built.rules?{rules:built.rules}:{}),assets:{directory:"../client",binding:"ASSETS",run_worker_first:true},vars:{SCHICKSAL_HOSTING:"cloudflare",SUPABASE_STORAGE_BUCKET:"v32-disabled",SCHICKSAL_PREVIEW_COMMIT:process.env.SCHICKSAL_LOCAL_SHA,SCHICKSAL_MINISTRY_V2:"1",SCHICKSAL_GUIDE_ENABLED:"true",SCHICKSAL_EXPLORATION_ENABLED:"true",SCHICKSAL_GUIDE_LIBRARY_READY:"true",SCHICKSAL_ACHIEVEMENTS_ENABLED:"true",SCHICKSAL_LIMITED_EXPLORATION_ENABLED:"true",SCHICKSAL_LIBRARY_V11_ENABLED:"true",SCHICKSAL_GALLERY_ENTRY_ENABLED:"true",SCHICKSAL_V3_STATUS_ENABLED:"true"},d1_databases:[{binding:"DB",database_name:"schicksal-v32-local-db",database_id:"00000000-0000-4000-8000-000000000004",migrations_dir:"../../drizzle"}]};
writeFileSync("dist/server/v32-local.wrangler.json",JSON.stringify(config,null,2));
writeFileSync("dist/server/.dev.vars","SCHICKSAL_MEMBER_PASSWORDS='"+JSON.stringify({amberina:process.env.SCHICKSAL_TEST_PASSWORD})+"'\n",{mode:0o600});
NODE
CONFIG=dist/server/v32-local.wrangler.json
STATE="$RUNNER_TEMP/v32-local-d1"
npx wrangler d1 migrations apply DB --local --persist-to "$STATE" --config "$CONFIG"
npx wrangler d1 execute DB --local --persist-to "$STATE" --config "$CONFIG" --file integration/imperial-v3/qa/preview-guide-exploration.sql
npx wrangler d1 execute DB --local --persist-to "$STATE" --config "$CONFIG" --file integration/imperial-v3/qa/preview-limited-exploration.sql
npx wrangler d1 execute DB --local --persist-to "$STATE" --config "$CONFIG" --file integration/imperial-v3/qa/preview-review-notices.sql
python3 integration/imperial-v3/qa/prepare-library-seed.py --output "$RUNNER_TEMP/v32-library-seed.sql"
npx wrangler d1 execute DB --local --persist-to "$STATE" --config "$CONFIG" --file "$RUNNER_TEMP/v32-library-seed.sql"
npx wrangler dev --local --ip 127.0.0.1 --port 8787 --persist-to "$STATE" --config "$CONFIG" >"$REPORT/worker.log" 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null || true; rm -f dist/server/.dev.vars' EXIT
node --input-type=module - <<'NODE'
import assert from "node:assert/strict";
const root=process.env.SCHICKSAL_LOCAL_URL;let ready=false;
for(let i=0;i<60;i++){try{const r=await fetch(root,{signal:AbortSignal.timeout(1000)});if(r.status===401){ready=true;await r.body?.cancel();break;}}catch{}await new Promise(r=>setTimeout(r,1000));}
assert.ok(ready,"Local Worker not ready");
const password=process.env.SCHICKSAL_TEST_PASSWORD;
const headers={Origin:root,"Content-Type":"application/json"};
const login=await fetch(root+"/api/member-session",{method:"POST",headers,body:JSON.stringify({citizenId:"amberina",password})});
assert.equal(login.status,200,"Local ordinary login");
const cookie=login.headers.get("set-cookie")?.split(";")[0];assert.ok(cookie);
headers.Cookie=cookie;
assert.equal((await fetch(root+"/api/library/debug",{headers})).status,403);
assert.equal((await fetch(root+"/api/member-session/switch",{method:"POST",headers,body:JSON.stringify({target:"technology"})})).status,200);
assert.equal((await fetch(root+"/api/library/debug",{headers})).status,200);
assert.equal((await fetch(root+"/api/technology/direct-password",{method:"PUT",headers,body:JSON.stringify({personalPassword:password,newPassword:process.env.SCHICKSAL_TEST_TECH_PASSWORD})})).status,200);
assert.equal((await fetch(root+"/api/member-session",{method:"DELETE",headers})).status,200);
console.log("PASS real local authentication, debug 403/200 and distinct local-only office password");
NODE
python -u integration/imperial-v3/qa/local-browser.py "$1" 2>&1 | tee "$REPORT/browser.log"
