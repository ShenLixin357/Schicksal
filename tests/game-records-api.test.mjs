import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { after, test } from "node:test";

// Exercise the real route handlers against an isolated D1-compatible database.
// Credentials are generated for this test process; no real member account is used.
const testPassword = crypto.randomUUID();
const env = { SCHICKSAL_MEMBER_PASSWORDS: JSON.stringify({ amberina: testPassword, zxy: testPassword, truth: testPassword }) };
globalThis.__schicksalRecordsTestEnv = env;
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "cloudflare:workers") return { url: "data:text/javascript,export const env = globalThis.__schicksalRecordsTestEnv;", shortCircuit: true };
  if (specifier.endsWith(".css?inline")) return nextResolve(specifier, context);
  if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });
const sessions = await import("../app/api/member-session/route.ts");
const records = await import("../app/api/lounge-games/route.ts");
const aquarium = await import("../app/api/aquarium-save/route.ts");
hooks.deregister();
after(() => { delete globalThis.__schicksalRecordsTestEnv; });

function setup() {
  const sqlite = new DatabaseSync(":memory:");
  for (const name of readdirSync(new URL("../drizzle", import.meta.url)).filter((file) => file.endsWith(".sql")).sort()) sqlite.exec(readFileSync(new URL(`../drizzle/${name}`, import.meta.url), "utf8"));
  function prepare(sql) {
    const statement = sqlite.prepare(sql); let values = [];
    return { bind(...parameters) { values = parameters; return this; },
      async first() { return statement.get(...values) ?? null; },
      async all() { return { results: statement.all(...values) }; },
      async run() { const result = statement.run(...values); return { meta: { changes: Number(result.changes) } }; },
    };
  }
  env.DB = { prepare, async batch(statements) { return Promise.all(statements.map((statement) => statement.run())); } };
  return sqlite;
}
function request(path, { method = "GET", cookie, member, body, origin = "https://test.schicksal.invalid" } = {}) {
  return new Request(`https://test.schicksal.invalid${path}`, { method, headers: { origin, ...(cookie ? { cookie } : {}), ...(member ? { "X-Schicksal-Member": member } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) }, ...(body !== undefined ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}) });
}
async function login(member = "amberina") {
  const response = await sessions.POST(request("/api/member-session", { method: "POST", body: { citizenId: member, password: testPassword } }));
  assert.equal(response.status, 200); const cookie = response.headers.get("set-cookie"); assert.ok(cookie); return cookie.split(";")[0];
}
function submission(score = 80) { return { gameId: "merge-game", runId: crypto.randomUUID(), durationMs: 60000, effortMoves: 0, snapshot: { version: 1, score, nextTier: 1, rngSeed: 1, nextId: 4, gameOver: false, bodies: [{ id: 3, tier: 1, x: 180, y: 500, vx: 0, vy: 0, bornAt: 0, popUntil: 0 }] } }; }
const board = "/api/lounge-games?gameId=merge-game&boardId=classic";

test("actual API binds results to the server session, persists a best, and ignores worse retries", async () => {
  const sqlite = setup();
  try {
    assert.equal((await records.GET(request(board, { member: "amberina" }))).status, 401);
    const cookie = await login();
    assert.deepEqual(await (await sessions.GET(request("/api/member-session", { cookie }))).json(), { citizenId: "amberina", accountMode: "citizen" });
    const payload = { ...submission(), citizenId: "zxy", rankPrimary: -999999 };
    let response = await records.POST(request("/api/lounge-games", { method: "POST", cookie, member: "amberina", body: payload }));
    assert.equal(response.status, 200); let result = await response.json();
    assert.equal(result.improved, true); assert.equal(result.personalBest.citizenId, "amberina"); assert.equal(result.personalBest.score, 80);
    response = await records.POST(request("/api/lounge-games", { method: "POST", cookie, member: "amberina", body: submission(40) }));
    result = await response.json(); assert.equal(result.improved, false); assert.equal(result.personalBest.score, 80);
    response = await records.GET(request(board, { cookie, member: "amberina" }));
    const ranking = await response.json(); assert.equal(ranking.rows.length, 1); assert.equal(ranking.rows[0].rank, 1); assert.equal(ranking.personalBest.score, 80);
    assert.equal((await records.POST(request("/api/lounge-games", { method: "POST", cookie, member: "zxy", body: submission(120) }))).status, 409);
    assert.equal((await records.GET(request(board, { cookie, member: "zxy" }))).status, 409);
    const otherCookie = await login("zxy");
    assert.equal((await records.POST(request("/api/lounge-games", { method: "POST", cookie: otherCookie, member: "zxy", body: submission(120) }))).status, 200);
    const otherRanking = await (await records.GET(request(board, { cookie: otherCookie, member: "zxy" }))).json();
    assert.deepEqual(otherRanking.rows.map((row) => row.citizenId), ["zxy", "amberina"]); assert.equal(otherRanking.personalBest.score, 120);
  } finally { sqlite.close(); }
});

test("actual API rejects foreign origins, unfinished and malformed results, and revoked or expired sessions", async () => {
  const sqlite = setup();
  try {
    assert.equal((await sessions.POST(request("/api/member-session", { method: "POST", body: {}, origin: "https://unrelated.invalid" }))).status, 403);
    assert.equal((await sessions.POST(request("/api/member-session", { method: "POST", body: "null" }))).status, 400);
    const cookie = await login();
    assert.equal((await records.POST(request("/api/lounge-games", { method: "POST", cookie, member: "amberina", body: submission(), origin: "https://unrelated.invalid" }))).status, 403);
    for (const body of ["{", "null", "[]", { ...submission(), snapshot: { score: 999999 } }]) assert.equal((await records.POST(request("/api/lounge-games", { method: "POST", cookie, member: "amberina", body }))).status, 400);
    const logout = await sessions.DELETE(request("/api/member-session", { method: "DELETE", cookie }));
    assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
    assert.equal((await records.GET(request(board, { cookie, member: "amberina" }))).status, 401);
    const expired = await login(); sqlite.exec("UPDATE member_sessions SET expires_at=0");
    assert.equal((await records.GET(request(board, { cookie: expired, member: "amberina" }))).status, 401);
  } finally { sqlite.close(); }
});

test("actual login API limits repeated attempts and rejects unknown or locked member IDs", async () => {
  const sqlite = setup();
  try {
    for (let attempt = 0; attempt < 20; attempt++) assert.equal((await sessions.POST(request("/api/member-session", { method: "POST", body: { citizenId: attempt % 2 ? "sealed-6" : "unknown", password: testPassword } }))).status, 401);
    assert.equal((await sessions.POST(request("/api/member-session", { method: "POST", body: { citizenId: "amberina", password: testPassword } }))).status, 429);
  } finally { sqlite.close(); }
});

test("API request body bounds prevent large login, leaderboard, and aquarium allocations", async () => {
  const sqlite = setup();
  try {
    const cookie = await login();
    const huge = "x".repeat(100_000);
    const auth = await sessions.POST(request("/api/member-session", { method: "POST", body: huge }));
    assert.equal(auth.status, 400, "unauthenticated login input remains size capped");
    const score = await records.POST(request("/api/lounge-games", { method: "POST", cookie, member: "amberina", body: huge }));
    assert.equal(score.status, 413, "large scoreboard input is rejected before parsing");
    const save = await aquarium.PUT(request("/api/aquarium-save", { method: "PUT", cookie, member: "amberina", body: huge }));
    assert.equal(save.status, 413, "large player save is rejected before parsing");
    assert.match((await save.json()).error, /存档过大/);
  } finally { sqlite.close(); }
});
