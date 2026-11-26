/**
 * Cloudflare Workers Builds - deploy the isolated acceptance Worker only.
 *
 * Dashboard Settings > Builds:
 *   Production branch: feature/minister-dual-account-switch-20261121
 *   Build:  npm ci && npm run test:privacy && npm run test:identity && npm run db:check && npm run build
 *   Deploy: node scripts/cloudflare/deploy-ui-preview-builds.mjs
 *
 * Required build variables (not passwords): CLOUDFLARE_ACCOUNT_ID,
 * SCHICKSAL_PREVIEW_D1_ID, SCHICKSAL_PROD_D1_ID.
 * Never set a production Worker name or production DB ID as preview.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root=process.cwd();
const targetWorker="schicksal-ui-preview";
const expectedBranch="feature/minister-dual-account-switch-20261121";
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const account=/^[a-f0-9]{32}$/i;
const shaPattern=/^[a-f0-9]{40}$/i;
const { WORKERS_CI_BRANCH:branch, WORKERS_CI_COMMIT_SHA:sha,
  CLOUDFLARE_ACCOUNT_ID:accountId, SCHICKSAL_PREVIEW_D1_ID:previewDatabaseId,
  SCHICKSAL_PROD_D1_ID:productionDatabaseId }=process.env;

assert.equal(process.env.WORKERS_CI,"1","Run this from the connected Cloudflare Workers Builds environment only.");
assert.equal(branch,expectedBranch,"Deploy guard: unexpected Git branch.");
assert.match(sha??"",shaPattern,"Build commit SHA unavailable.");
assert.match(accountId??"",account,"Cloudflare account ID must be configured as a build variable.");
assert.match(previewDatabaseId??"",uuid,"The ISOLATED preview D1 UUID must be a build variable.");
assert.match(productionDatabaseId??"",uuid,"The production D1 UUID must be configured only for exclusion.");
assert.notEqual(previewDatabaseId.toLowerCase(),productionDatabaseId.toLowerCase(),
  "Refusing to use the same D1 for preview and production.");

mkdirSync(resolve(root,"work"),{recursive:true});
const targetPath=resolve(root,"work/ui-preview-build-target.json");
writeFileSync(targetPath,JSON.stringify({
  accountId,previewDatabaseId,productionDatabaseId,
  previewDatabaseName:"schicksal-ui-preview-db",
},null,2)+"\n");

const run=(file,args)=>{
  const result=spawnSync(file,args,{cwd:root,env:process.env,stdio:"inherit"});
  if(result.error)throw result.error;
  assert.equal(result.status,0,"Failed: "+file+" "+args.join(" "));
};
run("node",["scripts/cloudflare/prepare-ui-preview.mjs",targetPath]);
const configPath=resolve(root,"work/ui-preview-dist/server/wrangler.json");
const config=JSON.parse(readFileSync(configPath,"utf8"));
assert.equal(config.name,targetWorker);
assert.equal(config.account_id,accountId);
assert.equal(config.d1_databases.length,1);
assert.equal(config.d1_databases[0].database_name,"schicksal-ui-preview-db");
assert.equal(config.d1_databases[0].database_id,previewDatabaseId);
assert.notEqual(config.d1_databases[0].database_id,productionDatabaseId);
assert.equal(config.assets.run_worker_first,true);
assert.equal(config.assets.directory,"../client");
assert.equal(config.vars.SUPABASE_STORAGE_BUCKET,"schicksal-preview-unconfigured");
assert.equal(config.vars.SCHICKSAL_HOSTING,"cloudflare");
assert.ok(!config.routes && !config.route && !config.r2_buckets && !config.kv_namespaces,
  "Preview Worker must not inherit production routes or storage bindings.");
config.vars.SCHICKSAL_PREVIEW_COMMIT=sha;
writeFileSync(configPath,JSON.stringify(config,null,2)+"\n");

const wrangler=resolve(root,"node_modules/.bin/wrangler");
run(wrangler,["deploy","--dry-run","--config",configPath]);
console.log("Only applying migrations to isolated D1: schicksal-ui-preview-db");
run(wrangler,["d1","migrations","apply","DB","--remote","--config",configPath]);
console.log("Only deploying Worker: "+targetWorker);
run(wrangler,["deploy","--config",configPath]);

// The anonymous entry is the pre-auth HTML, not the React login component.
const url="https://schicksal-ui-preview.m17686100216.workers.dev/?build-verify="+sha;
const result=await fetch(url,{headers:{"Cache-Control":"no-cache"},cache:"no-store"});
const html=await result.text();
assert.equal(result.status,401,"Expected a protected anonymous entry page.");
assert.ok(html.includes('id="identity-technology"'),"Missing minister login card on actual deployed entry.");
assert.ok(html.includes("05 / 08 CITIZENS · 01 OFFICE"),"Unpatched legacy login was deployed.");
console.log("VERIFIED: "+targetWorker+" at "+url);
console.log("VERIFIED source SHA: "+sha);
console.log("Production Worker and production D1 were never targeted.");
