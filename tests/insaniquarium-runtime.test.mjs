import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import createGame from "../public/games/insaniquarium/engine/insaniquarium.mjs";
import { collectSave, restoreSave, installAssets } from "../public/games/insaniquarium/file-bridge.mjs";

test("compiled original-engine runtime instantiates and preserves bytes through its real filesystem", async () => {
  const engine = await createGame({ noInitialRun: true,
    wasmBinary: readFileSync(new URL("../public/games/insaniquarium/engine/insaniquarium.wasm", import.meta.url)),
    print: () => {}, printErr: () => {},
  });
  engine.FS.mkdirTree("/saves/userdata");
  const bytes = Uint8Array.from([0, 1, 2, 127, 128, 254, 255]);
  engine.FS.writeFile("/saves/userdata/users.dat", bytes);
  const bundle = collectSave(engine.FS);
  engine.FS.unlink("/saves/userdata/users.dat");
  restoreSave(engine.FS, bundle);
  assert.deepEqual(engine.FS.readFile("/saves/userdata/users.dat"), bytes);
  assert.equal(typeof engine._schicksal_request_save, "function");
  installAssets(engine.FS, [{ path: "images/Fish.gif", bytes }]);
  assert.deepEqual(engine.FS.readFile("/images/fish.gif"), bytes);
  // Deliberately do not call main(): gameplay requires the player's retail art.
});
