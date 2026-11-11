import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const root = new URL("../../", import.meta.url);
try {
  const manifest = JSON.parse(readFileSync(new URL("public/games/insaniquarium/engine/build.json", root), "utf8"));
  const lock = JSON.parse(readFileSync(new URL("ports/insaniquarium/upstream.lock.json", root), "utf8"));
  if (manifest.commit !== lock.commit || manifest.emscripten !== lock.emscripten) throw new Error("Engine provenance differs from the pinned source.");
  for (const name of ["insaniquarium.mjs", "insaniquarium.wasm"]) {
    const bytes = readFileSync(new URL(`public/games/insaniquarium/engine/${name}`, root));
    if (createHash("sha256").update(bytes).digest("hex") !== manifest.sha256[name]) throw new Error(`Engine checksum mismatch: ${name}`);
  }
  console.log("[insaniquarium] matching original-engine runtime verified");
} catch (error) {
  console.error(`[insaniquarium] ${error.message}\nRun npm run game:build-native before building the website.`);
  process.exitCode = 1;
}
