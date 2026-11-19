/**
 * Prepare a wholly separate Cloudflare Worker + D1 for reviewing the real
 * briefing React page. This script NEVER deploys or migrates anything.
 *
 * Usage after `npm run build`:
 *   node scripts/cloudflare/prepare-briefing-preview.mjs work/briefing-preview-target.json
 *
 * Target contains only resource identifiers, NOT API tokens or passwords.
 * Do not use the normal `npm run deploy` for previews: it deploys the
 * primary Worker and applies migrations automatically.
 */
import assert from "node:assert/strict";
import { cp, mkdir, readFile, access, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";

const root = process.cwd();
const targetPath = resolve(process.argv[2] || "work/briefing-preview-target.json");
const target = JSON.parse(await readFile(targetPath, "utf8"));
const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const account = /^[a-f0-9]{32}$/i;

assert.match(target.accountId, account, "Specify the real Cloudflare account ID");
assert.match(target.previewDatabaseId, uuid, "A NEW isolated preview D1 UUID is required");
assert.match(target.productionDatabaseId, uuid, "Production D1 UUID is required for comparison; it will not be used");
assert.notEqual(target.previewDatabaseId.toLowerCase(), target.productionDatabaseId.toLowerCase(),
  "REFUSING to bind the production D1 database to a preview");
assert.equal(target.previewDatabaseName, "schicksal-briefing-preview-db",
  "Preview database must use the dedicated schicksal-briefing-preview-db name");

const allowed = new Set(["accountId", "previewDatabaseId", "productionDatabaseId", "previewDatabaseName"]);
assert.ok(Object.keys(target).every((key) => allowed.has(key)),
  "Target file must contain resource IDs only; no secrets or unrelated settings");

const output = resolve(root, "work/briefing-preview-dist");
const builtServer = resolve(root, "dist/server");
const builtClient = resolve(root, "dist/client");
const migrations = resolve(root, "drizzle");
await access(resolve(builtServer, "index.js"));
await access(resolve(builtServer, "wrangler.json"));
await access(builtClient);
await access(migrations);
const built = JSON.parse(await readFile(resolve(builtServer, "wrangler.json"), "utf8"));

await mkdir(output, { recursive: true });
await cp(builtServer, resolve(output, "server"), { recursive: true, force: true });
await cp(builtClient, resolve(output, "client"), { recursive: true, force: true });
await cp(migrations, resolve(output, "drizzle"), { recursive: true, force: true });

const config = {
  name: "schicksal-briefing-preview",
  account_id: target.accountId,
  main: "index.js",
  compatibility_date: built.compatibility_date,
  compatibility_flags: built.compatibility_flags,
  no_bundle: true,
  ...(built.rules ? { rules: built.rules } : {}),
  workers_dev: true,
  preview_urls: false,
  keep_vars: true,
  assets: { directory: "../client", binding: "ASSETS", run_worker_first: true },
  vars: {
    SCHICKSAL_HOSTING: "cloudflare",
    SUPABASE_STORAGE_BUCKET: "schicksal-preview-unconfigured",
  },
  d1_databases: [{
    binding: "DB",
    database_name: target.previewDatabaseName,
    database_id: target.previewDatabaseId,
    migrations_dir: "../drizzle",
  }],
  observability: { enabled: true },
};
const configPath = resolve(output, "server/wrangler.json");
await writeFile(configPath, JSON.stringify(config, null, 2) + "\n");

const validation = JSON.parse(await readFile(configPath, "utf8"));
assert.equal(validation.name, "schicksal-briefing-preview");
assert.equal(validation.d1_databases.length, 1);
assert.equal(validation.d1_databases[0].database_id, target.previewDatabaseId);
assert.notEqual(validation.d1_databases[0].database_id, target.productionDatabaseId);
assert.equal(validation.assets.run_worker_first, true);
assert.equal(validation.assets.directory, "../client");
assert.equal("r2_buckets" in validation, false);
assert.equal("SUPABASE_SECRET_KEY" in validation.vars, false);
console.log(JSON.stringify({
  prepared: true,
  isolatedWorker: validation.name,
  isolatedD1Name: validation.d1_databases[0].database_name,
  isolatedD1Id: validation.d1_databases[0].database_id,
  configPath,
  deployed: false,
  next: "Verify the preview database ID and set a PREVIEW-ONLY member password secret on the preview Worker before testing login.",
}, null, 2));
