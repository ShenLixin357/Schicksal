import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { after, test } from "node:test";

const password = crypto.randomUUID();
const env = { SCHICKSAL_MEMBER_PASSWORDS: JSON.stringify({ amberina: password, zxy: password }) };
globalThis.__insaniquariumTestEnv = env;
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === "cloudflare:workers") return { url: "data:text/javascript,export const env=globalThis.__insaniquariumTestEnv", shortCircuit: true };
  if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return next(`${specifier}.ts`, context);
  return next(specifier, context);
} });
const sessions = await import("../app/api/member-session/route.ts");
const route = await import("../app/api/insaniquarium-save/route.ts");
hooks.deregister();
after(() => { delete globalThis.__insaniquariumTestEnv; });

function setup() {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of readdirSync(new URL("../drizzle", import.meta.url)).filter(x => x.endsWith(".sql")).sort())
    sqlite.exec(readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8"));
  env.DB = { async batch(statements) { return Promise.all(statements.map(s => s.run())); }, prepare(sql) { const s = sqlite.prepare(sql); let args = []; return {
    bind(...values) { args = values; return this; },
    async first() { return s.get(...args) ?? null; },
    async run() { return { meta: { changes: Number(s.run(...args).changes) } }; },
  }; } };
  return sqlite;
}
function req(method, cookie, member = "amberina", body, origin = "https://schicksal.test") {
  return new Request("https://schicksal.test/api/insaniquarium-save", { method,
    headers: { origin, ...(cookie ? { cookie } : {}), "x-schicksal-member": member, "content-type": "application/json" },
    ...(body !== undefined ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}),
  });
}
async function login(member = "amberina") {
  const response = await sessions.POST(new Request("https://schicksal.test/api/member-session", {
    method: "POST", headers: { origin: "https://schicksal.test", "content-type": "application/json" },
    body: JSON.stringify({ citizenId: member, password }),
  }));
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie").split(";")[0];
}
const state = () => ({ version: 1, format: "winfish-1.1", files: [
  { path: "userdata/users.dat", data: btoa("\x00\x01\xfforiginal profile bytes") },
  { path: "userdata/adventure1.dat", data: btoa("level progress") },
] });

test("original save API preserves exact bytes and isolates authenticated members", async () => {
  const db = setup();
  try {
    assert.equal((await route.GET(req("GET", undefined))).status, 401);
    const cookie = await login();
    assert.equal((await route.PUT(req("PUT", cookie, "zxy", { revision: 0, state: state() }))).status, 409);
    const saved = state();
    assert.equal((await route.PUT(req("PUT", cookie, "amberina", { revision: 0, state: saved, citizenId: "zxy" }))).status, 200);
    const response = await route.GET(req("GET", cookie));
    const cloud = await response.json();
    assert.equal(cloud.revision, 1);
    assert.deepEqual(cloud.state, saved);
    assert.match(response.headers.get("cache-control"), /no-store/);
    const other = await login("zxy");
    assert.deepEqual(await (await route.GET(req("GET", other, "zxy"))).json(), { state: null, revision: 0 });
  } finally { db.close(); }
});

test("compare-and-swap rejects stale creates, stale updates and invented revisions", async () => {
  const db = setup();
  try {
    const cookie = await login();
    assert.equal((await route.PUT(req("PUT", cookie, "amberina", { revision: 8, state: state() }))).status, 409);
    for (const [revision, expected] of [[0, 200], [0, 409], [1, 200], [1, 409], [2, 200]])
      assert.equal((await route.PUT(req("PUT", cookie, "amberina", { revision, state: state() }))).status, expected);
    const cloud = await (await route.GET(req("GET", cookie))).json();
    assert.equal(cloud.revision, 3);
    assert.deepEqual(cloud.state, state());
  } finally { db.close(); }
});

test("malformed and oversized archives cannot write outside the save folder", async () => {
  const db = setup();
  try {
    const cookie = await login();
    for (const path of ["../properties/resources.xml", "/userdata/users.dat", "userdata/../users.dat", "userdata\\users.dat", "userdata/a.js", "userdata//users.dat"]) {
      const bad = state(); bad.files[0].path = path;
      assert.equal((await route.PUT(req("PUT", cookie, "amberina", { revision: 0, state: bad }))).status, 400, path);
    }
    for (const data of ["not base64", "YQ=", "YR=="]) {
      const bad = state(); bad.files[0].data = data;
      assert.equal((await route.PUT(req("PUT", cookie, "amberina", { revision: 0, state: bad }))).status, 400);
    }
    const duplicate = state(); duplicate.files.push({ ...duplicate.files[0] });
    assert.equal((await route.PUT(req("PUT", cookie, "amberina", { revision: 0, state: duplicate }))).status, 400);
    for (const body of ["null", "{", "[]", { revision: -1, state: state() }, { revision: 0, state: { coins: 10, fish: [] } }])
      assert.equal((await route.PUT(req("PUT", cookie, "amberina", body))).status, 400);
    assert.equal((await route.PUT(req("PUT", cookie, "amberina", " ".repeat(800_001)))).status, 413);
    assert.equal((await route.PUT(req("PUT", cookie, "amberina", { revision: 0, state: state() }, "https://other.test"))).status, 403);
  } finally { db.close(); }
});
