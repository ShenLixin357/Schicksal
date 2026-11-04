#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${SITES_ENV_READY:-}" != "1" ]]; then
  exec "${script_dir}/sites-env.sh" -- "$0" "$@"
fi

worker="${SITES_PROJECT_ROOT}/dist/server/index.js"
hosting="${SITES_PROJECT_ROOT}/dist/server/wrangler.json"

[[ -f "${worker}" ]] || {
  echo "Missing Cloudflare Worker entry: dist/server/index.js" >&2
  exit 66
}
[[ -f "${hosting}" ]] || {
  echo "Missing generated Cloudflare configuration: dist/server/wrangler.json" >&2
  exit 66
}

node --input-type=module - "${worker}" "${hosting}" <<'NODE'
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const [workerPath, hostingPath] = process.argv.slice(2);
JSON.parse(await readFile(hostingPath, "utf8"));

const workerSource = await readFile(workerPath, "utf8");

// D1/R2-enabled builds intentionally retain Cloudflare's runtime-only
// `cloudflare:workers` module. Node cannot resolve that scheme, so validate
// the emitted worker shape statically in this case; the deployed Worker
// runtime performs the real module linking.
if (workerSource.includes('cloudflare:workers')) {
  if (!/export\s*\{[^}]*\bdefault\b[^}]*\}/s.test(workerSource) &&
      !/export\s+default\s+/s.test(workerSource)) {
    throw new Error("dist/server/index.js must expose a default Worker export");
  }
  process.exit(0);
}

const workerUrl = pathToFileURL(workerPath);
workerUrl.searchParams.set("sites-validation", `${process.pid}-${Date.now()}`);
const worker = await import(workerUrl.href);
if (!worker.default || typeof worker.default.fetch !== "function") {
  throw new Error("dist/server/index.js must have an ESM default export with fetch(request, env, ctx)");
}
NODE

echo "Validated Cloudflare artifact: Worker default.fetch and Wrangler configuration are present."
