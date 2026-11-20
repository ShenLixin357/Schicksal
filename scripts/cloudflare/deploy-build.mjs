import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { deploymentBinding } from "./binding.mjs";
import { checkMigrations } from "../migrations.mjs";
const wrangler = resolve("node_modules/wrangler/bin/wrangler.js"), config = resolve(process.env.SCHICKSAL_DEPLOY_CONFIG || "dist/server/wrangler.json");
await access(config);
const settings = JSON.parse(await readFile(config, "utf8"));
// Missing or conflicting IDs fail before any remote operation.
const binding = deploymentBinding(settings);
await checkMigrations(process.cwd());
settings.account_id = binding.accountId;
settings.d1_databases[0].database_id = binding.databaseId;
settings.d1_databases[0].migrations_dir = resolve("drizzle");
function run(args, json = false) {
    const result = spawnSync(process.execPath, [wrangler, ...args, "--config", config], { stdio: json ? ["ignore", "pipe", "inherit"] : "inherit", encoding: "utf8", env: { ...process.env, CI: "true", CLOUDFLARE_ACCOUNT_ID: binding.accountId } });
    if (result.error)
        throw result.error;
    if (result.status !== 0)
        process.exit(result.status ?? 1);
    return json ? JSON.parse(result.stdout) : null;
}
await writeFile(config, JSON.stringify(settings, null, 2));
const info = run(["d1", "info", binding.databaseId, "--json"], true);
assert.equal(info.uuid || info.id, binding.databaseId, "D1 identity differs; refusing migration/deployment");
if (binding.databaseName)
    assert.equal(info.name, binding.databaseName, "D1 name differs from the reviewed binding");
if (process.argv.includes("--check"))
    console.log("Existing account and DB verified; no migrations or publication.");
else {
    run(["d1", "migrations", "apply", "DB", "--remote"]);
    if (!process.argv.includes("--migrate-only"))
        run(["deploy"]);
}
