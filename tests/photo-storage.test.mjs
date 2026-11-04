import assert from "node:assert/strict";
import test from "node:test";
import { getPhotoStorage, PhotoStorageError } from "../app/photo-storage.ts";

const config = { SUPABASE_URL: "https://project.supabase.co", SUPABASE_SECRET_KEY: "sb_secret_test_only" };
const photo = "family-archive/photo.png";
const ok = () => Response.json({});

test("missing or partially configured storage fails before any external request", () => {
  const neverFetch = () => { throw new Error("unexpected request"); };
  for (const value of [{}, { SUPABASE_URL: config.SUPABASE_URL }, { SUPABASE_SECRET_KEY: config.SUPABASE_SECRET_KEY }]) {
    assert.throws(() => getPhotoStorage(value, neverFetch), (error) => error instanceof PhotoStorageError && error.status === 503);
  }
});

test("private upload preserves original bytes, MIME type and object key without overwriting", async () => {
  let call;
  const storage = getPhotoStorage(config, async (url, init) => { call = { url, init }; return ok(); });
  await storage.put(photo, new Uint8Array([0, 128, 255]), "image/png", "original.png");
  assert.equal(call.url, "https://project.supabase.co/storage/v1/object/schicksal-photos/family-archive/photo.png");
  assert.equal(call.init.method, "POST");
  assert.equal(call.init.headers.get("apikey"), config.SUPABASE_SECRET_KEY);
  assert.equal(call.init.headers.has("Authorization"), false);
  assert.equal(call.init.headers.get("Content-Type"), "image/png");
  assert.equal(call.init.headers.get("x-upsert"), "false");
  assert.deepEqual([...new Uint8Array(call.init.body)], [0, 128, 255]);
  assert.equal(call.init.redirect, "error");
  assert.equal(call.url.includes(config.SUPABASE_SECRET_KEY), false);
});

test("downloads use the authenticated endpoint and stream photo bytes", async () => {
  const storage = getPhotoStorage(config, async (url, init) => {
    assert.match(url, /\/object\/authenticated\/schicksal-photos\/family-archive\/photo.png$/);
    assert.equal(init.headers.get("apikey"), config.SUPABASE_SECRET_KEY);
    return new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "image/png" } });
  });
  const object = await storage.get(photo);
  assert.equal(object.contentType, "image/png");
  assert.deepEqual([...new Uint8Array(await new Response(object.body).arrayBuffer())], [1, 2, 3]);
});

test("deleting a photo addresses only its original private object key", async () => {
  const storage = getPhotoStorage(config, async (url, init) => {
    assert.equal(url, "https://project.supabase.co/storage/v1/object/schicksal-photos");
    assert.equal(init.method, "DELETE");
    assert.deepEqual(JSON.parse(init.body), { prefixes: [photo] });
    return ok();
  });
  await storage.delete(photo);
});

test("missing photos are recognised in both Storage error formats", async () => {
  for (const response of [new Response(null, { status: 404 }), Response.json({ statusCode: "404", error: "not_found" }, { status: 400 })]) {
    assert.equal(await getPhotoStorage(config, async () => response).get(photo), null);
  }
  await getPhotoStorage(config, async () => new Response(null, { status: 404 })).delete(photo);
  await getPhotoStorage(config, async () => Response.json({ statusCode: "404" }, { status: 400 })).delete(photo);
});

test("provider failures and network errors cannot echo secret values to visitors", async () => {
  const storage = getPhotoStorage(config, async () => new Response(config.SUPABASE_SECRET_KEY, { status: 403 }));
  await assert.rejects(storage.get(photo), (error) => error.status === 502 && !error.message.includes(config.SUPABASE_SECRET_KEY));
  const unavailable = getPhotoStorage(config, async () => { throw new Error(config.SUPABASE_SECRET_KEY); });
  await assert.rejects(unavailable.get(photo), (error) => error.status === 502 && !error.message.includes(config.SUPABASE_SECRET_KEY));
});

test("storage credentials are never sent over HTTP or accepted from a public key", () => {
  for (const value of [
    { ...config, SUPABASE_URL: "http://project.supabase.co" },
    { ...config, SUPABASE_URL: "https://project.supabase.co/with-path" },
    { ...config, SUPABASE_SECRET_KEY: "sb_publishable_test_only" },
  ]) assert.throws(() => getPhotoStorage(value), PhotoStorageError);
});

test("object paths are encoded segment by segment and traversal is rejected", async () => {
  const storage = getPhotoStorage(config, async (url) => {
    assert.match(url, /family-archive\/a%20b%3F.png$/);
    return ok();
  });
  await storage.put("family-archive/a b?.png", new Uint8Array([1]), "image/png", "a b?.png");
  for (const path of ["../outside.png", "family-archive/../outside.png", "/outside.png"]) {
    await assert.rejects(storage.get(path), PhotoStorageError);
    await assert.rejects(storage.delete(path), PhotoStorageError);
  }
});

test("existing native Sites retain their R2 storage while standalone defaults need no R2", async () => {
  const calls = [];
  const bucket = {
    async put(...args) { calls.push(["put", ...args]); },
    async get(path) { calls.push(["get", path]); return { body: "image", httpMetadata: { contentType: "image/png" } }; },
    async delete(path) { calls.push(["delete", path]); },
  };
  const storage = getPhotoStorage({ BUCKET: bucket });
  await storage.put(photo, new Uint8Array([1]), "image/png", "original.png");
  assert.equal((await storage.get(photo)).contentType, "image/png");
  await storage.delete(photo);
  assert.deepEqual(calls.map(([method]) => method), ["put", "get", "delete"]);
  assert.throws(() => getPhotoStorage({ BUCKET: bucket, SUPABASE_URL: config.SUPABASE_URL }), PhotoStorageError);
});
