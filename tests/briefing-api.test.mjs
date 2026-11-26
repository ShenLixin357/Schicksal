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
const presence = await import("../app/api/presence/route.ts");
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
    // Member presence and briefing fire concurrently on the first page load.
    // They must share read-only schema readiness checks safely.
    const [firstBriefing, firstHeartbeat] = await Promise.all([
      briefing.GET(request("/api/briefing", amberCookie)),
      presence.POST(new Request("https://test.schicksal.invalid/api/presence", {
        method: "POST", headers: { cookie: amberCookie, origin: "https://test.schicksal.invalid" },
      })),
    ]);
    assert.equal(firstBriefing.status, 200);
    assert.equal(firstHeartbeat.status, 200);
    sqlite.exec("UPDATE parliament_items SET stage='voting', version=2, voting_version=2, deadline='2026-11-22' WHERE id='lesson-1-state'");
    // Exercise the actual migration's sequential history contract, never jump over v2.
    sqlite.exec("UPDATE parliament_items SET version=2 WHERE id='lesson-2-citizenship'");
    sqlite.exec("UPDATE parliament_items SET stage='voting', version=3, voting_version=3, deadline='2026-11-23' WHERE id='lesson-2-citizenship'");
    assert.deepEqual(sqlite.prepare("SELECT version FROM parliament_document_versions WHERE item_id='lesson-2-citizenship' ORDER BY version").all().map(row => row.version), [1, 2, 3]);
    sqlite.prepare("INSERT INTO parliament_votes (id,item_id,citizen_id,choice,document_version,created_at,updated_at) VALUES (?,?,?,?,?,?,?)")
      .run("vote-amber", "lesson-1-state", "amberina", "support", 2, "2026-11-18", "2026-11-18");
    sqlite.prepare("INSERT INTO parliament_votes (id,item_id,citizen_id,choice,document_version,created_at,updated_at) VALUES (?,?,?,?,?,?,?)")
      .run("vote-zxy", "lesson-2-citizenship", "zxy", "support", 3, "2026-11-18", "2026-11-18");
    // Debate-stage speaker election has its own real hard deadline.
    sqlite.exec("UPDATE parliament_items SET stage='debate', voting_version=NULL WHERE id='lesson-2-restoration'");
    sqlite.prepare("INSERT INTO parliament_meeting_sessions (item_id,speaker_election_deadline,speaker_status,updated_at) VALUES (?,?,?,?)")
      .run("lesson-2-restoration", "2099-12-31T18:00:00.000Z", "open", "2026-11-19T03:00:00.000Z");
    sqlite.prepare("INSERT INTO parliament_speaker_candidates (id,item_id,citizen_id,created_at) VALUES (?,?,?,?)")
      .run("candidate-zxy", "lesson-2-restoration", "zxy", "2026-11-19T03:00:00.000Z");
    sqlite.prepare("INSERT INTO parliament_speaker_votes (id,item_id,voter_citizen_id,candidate_citizen_id,created_at,updated_at) VALUES (?,?,?,?,?,?)")
      .run("ballot-zxy", "lesson-2-restoration", "zxy", "zxy", "2026-11-19T03:05:00.000Z", "2026-11-19T03:05:00.000Z");
    sqlite.prepare("INSERT INTO parliament_audit_events (id,item_id,actor_citizen_id,event_type,description,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)")
      .run("news-1", "lesson-1-state", "amberina", "stage_transition", "正式进入表决阶段", "{}", "2026-11-18T03:00:00+08:00");
    sqlite.prepare("INSERT INTO parliament_audit_events (id,item_id,actor_citizen_id,event_type,description,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)")
      .run("private-event", "lesson-1-state", "zxy", "speaker_vote_cast", "内部票务", "{}", "2026-11-18T03:10:00+08:00");

    const amber = await briefing.GET(request("/api/briefing?citizenId=zxy", amberCookie));
    assert.equal(amber.status, 200);
    assert.match(amber.headers.get("cache-control"), /no-store/);
    const a = await amber.json();
    assert.deepEqual(a.tasks.filter(x => x.category === "parliament-vote").map(x => x.targetId), ["lesson-2-citizenship"]);
    assert.equal(a.tasks.some(x => x.category === "speaker-election" && x.targetId === "lesson-2-restoration"), true);
    assert.equal(a.tasks.some(x => x.category === "speaker-vote" && x.targetId === "lesson-2-restoration"), true);
    assert.equal(a.tasks.find(x => x.category === "speaker-vote")?.deadlineKind, "deadline");
    assert.equal(a.news.some(x => x.id === "parliament-audit:news-1"), false, "live stage changes are personal affairs, not news");
    assert.equal(a.news.some(x => x.id === "parliament-audit:private-event"), false);

    const zxyCookie = await login("zxy");
    const zxy = await briefing.GET(request("/api/briefing?citizenId=amberina", zxyCookie));
    assert.equal(zxy.status, 200);
    const z = await zxy.json();
    assert.deepEqual(z.tasks.filter(x => x.category === "parliament-vote").map(x => x.targetId), ["lesson-1-state"]);
    assert.equal(z.tasks.some(x => x.category === "speaker-vote" && x.targetId === "lesson-2-restoration"), false, "completed speaker vote no longer pending");
    assert.equal(z.tasks.some(x => x.category === "speaker-election" && x.targetId === "lesson-2-restoration"), true);
    // The personal archive must never modify another member's inbox.
    const archiveResponse = await briefing.POST(new Request("https://test.schicksal.invalid/api/briefing", {
      method: "POST", headers: { cookie: amberCookie, origin: "https://test.schicksal.invalid" },
      body: JSON.stringify({ action: "archive", taskId: "parliament-vote:lesson-2-citizenship" }),
    }));
    assert.equal(archiveResponse.status, 200);
    const archived = await (await briefing.GET(request("/api/briefing", amberCookie))).json();
    assert.equal(archived.tasks.some(x => x.id === "parliament-vote:lesson-2-citizenship"), false);
    assert.equal(archived.views.archived.some(x => x.id === "parliament-vote:lesson-2-citizenship"), true);
    assert.equal(archived.views.archived[0].deadline, "2026-11-23");
    const other = await (await briefing.GET(request("/api/briefing", zxyCookie))).json();
    assert.equal(other.views.archived.length, 0);

    const restored = await briefing.POST(new Request("https://test.schicksal.invalid/api/briefing", {
      method: "POST", headers: { cookie: amberCookie, origin: "https://test.schicksal.invalid" },
      body: JSON.stringify({ action: "restore", taskId: "parliament-vote:lesson-2-citizenship" }),
    }));
    assert.equal(restored.status, 200);
    assert.equal((await (await briefing.GET(request("/api/briefing", amberCookie))).json())
      .tasks.some(x => x.id === "parliament-vote:lesson-2-citizenship"), true);

    // No fabricated online identities: only authenticated visible-session
    // heartbeats appear. Query string spoofing does not change their identity.
    assert.equal((await presence.GET(request("/api/presence"))).status, 401);
    assert.equal((await presence.POST(new Request("https://test.schicksal.invalid/api/presence", {
      method: "POST", headers: { cookie: amberCookie, origin: "https://test.schicksal.invalid" },
    }))).status, 200);
    let online = await (await presence.GET(request("/api/presence?citizenId=zxy", amberCookie))).json();
    assert.deepEqual(online.online, ["amberina"]);
    assert.equal((await presence.POST(new Request("https://test.schicksal.invalid/api/presence", {
      method: "POST", headers: { cookie: zxyCookie, origin: "https://test.schicksal.invalid" },
    }))).status, 200);
    online = await (await presence.GET(request("/api/presence", amberCookie))).json();
    assert.deepEqual(online.online, ["amberina", "zxy"]);
    assert.equal((await sessions.DELETE(new Request("https://test.schicksal.invalid/api/member-session", {
      method: "DELETE", headers: { cookie: amberCookie, origin: "https://test.schicksal.invalid" },
    }))).status, 200);
    online = await (await presence.GET(request("/api/presence", zxyCookie))).json();
    assert.deepEqual(online.online, ["zxy"]);

  } finally {
    sqlite.close();
  }
});
