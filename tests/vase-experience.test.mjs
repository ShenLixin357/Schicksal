import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { after, test } from "node:test";
import { VASE_OPTIONS } from "../app/club/vase/vase-catalogue.ts";

test("all nine original illustration bytes remain unchanged", () => {
  const originals = [{"path":"public/club-vase-autumn.png","sha":"17753961276af32ce174317f7b1cf89104fce137"},{"path":"public/club-vase-cabbage.png","sha":"79a98943efa88ed54fc3d86049f258436113305d"},{"path":"public/club-vase-daisies.png","sha":"2c6a0686a9131bdec60b0566af2cb27c3debd48d"},{"path":"public/club-vase-lavender.png","sha":"5aa0a4cf0db6c48329580c17b6019f600ef5d93e"},{"path":"public/club-vase-lollipop.png","sha":"a8828cccffc18afdcab82afe989f22b24b13df30"},{"path":"public/club-vase-popcorn.png","sha":"e5825968f36ea93129b6449171764f051ada3bfb"},{"path":"public/club-vase-roses.png","sha":"e4640a1b84f644b671a3e2e9ebafad891d9dee02"},{"path":"public/club-vase-sunflower.png","sha":"f09b202a91c6abe6e9034a307c5632345dd92a77"},{"path":"public/club-vase-tulips.png","sha":"ec1c3d5e863e3ac567f1fa724fe112ad2d9bd8af"}];
  assert.equal(originals.length, 9);
  for (const { path, sha } of originals) {
    const bytes = readFileSync(new URL(`../${path}`, import.meta.url));
    const actual = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    assert.equal(actual, sha, path);
  }
});

const env = { SCHICKSAL_HOSTING: "cloudflare" };
globalThis.__vaseTestEnv = env;
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "cloudflare:workers") return { url: "data:text/javascript,export const env=globalThis.__vaseTestEnv;", shortCircuit: true };
  if (specifier.endsWith(".css?inline")) return nextResolve(specifier, context);
  if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
    const candidate = new URL(`${specifier}.ts`, context.parentURL);
    return nextResolve(existsSync(candidate) ? `${specifier}.ts` : `${specifier}/index.ts`, context);
  }
  return nextResolve(specifier, context);
} });
const route = await import("../app/api/committee-club/route.ts");
const historyRoute = await import("../app/api/committee-club/vase-history/route.ts");
hooks.deregister();
after(() => { delete globalThis.__vaseTestEnv; });

const migrations = readdirSync(new URL("../drizzle", import.meta.url)).filter(name => name.endsWith(".sql")).sort();
function setup() {
  const db = new DatabaseSync(":memory:");
  for (const name of migrations) db.exec(readFileSync(new URL(`../drizzle/${name}`, import.meta.url), "utf8"));
  db.prepare("INSERT INTO committee_club_room(id,vase_selection,updated_by_citizen_id,updated_at) VALUES('main','cabbage','zxy','2026-11-14T00:00:00Z')").run();
  env.DB = { prepare(sql) {
    const statement = db.prepare(sql); let parameters = [];
    const execute = () => statement.columns().length ? { results: statement.all(...parameters) } : { results: [], meta: { changes: Number(statement.run(...parameters).changes) } };
    return { bind(...values) { parameters = values; return this; }, execute,
      async first() { return statement.get(...parameters) ?? null; },
      async all() { return { results: statement.all(...parameters) }; },
      async raw() { return statement.all(...parameters).map(Object.values); },
      async run() { return execute(); },
    };
  }, async batch(statements) {
    db.exec("BEGIN");
    try { const result = statements.map(statement => statement.execute()); db.exec("COMMIT"); return result; }
    catch (error) { db.exec("ROLLBACK"); throw error; }
  } };
  // Real signed-in sessions: a spoofed Worker header alone must never authorize
  // direct API calls. Stable synthetic cookies are never production credentials.
  for (const [index, id] of ["amberina", "zxy", "truth", "kaito", "harry"].entries()) {
    const token = String(index + 1).repeat(64);
    db.prepare("INSERT INTO member_sessions(token_hash,citizen_id,expires_at) VALUES(?,?,?)")
      .run(createHash("sha256").update(token).digest("hex"), id, Date.now() + 3600000);
  }
  return db;
}
const cookie = member => {
  const index = ["amberina", "zxy", "truth", "kaito", "harry"].indexOf(member);
  return index < 0 ? "" : `schicksal_member=${String(index + 1).repeat(64)}`;
};
const request = (payload, member = "truth") => new Request("https://test.schicksal.invalid/api/committee-club", {
  method: "POST",
  headers: { "content-type": "application/json", origin: "https://test.schicksal.invalid",
    "x-schicksal-server-member": "amberina", ...(cookie(member) ? { cookie: cookie(member) } : {}) },
  body: JSON.stringify(payload),
});
const change = async (payload, member) => { const response = await route.POST(request(payload, member)); return { response, body: await response.json() }; };
const history = (params = {}, member = "truth") => historyRoute.GET(new Request(`https://test.schicksal.invalid/api/committee-club/vase-history?${new URLSearchParams(params)}`, {
  headers: { "x-schicksal-server-member": "amberina", ...(cookie(member) ? { cookie: cookie(member) } : {}) },
}));

test("catalogue preserves all original IDs and adds the complete 30-option contract", () => {
  assert.equal(VASE_OPTIONS.length, 30);
  assert.equal(new Set(VASE_OPTIONS.map(item => item.id)).size, 30);
  assert.deepEqual(VASE_OPTIONS.filter(item => item.original).map(item => item.id), ["autumn","sunflower","roses","tulips","lavender","daisies","cabbage","popcorn","lollipop"]);
  assert.equal(VASE_OPTIONS.filter(item => !item.hidden).length, 19);
  assert.equal(VASE_OPTIONS.filter(item => item.hidden).length, 11);
  for (const id of ["royal-cabbage","royal-rose","ice-lily","aurora","reverse-rain","ink-flower","crane-branches"]) assert.equal(VASE_OPTIONS.find(item => item.id === id)?.hidden, true);
  for (const id of ["bananas","carrots","cabbage"]) assert.equal(VASE_OPTIONS.find(item => item.id === id)?.hidden, false);
});

test("history migration is additive and leaves the original room and messages unchanged", () => {
  const db = new DatabaseSync(":memory:");
  try {
    for (const name of migrations.filter(name => !name.startsWith("0011_"))) db.exec(readFileSync(new URL(`../drizzle/${name}`, import.meta.url), "utf8"));
    db.prepare("INSERT INTO committee_club_room(id,vase_selection,updated_by_citizen_id,updated_at) VALUES('main','roses','truth','old-time')").run();
    db.prepare("INSERT INTO committee_club_messages(id,citizen_id,body) VALUES('old','truth','保留的消息')").run();
    const before = db.prepare("SELECT * FROM committee_club_room").all();
    db.exec(readFileSync(new URL("../drizzle/0011_committee_vase_history.sql", import.meta.url), "utf8"));
    assert.deepEqual(db.prepare("SELECT * FROM committee_club_room").all(), before);
    assert.equal(db.prepare("SELECT body FROM committee_club_messages WHERE id='old'").get().body, "保留的消息");
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM committee_vase_history").get().n, 0);
  } finally { db.close(); }
});

test("manual changes retain server-derived authorship; choosing the current item makes no fake event", async () => {
  const db = setup();
  try {
    const result = await change({ action: "vase", citizenId: "amberina", vaseSelection: "carrots", requestId: "manual-carrots-01" }, "truth");
    assert.equal(result.response.status, 200); assert.equal(result.body.room.vaseSelection, "carrots");
    assert.equal(result.body.draw.citizenId, "truth"); assert.equal(result.body.room.updatedByCitizenId, "truth");
    const same = await change({ action: "vase", vaseSelection: "carrots", requestId: "manual-carrots-02" });
    assert.equal(same.body.draw, null); assert.equal(db.prepare("SELECT COUNT(*) AS n FROM committee_vase_history").get().n, 1);
    assert.equal((await change({ action: "vase", vaseSelection: "royal-cabbage" })).response.status, 400);
    assert.equal((await change({ action: "vase", vaseSelection: "not-a-vase" })).response.status, 400);
  } finally { db.close(); }
});

test("every ordinary and hidden option is reachable by a server draw, which excludes the actual current item", async () => {
  const db = setup();
  try {
    // Override SQLite random deterministically; each valid catalogue entry must be drawable.
    let calls = 0, targetIndex = 0;
    db.function("random", () => calls++ === targetIndex ? -1 : 0);
    for (const target of VASE_OPTIONS) {
      const current = target.id === "autumn" ? "sunflower" : "autumn";
      db.prepare("UPDATE committee_club_room SET vase_selection=? WHERE id='main'").run(current);
      targetIndex = VASE_OPTIONS.filter(item => item.id !== current).findIndex(item => item.id === target.id); calls = 0;
      const result = await change({ action: "vase-random", requestId: `draw-${target.id}-test` });
      assert.equal(result.response.status, 200); assert.equal(result.body.draw.vaseSelection, target.id);
      assert.equal(result.body.room.vaseSelection, target.id); assert.notEqual(result.body.room.vaseSelection, current);
    }
  } finally { db.close(); }
});

test("retrying the same draw returns its saved result and never replaces a later member's arrangement", async () => {
  const db = setup();
  try {
    const first = await change({ action: "vase-random", requestId: "draw-connection-lost" });
    const secondSelection = first.body.room.vaseSelection === "bananas" ? "garlic" : "bananas";
    await change({ action: "vase", vaseSelection: secondSelection, requestId: "later-member-change" }, "zxy");
    const retry = await change({ action: "vase-random", requestId: "draw-connection-lost" });
    assert.deepEqual(retry.body.draw, first.body.draw);
    assert.equal(retry.body.room.vaseSelection, secondSelection);
    assert.equal(retry.body.room.updatedByCitizenId, "zxy");
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM committee_vase_history").get().n, 2);
  } finally { db.close(); }
});

test("room and history roll back together if saving the room fails", async () => {
  const db = setup();
  try {
    db.exec("CREATE TRIGGER reject_room BEFORE UPDATE ON committee_club_room BEGIN SELECT RAISE(ABORT,'simulated failure'); END");
    assert.equal((await change({ action: "vase", vaseSelection: "bananas" })).response.status, 500);
    assert.equal(db.prepare("SELECT vase_selection FROM committee_club_room").get().vase_selection, "cabbage");
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM committee_vase_history").get().n, 0);
  } finally { db.close(); }
});

test("simultaneous member requests append both events and leave the newest event on the table", async () => {
  const db = setup();
  try {
    const results = await Promise.all([change({ action: "vase-random", requestId: "parallel-one" }, "zxy"), change({ action: "vase-random", requestId: "parallel-two" }, "truth")]);
    assert.ok(results.every(result => result.response.status === 200));
    const entries = db.prepare("SELECT * FROM committee_vase_history ORDER BY seq").all();
    assert.equal(entries.length, 2); assert.notEqual(entries[0].vase_selection, entries[1].vase_selection);
    assert.equal(db.prepare("SELECT vase_selection FROM committee_club_room").get().vase_selection, entries.at(-1).vase_selection);
  } finally { db.close(); }
});

test("history paginates equal-time events without gaps and rejects unauthorized and malformed requests", async () => {
  const db = setup();
  try {
    const insert = db.prepare("INSERT INTO committee_vase_history(request_id,citizen_id,vase_selection,created_at,method) VALUES(?,'truth','cabbage','2026-11-15T00:00:00Z','manual')");
    for (let n = 0; n < 75; n++) insert.run(`seed-${n}`);
    const ids = []; let before = null;
    do { const response = await history(before ? { before: String(before) } : {}); assert.equal(response.status, 200); const page = await response.json(); ids.push(...page.items.map(item => item.seq)); before = page.nextCursor; } while (before);
    assert.equal(ids.length, 75); assert.equal(new Set(ids).size, 75); assert.deepEqual(ids, [...ids].sort((a,b) => b-a));
    for (const value of ["0", "-1", "abc", "1 OR 1=1", "1.5", "9007199254740993"]) assert.equal((await history({ before: value })).status, 400);
    assert.equal((await history({ citizenId: "truth" }, "kaito")).status, 403);
    assert.equal((await history({ citizenId: "truth" }, "")).status, 401);
    assert.equal((await change({ action: "vase", vaseSelection: "bananas", citizenId: "truth" }, "kaito")).response.status, 403);
  } finally { db.close(); }
});
