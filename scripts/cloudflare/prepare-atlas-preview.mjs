/**
 * Construct an isolated Schicksal Atlas preview artifact.
 * Does not perform remote writes. Production D1 UUID is accepted solely to
 * reject collisions; no production database is used or modified.
 */
import assert from "node:assert/strict";
import { cp, mkdir, readFile, writeFile, access } from "node:fs/promises";
import { resolve } from "node:path";

const targetPath = resolve(process.argv[2] || "work/atlas-preview-target.json");
const target = JSON.parse(await readFile(targetPath, "utf8"));
const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
assert.match(target.accountId, /^[a-f0-9]{32}$/i);
assert.match(target.previewDatabaseId, uuid);
assert.match(target.productionDatabaseId, uuid);
assert.equal(target.previewDatabaseName,"schicksal-atlas-preview-db");
assert.notEqual(target.previewDatabaseId.toLowerCase(),target.productionDatabaseId.toLowerCase());
assert.deepEqual(Object.keys(target).sort(),["accountId","previewDatabaseId","previewDatabaseName","productionDatabaseId"].sort());

const root=process.cwd(), server=resolve(root,"dist/server"), client=resolve(root,"dist/client"), drizzle=resolve(root,"drizzle");
await access(resolve(server,"index.js"));
await access(resolve(server,"wrangler.json"));
await access(client);await access(drizzle);
const built=JSON.parse(await readFile(resolve(server,"wrangler.json"),"utf8"));
const out=resolve(root,"work/atlas-preview-dist");
await mkdir(out,{recursive:true});
await cp(server,resolve(out,"server"),{recursive:true,force:true});
await cp(client,resolve(out,"client"),{recursive:true,force:true});
await cp(drizzle,resolve(out,"drizzle"),{recursive:true,force:true});
const config={
 name:"schicksal-atlas-preview",account_id:target.accountId,main:"index.js",
 compatibility_date:built.compatibility_date,
 compatibility_flags:built.compatibility_flags,
 no_bundle:true,...(built.rules?{rules:built.rules}:{}),
 workers_dev:true,preview_urls:false,
 keep_vars:true, assets:{directory:"../client",binding:"ASSETS",run_worker_first:true},
 vars:{SCHICKSAL_HOSTING:"cloudflare",SUPABASE_STORAGE_BUCKET:"schicksal-atlas-preview-unconfigured"},
 d1_databases:[{binding:"DB",database_name:target.previewDatabaseName,database_id:target.previewDatabaseId,migrations_dir:"../drizzle"}],
 observability:{enabled:true}
};
const path=resolve(out,"server/wrangler.json");
assert.equal(config.d1_databases[0].database_id!==target.productionDatabaseId,true);
assert.equal("r2_buckets" in config,false);
await writeFile(path,JSON.stringify(config,null,2)+"\n");
console.log(JSON.stringify({isolated:true,worker:config.name,database:config.d1_databases[0].database_name,configPath:path}));
