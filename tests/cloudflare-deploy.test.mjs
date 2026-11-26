import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { lockBuiltBinding } from "../scripts/cloudflare/lock-built-binding.mjs";
const deploy = new URL("../scripts/cloudflare/deploy-build.mjs", import.meta.url).pathname;
const account = "a".repeat(32), database = "11111111-2222-4333-8444-555555555555";
async function fixture({ missingId = false, missingAccount = false, failMigration = false, wrongId = false, wrongName = false } = {}) {
    const root = await mkdtemp(join(tmpdir(), "schicksal-deploy-"));
    await mkdir(join(root, "dist/server"), { recursive: true });
    await mkdir(join(root, "node_modules/wrangler/bin"), { recursive: true });
    await cp(new URL("../drizzle", import.meta.url), join(root, "drizzle"), { recursive: true });
    await writeFile(join(root, "dist/server/wrangler.json"), JSON.stringify({ name: "schicksal", ...(!missingAccount && { account_id: account }), assets: { run_worker_first: true }, preview_urls: false, d1_databases: [{ binding: "DB", database_name: "schicksal-db", ...(!missingId && { database_id: database }) }] }));
    await writeFile(join(root, "node_modules/wrangler/bin/wrangler.js"), `const fs=require('node:fs'),args=process.argv.slice(2);fs.appendFileSync('calls.jsonl',JSON.stringify(args)+'\\n');if(args[0]==='d1'&&args[1]==='info')console.log(JSON.stringify({uuid:${JSON.stringify(wrongId ? 'wrong-id' : database)},name:${JSON.stringify(wrongName ? 'schicksal-ui-preview-db' : 'schicksal-db')}}));if(args[0]==='d1'&&args[1]==='migrations'&&${failMigration})process.exit(7);`);
    return root;
}
async function calls(root) { return (await readFile(join(root, "calls.jsonl"), "utf8").catch(() => "")).trim().split("\n").filter(Boolean).map(JSON.parse); }
function run(root, flags = [], additions = {}) {
    const env = { ...process.env };
    for (const key of ["CLOUDFLARE_ACCOUNT_ID", "SCHICKSAL_D1_DATABASE_ID", "SCHICKSAL_DEPLOY_CONFIG", "SCHICKSAL_MIGRATION_BASE"])
        delete env[key];
    return spawnSync(process.execPath, [deploy, ...flags], { cwd: root, encoding: "utf8", env: { ...env, ...additions } });
}
test("missing account or DB ID fails before remote calls; no automatic creation", async () => {
    for (const missing of [{ missingId: true }, { missingAccount: true }]) {
        const root = await fixture(missing);
        try {
            assert.notEqual(run(root).status, 0);
            assert.deepEqual(await calls(root), []);
        }
        finally {
            await rm(root, { recursive: true, force: true });
        }
    }
});
test("verifies the exact existing DB then migrates before deploying", async () => {
    const root = await fixture();
    try {
        const result = run(root);
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual((await calls(root)).map(a => a.slice(0, 2)), [["d1", "info"], ["d1", "migrations"], ["deploy", "--config"]]);
        const config = JSON.parse(await readFile(join(root, "dist/server/wrangler.json"), "utf8"));
        assert.equal(config.d1_databases[0].database_id, database);
        assert.equal(config.account_id, account);
    }
    finally {
        await rm(root, { recursive: true, force: true });
    }
});
test("wrong identity, conflicting ID or failed migration prevents deployment", async () => {
    for (const options of [{ wrongId: true }, { wrongName: true }, { failMigration: true }, {}]) {
        const root = await fixture(options);
        try {
            const result = run(root, [], Object.keys(options).length ? {} : { SCHICKSAL_D1_DATABASE_ID: "22222222-2222-4333-8444-555555555555" });
            assert.notEqual(result.status, 0);
            assert.ok(!(await calls(root)).some(a => a[0] === "deploy"));
            if (options.wrongId || options.wrongName)
                assert.ok(!(await calls(root)).some(a => a[1] === "migrations"));
        }
        finally {
            await rm(root, { recursive: true, force: true });
        }
    }
});
test("check and migrate-only never publish a Worker", async () => {
    for (const flag of ["--check", "--migrate-only"]) {
        const root = await fixture();
        try {
            const result = run(root, [flag]);
            assert.equal(result.status, 0, result.stderr);
            const requests = await calls(root);
            assert.ok(!requests.some(a => a[0] === "deploy"));
            assert.equal(requests.some(a => a[1] === "migrations"), flag === "--migrate-only");
        }
        finally {
            await rm(root, { recursive: true, force: true });
        }
    }
});
test("build finalization pins direct Wrangler deployment and refuses missing IDs", async () => {
    const root = await fixture({ missingAccount: true, missingId: true }), path = join(root, "dist/server/wrangler.json");
    try {
        await assert.rejects(lockBuiltBinding(path, {}));
        assert.deepEqual(await calls(root), []);
        await lockBuiltBinding(path, { CLOUDFLARE_ACCOUNT_ID: account, SCHICKSAL_D1_DATABASE_ID: database });
        const config = JSON.parse(await readFile(path, "utf8"));
        assert.equal(config.account_id, account);
        assert.equal(config.d1_databases[0].database_id, database);
        assert.deepEqual(await calls(root), []);
    }
    finally {
        await rm(root, { recursive: true, force: true });
    }
});

test("native non-main builds cannot call the production deployment command", async () => {
    const root = await fixture();
    try {
        const result = run(root, [], { WORKERS_CI: "1", WORKERS_CI_BRANCH: "release/preview" });
        assert.notEqual(result.status, 0);
        assert.deepEqual(await calls(root), []);
    } finally { await rm(root, { recursive: true, force: true }); }
});
