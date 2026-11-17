import { mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";

// Types come from the pinned local Worker config; no remote account/DB access.
await mkdir("types", { recursive: true });
for (const args of [
  ["node_modules/wrangler/bin/wrangler.js", "types", "types/worker-configuration.d.ts", "--env-interface", "CloudflareBindings"],
  ["node_modules/typescript/bin/tsc", "--noEmit", "--incremental", "false"],
]) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
