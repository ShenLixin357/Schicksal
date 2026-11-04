import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { sqlValue, validateSnapshot } from "../scripts/cloudflare/snapshot.mjs";
import { standaloneBoundary, standaloneMember, standalonePasswordsReady, STANDALONE_MEMBER_IDS, STANDALONE_MEMBER_HEADER } from "../app/standalone-access.ts";

const hosting = { SCHICKSAL_HOSTING: "cloudflare", SCHICKSAL_MEMBER_PASSWORDS: JSON.stringify(Object.fromEntries(STANDALONE_MEMBER_IDS.map((id) => [id, `test-only-credential-${id}`]))) };
const request = (path, headers = {}, method = "GET") => new Request(`https://example.invalid${path}`, { method, headers });

test("native Sites requests retain their existing platform identity boundary", async () => {
  const original = request("/api/parliament", { "oai-authenticated-user-email": "existing@example.invalid" });
  const passed = await standaloneBoundary(original, {}, async () => { throw new Error("Native boundary must not query member sessions"); });
  assert.equal(passed, original); assert.equal(standaloneMember(original, {}), null);
});

test("standalone APIs require a server session and cannot forge ChatGPT or owner headers", async () => {
  const untrusted = request("/api/parliament?citizenId=amberina", { "oai-authenticated-user-email": "owner@example.invalid", [STANDALONE_MEMBER_HEADER]: "amberina" });
  assert.equal((await standaloneBoundary(untrusted, hosting, async () => null)).status, 401);
  const passed = await standaloneBoundary(untrusted, hosting, async () => "zxy");
  assert.ok(passed instanceof Request); assert.equal(passed.headers.get("oai-authenticated-user-email"), null);
  assert.equal(standaloneMember(passed, hosting), "zxy");
  assert.equal((await standaloneBoundary(untrusted, hosting, async () => "sealed-6")).status, 401);
});

test("standalone login remains reachable, but legacy shared or incomplete password setup fails closed", async () => {
  assert.ok(standalonePasswordsReady(hosting)); assert.equal(standalonePasswordsReady({}), false);
  assert.equal(standalonePasswordsReady({ SCHICKSAL_MEMBER_PASSWORDS: JSON.stringify({ amberina: "not-all-members-configured" }) }), false);
  assert.equal(standalonePasswordsReady({ SCHICKSAL_MEMBER_PASSWORDS: JSON.stringify(Object.fromEntries(STANDALONE_MEMBER_IDS.map((id) => [id, "the-same-shared-password"]))) }), false);
  const login = request("/api/member-session", {}, "POST");
  assert.ok(await standaloneBoundary(login, hosting, async () => null) instanceof Request);
  assert.equal((await standaloneBoundary(login, { SCHICKSAL_HOSTING: "cloudflare" }, async () => null)).status, 503);
});

test("standalone mutations reject foreign origins and protect private image bytes", async () => {
  assert.equal((await standaloneBoundary(request("/api/committee-club", { origin: "https://unrelated.invalid" }, "POST"), hosting, async () => "amberina")).status, 403);
  assert.equal((await standaloneBoundary(request("/api/photos/image?id=sample"), hosting, async () => null)).status, 401);
  assert.ok(await standaloneBoundary(request("/committee-room.png"), hosting, async () => null) instanceof Request);
});

async function emptySnapshot() {
  const database = new DatabaseSync(":memory:"), root = new URL("../", import.meta.url).pathname;
  for (const file of (await readdir(new URL("../drizzle", import.meta.url))).filter((file) => file.endsWith(".sql")).sort()) database.exec(await readFile(new URL(`../drizzle/${file}`, import.meta.url), "utf8"));
  const tables = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(({ name }) => ({ table_name: name, columns: database.prepare(`PRAGMA table_info(\"${name}\")`).all().map((column) => column.name), rows: [], model_projection: { truncated: false, truncated_values: 0, omitted_columns: 0, omitted_rows: 0, next_offset: null } }));
  database.close(); return { root, snapshot: { version: 1, capturedAt: new Date().toISOString(), sourceCommit: "a".repeat(40), tables } };
}

test("snapshot restore preserves multilingual text, quotes, newlines and null bytes; login sessions are excluded", async () => {
  const { root, snapshot } = await emptySnapshot();
  snapshot.tables.find((table) => table.table_name === "committee_club_messages").rows.push({ id: "test-id", citizen_id: "amberina", body: "女巫's line\nsecond\0end 🪄", sticker: "", created_at: "2026-11-04" });
  snapshot.tables.find((table) => table.table_name === "member_sessions").rows.push({ token_hash: "test-only", citizen_id: "amberina", expires_at: 99999 });
  const output = await validateSnapshot(snapshot, root);
  assert.equal(output.counts.committee_club_messages, 1); assert.equal(output.counts.member_sessions, 0);
  assert.equal(output.dataSql.includes("test-only"), false); assert.match(sqlValue("'quoted'"), /^CAST\(X'/);
  assert.throws(() => sqlValue(Infinity)); assert.throws(() => sqlValue({}));
});

test("snapshot generation refuses incomplete pagination, truncated cells, mismatched schemas and missing tables", async () => {
  const { root, snapshot } = await emptySnapshot();
  for (const mutation of [(value) => { value.tables[0].model_projection.next_offset = 25; }, (value) => { value.tables[0].model_projection.truncated_values = 1; }, (value) => { value.tables[0].columns.pop(); }, (value) => { value.tables.pop(); }]) {
    const broken = structuredClone(snapshot); mutation(broken); await assert.rejects(validateSnapshot(broken, root));
  }
});
