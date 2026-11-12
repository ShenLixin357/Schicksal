import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
const root = new URL("../../", import.meta.url);
try {
  const manifest = JSON.parse(readFileSync(new URL("public/games/insaniquarium/engine/build.json", root), "utf8"));
  const lock = JSON.parse(readFileSync(new URL("ports/insaniquarium/upstream.lock.json", root), "utf8"));
  if (manifest.commit !== lock.commit || manifest.emscripten !== lock.emscripten) throw new Error("Engine provenance differs from the pinned source.");
  const adapters = new URL("ports/insaniquarium/", root), digest = createHash("sha256");
  for (const entry of readdirSync(adapters, { withFileTypes: true }).filter(f => f.isFile()).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
    digest.update(entry.name).update("\0").update(readFileSync(new URL(entry.name, adapters))).update("\0");
  }
  if (digest.digest("hex") !== manifest.adapterSha256) throw new Error("Engine adapters changed; rebuild the native runtime.");
  for (const name of ["insaniquarium.mjs", "insaniquarium.wasm"]) {
    const bytes = readFileSync(new URL(`public/games/insaniquarium/engine/${name}`, root));
    if (createHash("sha256").update(bytes).digest("hex") !== manifest.sha256[name]) throw new Error(`Engine checksum mismatch: ${name}`);
  }
  const source = readFileSync(new URL("public/games/insaniquarium/source/insaniquarium-source.tar.gz", root));
  if (createHash("sha256").update(source).digest("hex") !== manifest.sourceBundle?.sha256) throw new Error("Matching engine source archive is missing or differs.");
  console.log("[insaniquarium] matching original-engine runtime verified");
} catch (error) {
  console.error(`[insaniquarium] ${error.message}\nRun npm run game:build-native before building the website.`);
  process.exitCode = 1;
}

