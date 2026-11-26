import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deploymentBinding } from "./binding.mjs";
/** Also protects dashboards that still invoke `npx wrangler deploy` directly. */
export async function lockBuiltBinding(path, environment = process.env) {
    const settings = JSON.parse(await readFile(path, "utf8"));
    const binding = deploymentBinding(settings, environment);
    settings.account_id = binding.accountId;
    settings.d1_databases[0].database_id = binding.databaseId;
    await writeFile(path, JSON.stringify(settings, null, 2));
    return binding;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await lockBuiltBinding(resolve(process.env.SCHICKSAL_DEPLOY_CONFIG || "dist/server/wrangler.json"));
    console.log("Built Worker pinned to the explicitly configured existing account and DB; nothing deployed.");
}
