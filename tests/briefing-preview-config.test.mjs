import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const script = new URL("../scripts/cloudflare/prepare-briefing-preview.mjs", import.meta.url).pathname;
const production = "00000000-0000-4000-8000-000000000001";
const preview = "00000000-0000-4000-8000-000000000002";
async function fixture(overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), "schicksal-briefing-preview-"));
  await mkdir(join(root, "dist/server"), { recursive: true });
  await mkdir(join(root, "dist/client"), { recursive: true });
  await mkdir(join(root, "drizzle"), { recursive: true });
  await mkdir(join(root, "work"), { recursive: true });
  await writeFile(join(root, "dist/server/index.js"), "export default { fetch() {} };");
  await writeFile(join(root, "dist/server/wrangler.json"), JSON.stringify({
    name: "schicksal", compatibility_date: "2026-05-15",
    compatibility_flags: ["nodejs_compat"], rules: [{ type: "Text", globs: ["**/*.txt"] }],
    d1_databases: [{ binding: "DB", database_id: production }],
  }));
  await writeFile(join(root, "dist/client/marker.txt"), "preview-asset");
  await writeFile(join(root, "drizzle/0000_test.sql"), "CREATE TABLE one (id TEXT PRIMARY KEY);");
  const targetPath = join(root, "work/briefing-preview-target.json");
  await writeFile(targetPath, JSON.stringify({
    accountId: "f".repeat(32),
    previewDatabaseId: preview,
    productionDatabaseId: production,
    previewDatabaseName: "schicksal-briefing-preview-db",
    ...overrides,
  }));
  return { root, targetPath };
}
function prepare({ root, targetPath }) {
  return spawnSync(process.execPath, [script, targetPath], { cwd: root, encoding: "utf8" });
}

test("preview uses an entirely separate Worker and isolated D1, never production", async () => {
  const target = await fixture();
  try {
    const result = prepare(target);
    assert.equal(result.status, 0, result.stderr);
    const path = join(target.root, "work/briefing-preview-dist/server/wrangler.json");
    const config = JSON.parse(await readFile(path, "utf8"));
    assert.equal(config.name, "schicksal-briefing-preview");
    assert.equal(config.d1_databases[0].database_id, preview);
    assert.equal(config.d1_databases[0].database_name, "schicksal-briefing-preview-db");
    assert.notEqual(config.d1_databases[0].database_id, production);
    assert.deepEqual(config.assets, { directory: "../client", binding: "ASSETS", run_worker_first: true });
    assert.equal(config.keep_vars, true);
    assert.equal(config.workers_dev, true);
    assert.equal(config.preview_urls, false);
    assert.equal("r2_buckets" in config, false);
    assert.equal("SUPABASE_URL" in config.vars, false);
    assert.equal("SCHICKSAL_MEMBER_PASSWORDS" in config.vars, false);
    assert.equal((await readFile(join(target.root, "work/briefing-preview-dist/client/marker.txt"), "utf8")), "preview-asset");
    assert.equal((await readFile(join(target.root, "dist/server/wrangler.json"), "utf8")).includes(production), true);
    assert.match(result.stdout, /"deployed": false/);
  } finally { await rm(target.root, { recursive: true, force: true }); }
});

test("preview refuses to point at production D1", async () => {
  const target = await fixture({ previewDatabaseId: production });
  try {
    const result = prepare(target);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /REFUSING to bind the production D1/);
  } finally { await rm(target.root, { recursive: true, force: true }); }
});

test("preview refuses mistaken resource names and embedded secrets", async () => {
  const tests = [
    { previewDatabaseName: "schicksal-db" },
    { workerName: "schicksal" },
    { SCHICKSAL_MEMBER_PASSWORDS: '{"amberina":"password"}' },
  ];
  for (const override of tests) {
    const target = await fixture(override);
    try {
      assert.notEqual(prepare(target).status, 0);
    } finally { await rm(target.root, { recursive: true, force: true }); }
  }
});
