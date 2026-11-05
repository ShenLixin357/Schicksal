import { spawnSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const wrangler = resolve("node_modules/wrangler/bin/wrangler.js");
const config = resolve("dist/server/wrangler.json");
await access(config);
const settings = JSON.parse(await readFile(config, "utf8"));
function run(args, json = false) {
  const result = spawnSync(process.execPath, [wrangler, ...args, "--config", config], { stdio: json ? ["ignore", "pipe", "inherit"] : "inherit", encoding: "utf8", env: { ...process.env, CI: "true" } });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  return json ? JSON.parse(result.stdout) : null;
}
for (const binding of settings.d1_databases || []) {
  binding.migrations_dir = resolve("drizzle");
  if (!binding.database_id) {
    const name = binding.database_name || `${settings.name}-${binding.binding.toLowerCase()}`;
    let databases = run(["d1", "list", "--json"], true);
    if (!Array.isArray(databases)) throw new Error("Unexpected Cloudflare database list response");
    let database = databases.find((entry) => entry.name === name);
    if (!database) {
      run(["d1", "create", name, "--no-update-config"]);
      databases = run(["d1", "list", "--json"], true);
      database = databases.find((entry) => entry.name === name);
    }
    if (!database?.uuid) throw new Error("The new D1 database could not be resolved");
    binding.database_name = name;
    binding.database_id = database.uuid;
  }
}
await writeFile(config, JSON.stringify(settings, null, 2));
// The binding name is stable even when Cloudflare generates resource IDs.
// Schema migrations run before the new Worker becomes active.
run(["d1", "migrations", "apply", "DB", "--remote"]);
run(["deploy"]);
