import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const deploy = new URL("../scripts/cloudflare/deploy-build.mjs", import.meta.url).pathname;
async function fixture(existing = false, failMigration = false) {
  const root = await mkdtemp(join(tmpdir(), "schicksal-deploy-"));
  await mkdir(join(root, "dist/server"), { recursive: true });
  await mkdir(join(root, "node_modules/wrangler/bin"), { recursive: true });
  await writeFile(join(root, "dist/server/wrangler.json"), JSON.stringify({ name: "schicksal", d1_databases: [{ binding: "DB", migrations_dir: "drizzle" }] }));
  await writeFile(join(root, "databases.json"), JSON.stringify(existing ? [{ name: "schicksal-db", uuid: "test-existing-id" }] : []));
  await writeFile(join(root, "node_modules/wrangler/bin/wrangler.js"), `
    const fs = require("node:fs");
    const args = process.argv.slice(2); fs.appendFileSync("calls.jsonl", JSON.stringify(args) + "\\n");
    if (args[0] === "d1" && args[1] === "list") console.log(fs.readFileSync("databases.json", "utf8"));
    if (args[0] === "d1" && args[1] === "create") fs.writeFileSync("databases.json", JSON.stringify([{name: args[2], uuid: "test-new-id"}]));
    if (args[0] === "d1" && args[1] === "migrations" && ${failMigration}) process.exit(7);
  `);
  return root;
}
async function calls(root) { return (await readFile(join(root, "calls.jsonl"), "utf8")).trim().split("\n").map(JSON.parse); }

test("first deployment creates D1, records its actual ID and applies migrations before publishing", async () => {
  const root = await fixture();
  try {
    const result = spawnSync(process.execPath, [deploy], { cwd: root, encoding: "utf8" }); assert.equal(result.status, 0, result.stderr);
    const requests = await calls(root); assert.deepEqual(requests.map((args) => args.slice(0, 2)), [["d1", "list"], ["d1", "create"], ["d1", "list"], ["d1", "migrations"], ["deploy", "--config"]]);
    const config = JSON.parse(await readFile(join(root, "dist/server/wrangler.json"), "utf8"));
    assert.equal(config.d1_databases[0].database_id, "test-new-id"); assert.equal(config.d1_databases[0].migrations_dir, join(root, "drizzle"));
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("later deployments reuse the same database without creating a duplicate", async () => {
  const root = await fixture(true);
  try {
    const result = spawnSync(process.execPath, [deploy], { cwd: root, encoding: "utf8" }); assert.equal(result.status, 0, result.stderr);
    const requests = await calls(root); assert.equal(requests.some((args) => args[1] === "create"), false);
    const config = JSON.parse(await readFile(join(root, "dist/server/wrangler.json"), "utf8")); assert.equal(config.d1_databases[0].database_id, "test-existing-id");
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("a failed migration stops the deployment before a new Worker is published", async () => {
  const root = await fixture(true, true);
  try {
    const result = spawnSync(process.execPath, [deploy], { cwd: root, encoding: "utf8" }); assert.equal(result.status, 7);
    assert.equal((await calls(root)).some((args) => args[0] === "deploy"), false);
  } finally { await rm(root, { recursive: true, force: true }); }
});
