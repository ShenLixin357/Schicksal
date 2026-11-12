import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { zipSync, strToU8 } from "../public/games/insaniquarium/vendor/fflate.mjs";
import { loadHostedAssets, sha256 } from "../public/games/insaniquarium/hosted-assets.mjs";

const source = { "properties/resources.xml": strToU8("<ResourceManifest/>"), "images/fish.gif": new Uint8Array([0, 127, 255]), "sounds/buttonclick.au": new Uint8Array([46, 115, 110, 100]) };
async function fixture() {
  const bytes = zipSync(source), hash = await sha256(bytes), split = Math.floor(bytes.length / 2);
  const parts = [bytes.slice(0, split), bytes.slice(split)];
  const manifest = { version: 1, sha256: hash, bytes: bytes.length, files: 3, uncompressedBytes: Object.values(source).reduce((n, b) => n + b.length, 0), parts: parts.map((p, i) => ({ file: `resources-${hash.slice(0, 16)}-${i}.bin`, bytes: p.length })) };
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ path: new URL(url).pathname.split("/").at(-1), options });
    const name = calls.at(-1).path;
    if (name === "manifest.json") return Response.json(manifest);
    const index = manifest.parts.findIndex(p => p.file === name);
    assert.notEqual(index, -1);
    return new Response(parts[index], { headers: { "content-type": "application/octet-stream" } });
  };
  return { bytes, parts, manifest, calls, fetcher };
}

test("two empty device caches each load the original resources from the website without a local file", async () => {
  const f = await fixture();
  for (let device = 0; device < 2; device++) {
    const files = await loadHostedAssets({ fetcher: f.fetcher });
    assert.equal(files.length, 3);
    for (const file of files) assert.deepEqual(file.bytes, source[file.path]);
  }
  assert.equal(f.calls.length, 6);
  assert.ok(f.calls.every(c => c.options.credentials === "same-origin"));
});

test("matching cache avoids downloads and a damaged cache is replaced from the website", async () => {
  const f = await fixture(), cache = new Map();
  const options = { fetcher: f.fetcher, readCache: hash => cache.get(hash), writeCache: (hash, bytes) => cache.set(hash, bytes) };
  await loadHostedAssets(options); assert.equal(f.calls.length, 3);
  await loadHostedAssets(options); assert.equal(f.calls.length, 4);
  cache.get(f.manifest.sha256)[0] ^= 1;
  await loadHostedAssets(options); assert.equal(f.calls.length, 7);
  assert.equal(await sha256(cache.get(f.manifest.sha256)), f.manifest.sha256);
});

test("disabled browser storage still allows an online game to start", async () => {
  const f = await fixture(), unavailable = () => { throw Error("storage disabled"); };
  assert.equal((await loadHostedAssets({ fetcher: f.fetcher, readCache: unavailable, writeCache: unavailable })).length, 3);
});

test("default resource fetch retains the browser receiver", async () => {
  const f = await fixture(), original = globalThis.fetch;
  globalThis.fetch = function (...args) { assert.equal(this, globalThis); return f.fetcher(...args); };
  try { assert.equal((await loadHostedAssets()).length, 3); }
  finally { globalThis.fetch = original; }
});

test("login walls, unavailable files and incomplete responses cannot become game resources", async () => {
  await assert.rejects(loadHostedAssets({ fetcher: async () => new Response("login", { status: 401 }) }), /登录/);
  await assert.rejects(loadHostedAssets({ fetcher: async () => new Response("<html>login</html>", { headers: { "content-type": "text/html" } }) }), /登录/);
  await assert.rejects(loadHostedAssets({ fetcher: async () => new Response("missing", { status: 404 }) }), /重新加载/);
  const f = await fixture();
  await assert.rejects(loadHostedAssets({ fetcher: async (url, options) => new URL(url).pathname.endsWith("manifest.json") ? f.fetcher(url, options) : new Response(new Uint8Array(1)) }), /未完整/);
});

test("resource metadata cannot redirect a member's download to another site", async () => {
  const f = await fixture(); f.manifest.parts[0].file = "https://outside.invalid/game.bin";
  await assert.rejects(loadHostedAssets({ fetcher: f.fetcher }), /信息/);
  assert.equal(f.calls.length, 1);
});

test("the shipped pack contains all 602 original resources and excludes executable, DRM and save files", async () => {
  const baseURL = new URL("../public/games/insaniquarium/resources/", import.meta.url);
  const files = await loadHostedAssets({ baseURL, fetcher: async url => new Response(await readFile(url), { headers: { "content-type": url.pathname.endsWith(".json") ? "application/json" : "application/octet-stream" } }) });
  assert.equal(files.length, 602);
  assert.equal(files.filter(f => f.path.toLowerCase().endsWith(".au")).length, 15);
  assert.ok(files.some(f => f.path === "properties/resources.xml"));
  assert.ok(files.every(f => !/(^|\/)(drm|userdata|saves)\//i.test(f.path) && !/\.(exe|dll|scr|luc)$/i.test(f.path)));
});
