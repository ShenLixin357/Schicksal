import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { after, test } from "node:test";

const password = crypto.randomUUID();
const env = { SCHICKSAL_MEMBER_PASSWORDS: JSON.stringify({ amberina: password, zxy: password, truth: password }) };
globalThis.__schicksalMessengerTestEnv = env;
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "cloudflare:workers") {
    return { url: "data:text/javascript,export const env=globalThis.__schicksalMessengerTestEnv;", shortCircuit: true };
  }
  if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(specifier + ".ts", context);
  return nextResolve(specifier, context);
} });
const sessions = await import("../app/api/member-session/route.ts");
const messenger = await import("../app/api/messenger/route.ts");
const policy = await import("../app/messenger/message-policy.ts");
hooks.deregister();
after(() => { delete globalThis.__schicksalMessengerTestEnv; });

function setup() {
  const sqlite = new DatabaseSync(":memory:");
  for (const name of readdirSync(new URL("../drizzle", import.meta.url)).filter(name => name.endsWith(".sql")).sort())
    sqlite.exec(readFileSync(new URL("../drizzle/" + name, import.meta.url), "utf8"));
  function prepare(sql) {
    const statement = sqlite.prepare(sql);
    let args = [];
    return {
      bind(...params) { args = params; return this; },
      async first() { return statement.get(...args) ?? null; },
      async all() { return { results: statement.all(...args) }; },
      async run() { const result = statement.run(...args); return { meta: { changes: Number(result.changes) } }; },
    };
  }
  env.DB = { prepare, async batch(statements) { return Promise.all(statements.map(statement => statement.run())); } };
  return sqlite;
}

const origin = "https://test.schicksal.invalid";
function get(path, cookie) {
  return new Request(origin + path, { headers: cookie ? { cookie } : {} });
}
function post(cookie, payload, extraHeaders = {}) {
  return new Request(origin + "/api/messenger", {
    method: "POST",
    headers: { origin, cookie: cookie || "", "content-type": "application/json", ...extraHeaders },
    body: JSON.stringify(payload),
  });
}
async function login(citizenId) {
  const response = await sessions.POST(new Request(origin + "/api/member-session", {
    method: "POST", headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ citizenId, password }),
  }));
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie").split(";")[0];
}

test("member and message policies reject unknown identities and malformed texts", () => {
  assert.equal(policy.validPeer("amberina"), true);
  assert.equal(policy.validPeer("sealed-6"), false);
  assert.equal(policy.validPeer("forged"), false);
  assert.equal(policy.validateMessageBody("  hello  "), "hello");
  assert.equal(policy.validateMessageBody("   "), null);
  assert.equal(policy.validateMessageBody("x".repeat(501)), null);
  assert.equal(policy.conversationPartner("zxy", { senderId: "amberina", recipientId: "truth" }), null);
  assert.equal(policy.conversationPartner("amberina", { senderId: "amberina", recipientId: "truth" }), "truth");
});

test("real authenticated messenger keeps self notes and direct messages isolated", async () => {
  const sqlite = setup();
  try {
    assert.equal((await messenger.GET(get("/api/messenger?list=1"))).status, 401);
    assert.equal((await messenger.POST(post(null, { peer: "zxy", body: "forgery" }))).status, 401);
    const amber = await login("amberina");
    const zxy = await login("zxy");
    const truth = await login("truth");

    assert.equal((await messenger.POST(post(amber, { peer: "sealed-6", body: "Hello" }))).status, 400);
    assert.equal((await messenger.POST(post(amber, { peer: "zxy", body: " " }))).status, 400);
    assert.equal((await messenger.POST(post(amber, { peer: "zxy", body: "x".repeat(501) }))).status, 400);
    assert.equal((await messenger.POST(post(amber, { peer: "zxy", body: "hi" }, { origin: "https://attacker.invalid" }))).status, 403);
    assert.equal((await messenger.GET(get("/api/messenger?peer=sealed-6", amber))).status, 400);

    const aToZ = await messenger.POST(post(amber, { peer: "zxy", body: "Private A to Z" }));
    assert.equal(aToZ.status, 201);
    assert.equal((await aToZ.json()).message.senderId, "amberina");
    assert.equal((await messenger.POST(post(zxy, { peer: "amberina", body: "Reply from Z" }))).status, 201);
    assert.equal((await messenger.POST(post(amber, { peer: "amberina", body: "Note only for myself" }))).status, 201);

    const amberAndZ = await (await messenger.GET(get("/api/messenger?peer=zxy", amber))).json();
    assert.deepEqual(amberAndZ.messages.map(message => message.body), ["Private A to Z", "Reply from Z"]);
    const zAndAmber = await (await messenger.GET(get("/api/messenger?peer=amberina", zxy))).json();
    assert.deepEqual(zAndAmber.messages.map(message => message.body), ["Private A to Z", "Reply from Z"]);
    const notes = await (await messenger.GET(get("/api/messenger?peer=amberina", amber))).json();
    assert.deepEqual(notes.messages.map(message => message.body), ["Note only for myself"]);

    const truthIndex = await (await messenger.GET(get("/api/messenger?list=1", truth))).json();
    assert.deepEqual(truthIndex.recent, {});
    const truthWithAmber = await (await messenger.GET(get("/api/messenger?peer=amberina", truth))).json();
    assert.deepEqual(truthWithAmber.messages, [], "a third citizen cannot read their private messages");
    const zxyIndex = await (await messenger.GET(get("/api/messenger?list=1", zxy))).json();
    assert.ok(zxyIndex.recent.amberina);
    assert.equal(zxyIndex.recent.zxy, undefined);
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM member_direct_messages").get().n, 3);
  } finally { sqlite.close(); }
});

test("member badge gesture contracts and standalone navigation remain discoverable", () => {
  const src = path => readFileSync(new URL(path, import.meta.url), "utf8");
  const badge = src("../app/briefing/sidebar-presence.tsx");
  const page = src("../app/page.tsx");
  assert.match(badge, /}, 600\);/);
  assert.match(badge, /suppressClick.current = true/);
  assert.match(badge, /onOpenIndex\(\)/);
  assert.match(page, /\{ id: "messenger", label: "帝国通讯"/);
  assert.match(page, /onMember=\{\(memberId\) => openMessenger\(memberId\)\}/);
  assert.match(page, /onOpenIndex=\{\(\) => openMessenger\(null\)\}/);
  assert.doesNotMatch(page, /className="side-user"/);
});
