import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { after, test } from "node:test";

const password = crypto.randomUUID();
const env = { SCHICKSAL_MEMBER_PASSWORDS: JSON.stringify({ amberina: password, zxy: password }) };
globalThis.__schicksalBriefingApiTestEnv = env;
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return { url: "data:text/javascript,export const env = globalThis.__schicksalBriefingApiTestEnv;", shortCircuit: true };
    }
    if (specifier.endsWith("/db")) return nextResolve(specifier + "/index.ts", context);
    if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(specifier + ".ts", context);
    return nextResolve(specifier, context);
  },
});
const sessions = await import("../app/api/member-session/route.ts");
const briefing = await import("../app/api/briefing/route.ts");
hooks.deregister();
after(() => { delete globalThis.__schicksalBriefingApiTestEnv; });

function setup() {
  const sqlite = new DatabaseSync(":memory:");
  for (const name of readdirSync(new URL("../drizzle", import.meta.url)).filter(x => x.endsWith(".sql")).sort()) {
    sqlite.exec(readFileSync(new URL("../drizzle/" + name, import.meta.url), "utf8"));
  }
  function prepare(sql) {
    const statement = sqlite.prepare(sql);
    let args = [];
    return {
      bind(...values) { args = values; return this; },
      async first() { return statement.get(...args) ?? null; },
      async all() { return { results: statement.all(...args) }; },
      async run() { const result = statement.run(...args); return { meta: { changes: Number(result.changes) } }; },
    };
  }
  env.DB = { prepare, async batch(statements) { return Promise.all(statements.map(s => s.run())); } };
  return sqlite;
}

function request(path, cookie) {
  return new Request("https://test.schicksal.invalid" + path, {
    headers: cookie ? { cookie, "x-schicksal-citizen": "zxy" } : {},
  });
}

async function login(citizenId) {
  const response = await sessions.POST(new Request("https://test.schicksal.invalid/api/member-session", {
    method: "POST", headers: { origin: "https://test.schicksal.invalid", "Content-Type": "application/json" },
    body: JSON.stringify({ citizenId, password }),
  }));
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie").split(";")[0];
}

test("real briefing API enforces signed-in identity and never trusts a spoofed citizenId", async () => {
  const sqlite = setup();
  try {
    assert.equal((await briefing.GET(request("/api/briefing?citizenId=amberina"))).status, 401);
    const amberCookie = await login("amberina");
    await briefing.GET(request("/api/briefing", amberCookie)); // ensure old schema + seed records
    sqlite.exec("UPDATE parliament_items SET stage='voting', version=2, voting_version=2, deadline='2026-11-22' WHERE id='lesson-1-state'");
    sqlite.exec("UPDATE parliament_items SET stage='voting', version=3, voting_version=3, deadline='2026-11-23' WHERE id='lesson-2-citizenship'");
    sqlite.prepare("INSERT INTO parliament_votes (id,item_id,citizen_id,choice,document_version,created_at,updated_at) VALUES (?,?,?,?,?,?,?)")
      .run("vote-amber", "lesson-1-state", "amberina", "support", 2, "2026-11-18", "2026-11-18");
    sqlite.prepare("INSERT INTO parliament_votes (id,item_id,citizen_id,choice,document_version,created_at,updated_at) VALUES (?,?,?,?,?,?,?)")
      .run("vote-zxy", "lesson-2-citizenship", "zxy", "support", 3, "2026-11-18", "2026-11-18");
    sqlite.prepare("INSERT INTO parliament_audit_events (id,item_id,actor_citizen_id,event_type,description,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)")
      .run("news-1", "lesson-1-state", "amberina", "stage_transition", "正式进入表决阶段", "{}", "2026-11-18T03:00:00+08:00");
    sqlite.prepare("INSERT INTO parliament_audit_events (id,item_id,actor_citizen_id,event_type,description,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)")
      .run("private-event", "lesson-1-state", "zxy", "speaker_vote_cast", "内部票务", "{}", "2026-11-18T03:10:00+08:00");

    const amber = await briefing.GET(request("/api/briefing?citizenId=zxy", amberCookie));
    assert.equal(amber.status, 200);
    assert.match(amber.headers.get("cache-control"), /no-store/);
    const a = await amber.json();
    assert.deepEqual(a.tasks.map(x => x.targetId), ["lesson-2-citizenship"]);
    assert.equal(a.news.some(x => x.id === "parliament-audit:news-1"), true);
    assert.equal(a.news.some(x => x.id === "parliament-audit:private-event"), false);

    const zxyCookie = await login("zxy");
    const zxy = await briefing.GET(request("/api/briefing?citizenId=amberina", zxyCookie));
    assert.equal(zxy.status, 200);
    const z = await zxy.json();
    assert.deepEqual(z.tasks.map(x => x.targetId), ["lesson-1-state"]);
  } finally {
    sqlite.close();
  }
});
