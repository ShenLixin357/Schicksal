/** Update the isolated acceptance Worker without GitHub Actions minutes.
 *
 * Run from repository root after:
 *   npx wrangler login
 *   export CLOUDFLARE_ACCOUNT_ID=<your account's 32 hex character ID>
 *   node scripts/cloudflare/deploy-ui-preview-local.mjs
 *
 * This does not deploy or reference the production Worker as a target.
 * Only the named isolated preview DB is migrated. Secrets are never printed.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root=process.cwd();
const wrangler=resolve(root,"node_modules/.bin/wrangler");
const accountId=process.env.CLOUDFLARE_ACCOUNT_ID || "";
assert.match(accountId,/^[a-f0-9]{32}$/i,"Set CLOUDFLARE_ACCOUNT_ID to the intended Cloudflare account ID");
const git=(args)=>execFileSync("git",args,{cwd:root,encoding:"utf8"}).trim();
const sha=git(["rev-parse","HEAD"]);
assert.match(sha,/^[a-f0-9]{40}$/i);
assert.equal(git(["rev-parse","--show-toplevel"]),root,"Run this script from the repository root");
const branch=git(["branch","--show-current"]);
assert.equal(branch,"feature/minister-dual-account-switch-20261121",
  "Safety stop: this deploys only the reviewed, cumulative PR #23 branch.");
if (git(["status","--porcelain"]).trim()) throw Error("Safety stop: commit your working tree before deploying.");

const run=(file,args)=>{
  const out=spawnSync(file,args,{cwd:root,stdio:"inherit",env:process.env});
  if(out.status!==0) throw Error("Command failed: "+file+" "+args.join(" "));
};
const json=JSON.parse(execFileSync(wrangler,["d1","list","--json"],{
  cwd:root,encoding:"utf8",env:process.env,stdio:["inherit","pipe","inherit"]
}));
assert.ok(Array.isArray(json),"Unexpected Wrangler D1 listing");
const one=(name)=>{
  const rows=json.filter(db=>db.name===name);
  assert.equal(rows.length,1,"Exactly one D1 named "+name+" is required (will never create production resources)");
  assert.match(rows[0].uuid,/^[0-9a-f-]{36}$/i);
  return rows[0];
};
const production=one("schicksal-db"),preview=one("schicksal-ui-preview-db");
assert.notEqual(preview.uuid.toLowerCase(),production.uuid.toLowerCase(),"Safety stop: preview D1 equals production D1");

mkdirSync(resolve(root,"work"),{recursive:true});
writeFileSync(resolve(root,"work/briefing-preview-target.json"),JSON.stringify({
  accountId,previewDatabaseId:preview.uuid,productionDatabaseId:production.uuid,
  previewDatabaseName:preview.name
},null,2));
run("npm",["run","build"]);
run("node",["scripts/cloudflare/prepare-ui-preview.mjs","work/briefing-preview-target.json"]);
const configPath=resolve(root,"work/ui-preview-dist/server/wrangler.json");
const conf=JSON.parse(readFileSync(configPath,"utf8"));
assert.equal(conf.name,"schicksal-ui-preview");
assert.equal(conf.d1_databases.length,1);
assert.equal(conf.d1_databases[0].database_id,preview.uuid);
assert.notEqual(conf.d1_databases[0].database_id,production.uuid);
assert.equal(conf.assets.run_worker_first,true);
conf.vars.SCHICKSAL_PREVIEW_COMMIT=sha;
writeFileSync(configPath,JSON.stringify(conf,null,2));
run(wrangler,["deploy","--dry-run","--config",configPath]);
console.log("Applying migrations ONLY to isolated D1: "+preview.name);
run(wrangler,["d1","migrations","apply","DB","--remote","--config",configPath]);
console.log("Deploying ONLY Worker: "+conf.name);
run(wrangler,["deploy","--config",configPath]);

const url="https://schicksal-ui-preview.m17686100216.workers.dev/?verify="+sha;
const response=await fetch(url,{cache:"no-store",headers:{"Cache-Control":"no-cache"}});
const body=await response.text();
if(response.status!==401 || !body.includes('id="identity-technology"') ||
   !body.includes("05 / 08 CITIZENS · 01 OFFICE") ||
   !body.includes("MINISTRY OF TECHNOLOGY · OFFICIAL ENTRY")) {
  throw Error("Deployed Worker DID NOT expose the current public ministry login page. Check assets/edge URL before approval. HTTP "+response.status);
}
console.log("VERIFIED live unauthenticated minister entry: "+url);
console.log("Source SHA: "+sha);
console.log("Unchanged: production Worker, production D1, production photos.");
