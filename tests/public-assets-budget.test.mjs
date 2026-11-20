import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the read-only asset audit includes all public payloads and hashes in bounded memory", () => {
  const root = new URL("../", import.meta.url);
  const script = readFileSync(new URL("../scripts/architecture/audit-assets.mjs", import.meta.url), "utf8");
  assert.match(script, /readSync\(fd, buffer/);
  assert.match(script, /Buffer\.allocUnsafe\(256 \* 1024\)/);
  assert.doesNotMatch(script, /unlinkSync|rmSync|writeFileSync|renameSync/);
  const result = spawnSync(process.execPath, ["scripts/architecture/audit-assets.mjs", "--json"], {
    cwd: root, encoding: "utf8", timeout: 25000, maxBuffer: 8 * 1024 * 1024,
  });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.ok(report.publicFiles > 0 && report.publicBytes > 0);
  assert.ok(report.publicBytes <= report.totalBytes);
  assert.ok(Array.isArray(report.largePublicAssets));
  assert.ok(report.byExtension[".wasm"]?.bytes > 0, "WASM payloads must be inventoried");
  assert.ok(report.byExtension[".bin"]?.bytes > 0, "game binary payloads must be inventoried");
  assert.ok(report.byExtension[".gz"]?.bytes > 0, "archive/source packages must be inventoried");
  assert.ok(report.largest.some(x => x.name.includes("insaniquarium-source.tar.gz")));
  assert.ok(report.identicalDuplicateGroups.every(group => group.length > 1));
});
