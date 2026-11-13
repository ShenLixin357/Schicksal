import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { after, test } from "node:test";
import { chatDate, chatTimestamp, mergeChatMessages } from "../app/club/chat-history.ts";

const env = { SCHICKSAL_HOSTING: "cloudflare" };
globalThis.__loungeChatTestEnv = env;
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "cloudflare:workers") return { url: "data:text/javascript,export const env=globalThis.__loungeChatTestEnv;", shortCircuit: true };
  if (specifier.endsWith(".css?inline")) return nextResolve(specifier, context);
  if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
    const candidate = new URL(`${specifier}.ts`, context.parentURL);
    return nextResolve(existsSync(candidate) ? `${specifier}.ts` : `${specifier}/index.ts`, context);
  }
  return nextResolve(specifier, context);
} });
const chat = await import("../app/api/committee-club/route.ts");
hooks.deregister();
after(() => { delete globalThis.__loungeChatTestEnv; });

function setup() {
  const db = new DatabaseSync(":memory:");
  for (const name of readdirSync(new URL("../drizzle", import.meta.url)).filter(name => name.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(`../drizzle/${name}`, import.meta.url), "utf8"));
  env.DB = { prepare(sql) {
    const statement = db.prepare(sql); let parameters = [];
    return { bind(...values) { parameters = values; return this; },
      async first() { return statement.get(...parameters) ?? null; },
      async all() { return { results: statement.all(...parameters) }; },
      async raw() { return statement.all(...parameters).map(Object.values); },
      async run() { return { meta: { changes: Number(statement.run(...parameters).changes) } }; },
    };
  }, async batch(statements) { return Promise.all(statements.map(statement=>statement.run())); } };
  return db;
}
function request(params = {}, member = "amberina") {
  return new Request(`https://test.schicksal.invalid/api/committee-club?${new URLSearchParams(params)}`, {
    headers: { "x-schicksal-server-member": member },
  });
}
function seed(db, count) {
  const insert = db.prepare("INSERT INTO committee_club_messages(id,citizen_id,body,sticker,created_at) VALUES(?,? ,?,'',?)");
  for (let n=0; n<count; n++) insert.run(`message-${String(n).padStart(4,"0")}`, ["amberina","zxy","truth"][n%3], `秘密 ${n}`, n%2 ? "2026-11-14T06:00:00.000Z" : "2026-11-14 06:00:00");
}

test("old SQLite UTC dates and ISO dates show the same complete UTC+8 date and time", () => {
  assert.equal(chatDate("2026-11-14 06:12:34").toISOString(), "2026-11-14T06:12:34.000Z");
  assert.equal(chatTimestamp("2026-11-14 06:12:34"), chatTimestamp("2026-11-14T06:12:34.000Z"));
  assert.match(chatTimestamp("2026-11-14 06:12:34"), /2026.*11.*14.*14:12:34/);
  assert.match(chatTimestamp("2026-12-31T18:02:03Z"), /2027.*01.*01.*02:02:03/);
  assert.equal(chatTimestamp("bad"), "时间未记录");
});

test("actual route reads all pages without missing equal-time messages or mixing ISO and SQLite order", async () => {
  const db = setup();
  try {
    seed(db, 235);
    const ids = [], pageLengths = []; let cursor = null;
    do {
      const response = await chat.GET(request(cursor ? { beforeAt: cursor.createdAt, beforeId: cursor.id } : {}));
      assert.equal(response.status, 200);
      const result = await response.json();
      pageLengths.push(result.messages.length); ids.push(...result.messages.map(message=>message.id)); cursor=result.nextCursor;
    } while(cursor);
    assert.deepEqual(pageLengths, [100,100,35]);
    assert.equal(new Set(ids).size,235);
    assert.ok(ids.includes("message-0000"));
    db.prepare("INSERT INTO committee_club_messages(id,citizen_id,body,created_at) VALUES('later','truth','后来','2026-11-14T06:00:01.000Z')").run();
    const latest = await (await chat.GET(request())).json();
    assert.equal(latest.messages.at(-1).id, "later");
  } finally { db.close(); }
});

test("history search finds old records and treats SQL metacharacters as literal text", async () => {
  const db = setup();
  try {
    seed(db, 110);
    db.prepare("INSERT INTO committee_club_messages(id,citizen_id,body,created_at) VALUES('old','zxy',?,'2020-01-01 00:00:00')").run("今天是100%_\\快乐");
    for (const query of ["100%_\\", "今天"]) {
      const response = await chat.GET(request({ q: query }));
      assert.equal(response.status,200);
      const result=await response.json(); assert.deepEqual(result.messages.map(message=>message.id),["old"]);
    }
    const injection=await (await chat.GET(request({q:"' OR 1=1 --"}))).json(); assert.deepEqual(injection.messages,[]);
  } finally { db.close(); }
});

test("history retains committee restrictions and rejects incomplete or malformed cursors", async () => {
  const db=setup();
  try {
    assert.equal((await chat.GET(request({citizenId:"amberina"},"kaito"))).status,403);
    assert.equal((await chat.GET(request({},"truth"))).status,200);
    for(const params of [{beforeAt:"2026-11-14 06:00:00"},{beforeId:"x"},{beforeAt:"invalid",beforeId:"x"},{beforeAt:"2026-11-14T00:00:00Z",beforeId:""}]) assert.equal((await chat.GET(request(params))).status,400);
  } finally { db.close(); }
});

test("reading an earlier page preserves newer messages and removes overlaps", () => {
  const newer={id:"b",createdAt:"2026-11-14T06:00:01Z"}, older={id:"a",createdAt:"2026-11-14 06:00:00"};
  assert.deepEqual(mergeChatMessages([newer],[older,newer]),[older,newer]);
});
