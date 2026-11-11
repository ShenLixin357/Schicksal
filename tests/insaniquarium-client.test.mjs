import assert from "node:assert/strict";
import { test } from "node:test";
import { CloudSave } from "../public/games/insaniquarium/cloud-save.mjs";
import { assetPath, prepareAssets, validateSave, encodeBytes, decodeBytes } from "../public/games/insaniquarium/file-bridge.mjs";

function memory() { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) }; }
const state = n => ({ version: 1, format: "winfish-1.1", files: [{ path: "userdata/adventure1.dat", data: btoa(`progress-${n}`) }] });
const ok = data => Response.json(data);

test("in-flight saves serialize newer progress against the acknowledged revision", async () => {
  const storage = memory(), calls = []; let release;
  const client = new CloudSave("amberina", { storage, fetcher: async (_, options) => {
    if (options.method === "GET") return ok({ state: null, revision: 0 });
    const body = JSON.parse(options.body); calls.push(body);
    if (body.revision === 0) await new Promise(resolve => { release = resolve; });
    return ok({ revision: body.revision + 1 });
  } });
  await client.load();
  const first = client.save(state(1));
  void client.save(state(2));
  release(); await first;
  assert.deepEqual(calls.map(c => c.revision), [0, 1]);
  assert.deepEqual(calls[1].state, state(2));
  assert.equal(client.readBackup().dirty, false);
  assert.equal(client.revision, 2);
});

test("offline progress survives reload and retries only against its original base", async () => {
  const storage = memory();
  const first = new CloudSave("amberina", { storage, fetcher: async (_, options) => {
    if (options.method === "GET") return ok({ state: state(0), revision: 3 });
    throw new Error("offline");
  } });
  await first.load(); await first.save(state(1));
  assert.equal(first.readBackup().dirty, true);
  const calls = [];
  const second = new CloudSave("amberina", { storage, fetcher: async (_, options) => {
    if (options.method === "GET") return ok({ state: state(0), revision: 3 });
    calls.push(JSON.parse(options.body)); return ok({ revision: 4 });
  } });
  assert.deepEqual(await second.load(), state(1));
  await second.flush();
  assert.equal(calls[0].revision, 3);
  assert.equal(second.readBackup().dirty, false);
});

test("a changed cloud revision preserves the local backup and stops all automatic writes", async () => {
  const storage = memory(); let writes = 0;
  storage.setItem("schicksal:insaniquarium:amberina:v1", JSON.stringify({ baseRevision: 2, dirty: true, state: state(2) }));
  const client = new CloudSave("amberina", { storage, fetcher: async (_, options) => {
    if (options.method === "GET") return ok({ state: state(4), revision: 4 });
    writes++; return ok({ revision: 5 });
  } });
  assert.equal(await client.load(), null);
  assert.equal(client.conflict, true);
  await client.flush();
  assert.equal(writes, 0);
  assert.deepEqual(client.readBackup().state, state(2));
  assert.equal(new CloudSave("zxy", { storage }).readBackup(), null);
});

test("server conflicts and expired identities cannot become silent overwrites", async () => {
  for (const [code, body, field] of [[409, { conflict: true, error: "updated elsewhere" }, "conflict"], [401, { error: "expired" }, "locked"]]) {
    let writes = 0;
    const client = new CloudSave("amberina", { storage: memory(), fetcher: async (_, options) => {
      if (options.method === "GET") return ok({ state: null, revision: 0 });
      writes++; return Response.json(body, { status: code });
    } });
    await client.load(); await client.save(state(1)); await client.flush();
    assert.equal(client[field], true); assert.equal(writes, 1);
    assert.equal(client.readBackup().dirty, true);
  }
});

test("quota failures never claim that unsent progress was saved locally", async () => {
  const statuses = [];
  const client = new CloudSave("amberina", { storage: { getItem: () => null, setItem() { throw new Error("quota"); } },
    onStatus: (_, message) => statuses.push(message), fetcher: async () => { throw new Error("offline"); } });
  await client.save(state(1));
  assert.match(statuses.at(-1), /均未成功/);
});

test("original file bytes survive encoding; folder imports exclude executable and save files", async () => {
  const bytes = Uint8Array.from({ length: 10000 }, (_, i) => i % 256);
  assert.deepEqual(decodeBytes(encodeBytes(bytes)), bytes);
  assert.equal(validateSave(state(1)), true);
  assert.equal(assetPath("Insaniquarium/properties/resources.xml"), "properties/resources.xml");
  for (const path of ["game/Insaniquarium.exe", "game/userdata/users.dat", "game/images/exploit.js", "../images/fish.png"])
    assert.equal(assetPath(path), null);
  const file = path => ({ webkitRelativePath: path, size: 3, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer });
  const assets = await prepareAssets([file("game/properties/resources.xml"), file("game/images/Fish.gif"), file("game/userdata/users.dat")]);
  assert.equal(assets.length, 2);
  await assert.rejects(prepareAssets([file("game/images/fish.gif")]), /resources.xml/);
});
