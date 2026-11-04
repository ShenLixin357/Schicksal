import assert from "node:assert/strict";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const targetFile = resolve(process.argv[2] || "work/cloudflare-target.json");
const target = JSON.parse(await readFile(targetFile, "utf8"));
assert.match(target.accountId, /^[a-f0-9]{32}$/i, "Cloudflare account ID is required");
assert.match(target.databaseId, /^[a-f0-9-]{36}$/i, "Created D1 database ID is required");
assert.notEqual(target.databaseId, "00000000-0000-4000-8000-000000000000", "Do not deploy the Sites placeholder database");
const storageProvider = target.storageProvider || "supabase";
assert.ok(["supabase", "r2"].includes(storageProvider), "Unknown photo storage provider");
if (storageProvider === "r2") {
  assert.match(target.bucketName, /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/);
  assert.notEqual(target.bucketName, "site-creator-r2");
}
const output = resolve(root, "work/cloudflare-dist"); await mkdir(output, { recursive: true });
await cp(resolve(root, "dist/server"), resolve(output, "server"), { recursive: true, force: true });
await cp(resolve(root, "dist/client"), resolve(output, "client"), { recursive: true, force: true });
await cp(resolve(root, "drizzle"), resolve(output, "drizzle"), { recursive: true, force: true });
const generated = JSON.parse(await readFile(resolve(root, "dist/server/wrangler.json"), "utf8"));
const config = { name: target.workerName || "schicksal-first-empire", account_id: target.accountId, main: "index.js", compatibility_date: generated.compatibility_date, compatibility_flags: generated.compatibility_flags, no_bundle: true, rules: generated.rules, workers_dev: true, preview_urls: false,
  assets: { directory: "../client", binding: "ASSETS", run_worker_first: ["/api/*"] },
  keep_vars: true,
  vars: { SCHICKSAL_HOSTING: "cloudflare", SUPABASE_STORAGE_BUCKET: "schicksal-photos" },
  d1_databases: [{ binding: "DB", database_name: target.databaseName || "schicksal-data", database_id: target.databaseId, migrations_dir: "../drizzle" }],
  ...(storageProvider === "r2" ? { r2_buckets: [{ binding: "BUCKET", bucket_name: target.bucketName }] } : {}), observability: { enabled: true },
};
await writeFile(resolve(output, "server/wrangler.json"), JSON.stringify(config, null, 2));
console.log(JSON.stringify({ config: resolve(output, "server/wrangler.json"), workerName: config.name, standaloneAuth: true, secretRequired: "SCHICKSAL_MEMBER_PASSWORDS" }));
