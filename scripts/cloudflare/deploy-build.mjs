import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { deploymentBinding } from "./binding.mjs";
import { checkMigrations } from "../migrations.mjs";
const wrangler = resolve("node_modules/wrangler/bin/wrangler.js"), config = resolve(process.env.SCHICKSAL_DEPLOY_CONFIG || "dist/server/wrangler.json");
await access(config);
const settings = JSON.parse(await readFile(config, "utf8"));
// Native Cloudflare production Builds already have an authorized account token.
 // Resolve ONLY the existing live production Worker binding; never create a database.
 // Local/manual deployments still require explicit IDs and fail closed.
if (settings.name === "schicksal") {
    assert.equal(settings.d1_databases?.[0]?.database_name, "schicksal-db", "Production must use the exact production database name");
    assert.ok(!settings.vars?.SCHICKSAL_PREVIEW_COMMIT, "Preview version markers are forbidden on production");
    assert.ok(!(settings.r2_buckets ?? []).some(b => /preview/i.test(b.bucket_name)), "Preview storage is forbidden on production");
    if (process.env.WORKERS_CI === "1") {
        assert.equal(process.env.WORKERS_CI_BRANCH, "main", "Native production deploy is allowed only from main");
        const account = settings.account_id || process.env.CLOUDFLARE_ACCOUNT_ID;
        const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
        assert.match(account || "", /^[a-f0-9]{32}$/i, "Production build requires the existing authorized account");
        assert.ok(token, "Production build requires the native Cloudflare authorization");
        const response = await fetch("https://api.cloudflare.com/client/v4/accounts/" + account + "/workers/scripts/schicksal/settings", { headers: { Authorization: "Bearer " + token }, signal: AbortSignal.timeout(30000) });
        const result = await response.json();
        assert.ok(response.ok && result.success === true, "Cannot verify live production Worker settings");
        const live = (result.result.bindings || []).filter(b => b.type === "d1");
        assert.equal(live.length, 1, "Expected exactly one live production D1");
        assert.equal(live[0].name, "DB");
        const liveId = live[0].id || live[0].database_id;
        assert.match(liveId || "", /^[a-f0-9-]{36}$/i, "Missing live production DB identity");
        const supplied = settings.d1_databases[0].database_id;
        if (supplied && supplied !== "00000000-0000-4000-8000-000000000000") assert.equal(supplied, liveId, "Built database differs from live production");
        if (process.env.SCHICKSAL_D1_DATABASE_ID) assert.equal(process.env.SCHICKSAL_D1_DATABASE_ID, liveId, "Environment database differs from live production");
        settings.d1_databases[0].database_id = liveId;
        settings.account_id = account;
        assert.match(process.env.WORKERS_CI_COMMIT_SHA || "", /^[a-f0-9]{40}$/i, "Missing native build commit");
        settings.vars = { ...settings.vars, SCHICKSAL_RELEASE_COMMIT: process.env.WORKERS_CI_COMMIT_SHA };
    }
}
// Missing or conflicting IDs fail before any mutation.
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
// Wrangler d1 info resolves a database NAME or binding, not its UUID.
// UUID is still the authority: require the returned identity to match exactly.
const info = run(["d1", "info", binding.databaseName || "DB", "--json"], true);
assert.equal(info.uuid || info.id, binding.databaseId, "D1 identity differs; refusing migration/deployment");
if (binding.databaseName)
    assert.equal(info.name, binding.databaseName, "D1 name differs from the reviewed binding");
if (settings.name === "schicksal") assert.equal(info.name, "schicksal-db", "Refusing to use any preview database on production");
if (process.argv.includes("--check"))
    console.log("Existing account and DB verified; no migrations or publication.");
else {
    run(["d1", "migrations", "apply", "DB", "--remote"]);
    if (!process.argv.includes("--migrate-only"))
        run(["deploy"]);
}
