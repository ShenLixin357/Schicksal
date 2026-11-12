import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { installImportedGames } from "../scripts/ice-fire/install-import.mjs";

test("rebuilding Fireboy and Watergirl preserves unrelated aquarium files", async () => {
  const root = await mkdtemp(join(tmpdir(), "schicksal-import-test-"));
  try {
    await mkdir(join(root, "games/insaniquarium/engine"), { recursive: true });
    await mkdir(join(root, "games/1-forest-temple"), { recursive: true });
    await mkdir(join(root, "staged/1-forest-temple"), { recursive: true });
    await writeFile(join(root, "games/insaniquarium/engine/engine.wasm"), "aquarium runtime");
    await writeFile(join(root, "games/1-forest-temple/index.html"), "old");
    await writeFile(join(root, "staged/1-forest-temple/index.html"), "new");
    await installImportedGames(join(root, "staged"), join(root, "games"), join(root, "backup"));
    assert.equal(await readFile(join(root, "games/insaniquarium/engine/engine.wasm"), "utf8"), "aquarium runtime");
    assert.equal(await readFile(join(root, "games/1-forest-temple/index.html"), "utf8"), "new");
  } finally { await rm(root, { recursive: true, force: true }); }
});
