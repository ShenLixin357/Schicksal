import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { after, test } from "node:test";

const members = ["amberina", "zxy", "truth", "kaito", "harry"];
const passwords = Object.fromEntries(members.map((id) => [id, crypto.randomUUID()]));
const env = { SCHICKSAL_HOSTING: "cloudflare", SCHICKSAL_MEMBER_PASSWORDS: JSON.stringify(passwords) };
globalThis.__schicksalSpeakerTestEnv = env;
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "cloudflare:workers") return { url: "data:text/javascript,export const env=globalThis.__schicksalSpeakerTestEnv;", shortCircuit: true };
  if (specifier.endsWith(".css?inline")) return nextResolve(specifier, context);
  if (specifier === "../../../db") return nextResolve("../../../db/index.ts", context);
  if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });
const sessions = await import("../app/api/member-session/route.ts");
const parliament = await import("../app/api/parliament/route.ts");
const { standaloneBoundary } = await import("../app/standalone-access.ts");
const { currentMember } = await import("../app/member-session.ts");
hooks.deregister();
after(() => { delete globalThis.__schicksalSpeakerTestEnv; });

function setup(stage = "debate") {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of readdirSync(new URL("../drizzle", import.meta.url)).filter((file) => file.endsWith(".sql")).sort()) sqlite.exec(readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8"));
  env.DB = {
    prepare(sql) {
      const statement = sqlite.prepare(sql); let values = [];
      return { bind(...parameters) { values = parameters; return this; },
        async first() { return statement.get(...values) ?? null; },
        async all() { return { results: statement.all(...values) }; },
        async raw() { const rows = sqlite.prepare(sql); rows.setReturnArrays(true); return rows.all(...values); },
        async run() { const result = statement.run(...values); return { results: [], meta: { changes: Number(result.changes) } }; },
      };
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec("COMMIT"); return results; }
      catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
  sqlite.prepare("INSERT INTO parliament_items (id, serial_code, title, summary, body, stage, created_by_citizen_id) VALUES ('speaker-test', 'TEST-1', 'Isolated test', 'Test', 'Original text', ?, 'amberina')").run(stage);
  return sqlite;
}
function request(path, { method = "GET", cookie, body, headers = {}, origin = "https://speaker.schicksal.invalid" } = {}) {
  return new Request(`https://speaker.schicksal.invalid${path}`, { method, headers: { origin, ...(cookie ? { cookie } : {}), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function visit(options = {}) {
  const path = options.method === "POST" ? "/api/parliament" : "/api/parliament?itemId=speaker-test";
  const guarded = await standaloneBoundary(request(path, options), env, currentMember);
  return guarded instanceof Response ? guarded : parliament[options.method ?? "GET"](guarded);
}
async function login(id) {
  const response = await sessions.POST(request("/api/member-session", { method: "POST", body: { citizenId: id, password: passwords[id] } }));
  assert.equal(response.status, 200); return response.headers.get("set-cookie").split(";")[0];
}
async function act(cookie, action, payload = {}, status = 200) {
  const response = await visit({ method: "POST", cookie, body: { itemId: "speaker-test", action, ...payload } });
  const body = await response.json(); assert.equal(response.status, status, `${action}: ${body.error ?? ""}`); return body;
}
function deadline() { const date = new Date(Date.now() + 2 * 86400000); date.setUTCHours(21, 7, 0, 0); return date.toISOString(); }
async function election(cookie) { return act(cookie, "configure_speaker_election", { speakerElectionDeadline: deadline() }); }

test("the three authenticated committee members manage elections without acquiring unrelated stage powers", async () => {
  for (const id of ["amberina", "zxy", "truth"]) {
    const sqlite = setup();
    try {
      const cookie = await login(id), result = await election(cookie);
      assert.equal(result.session.speakerManager, true);
      assert.equal(result.session.stageManager, id === "amberina");
      assert.equal(result.meeting.speakerElectionDeadline, deadline());
      assert.equal(new Date(result.meeting.speakerElectionDeadline).getUTCMinutes(), 7);
      if (id !== "amberina") await act(cookie, "transition_stage", { stage: "voting", reason: "not allowed" }, 403);
      await act(cookie, "configure_speaker_election", { speakerElectionDeadline: deadline() }, 409);
    } finally { sqlite.close(); }
  }
});

test("anonymous and ordinary members cannot forge committee access through headers, query or JSON", async () => {
  const sqlite = setup();
  try {
    const forged = { "x-schicksal-server-member": "amberina", "x-schicksal-citizen": "amberina", "oai-authenticated-user-email": "owner@example.invalid" };
    assert.equal((await visit({ headers: forged })).status, 401);
    for (const id of ["kaito", "harry"]) {
      const cookie = await login(id);
      const board = await (await visit({ cookie, headers: forged })).json();
      assert.equal(board.session.speakerManager, false); assert.equal(board.session.citizenId, id);
      for (const action of ["configure_speaker_election", "close_speaker_election", "revoke_speaker_election", "assign_speaker", "resolve_speaker_tie"]) {
        const response = await visit({ method: "POST", cookie, headers: forged, body: { action, itemId: "speaker-test", citizenId: "amberina", candidateCitizenId: "harry", speakerElectionDeadline: deadline() } });
        assert.equal(response.status, 403, `${id}: ${action}`);
      }
    }
    const cookie = await login("amberina");
    assert.equal((await visit({ method: "POST", cookie, origin: "https://unrelated.invalid", body: { action: "assign_speaker", itemId: "speaker-test", candidateCitizenId: "amberina" } })).status, 403);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM parliament_meeting_sessions WHERE item_id='speaker-test'").get().n, 0);
  } finally { sqlite.close(); }
});

test("early closure elects the unique current leader and immediately rejects further votes or candidacies", async () => {
  const sqlite = setup();
  try {
    const cookies = Object.fromEntries(await Promise.all(members.map(async (id) => [id, await login(id)])));
    await election(cookies.amberina);
    await act(cookies.zxy, "stand_for_speaker"); await act(cookies.kaito, "stand_for_speaker");
    await act(cookies.amberina, "cast_speaker_vote", { candidateCitizenId: "kaito" });
    await act(cookies.truth, "cast_speaker_vote", { candidateCitizenId: "kaito" });
    await act(cookies.harry, "cast_speaker_vote", { candidateCitizenId: "zxy" });
    const board = await act(cookies.truth, "close_speaker_election");
    assert.equal(board.meeting.speakerStatus, "elected"); assert.equal(board.meeting.speakerCitizenId, "kaito"); assert.equal(board.speakerVotes.length, 3);
    assert.ok(Date.parse(board.meeting.speakerElectionDeadline) <= Date.now());
    await act(cookies.harry, "cast_speaker_vote", { candidateCitizenId: "zxy" }, 409);
    await act(cookies.harry, "stand_for_speaker", {}, 409);
    await act(cookies.zxy, "close_speaker_election", {}, 409);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM parliament_speaker_votes WHERE item_id='speaker-test'").get().n, 3);
    const audit = board.auditEvents.find((event) => event.eventType === "speaker_election_closed_early");
    assert.equal(audit.actorCitizenId, "truth"); assert.equal(JSON.parse(audit.metadataJson).ballots.length, 3);
  } finally { sqlite.close(); }
});

test("ties remain undecided until a committee member chooses among the tied leaders", async () => {
  const sqlite = setup();
  try {
    const owner = await login("amberina"), no2 = await login("zxy"), truth = await login("truth"), other = await login("harry");
    await election(owner); await act(owner, "stand_for_speaker"); await act(no2, "stand_for_speaker");
    await act(owner, "cast_speaker_vote", { candidateCitizenId: "amberina" }); await act(no2, "cast_speaker_vote", { candidateCitizenId: "zxy" });
    const closed = await act(no2, "close_speaker_election");
    assert.equal(closed.meeting.speakerStatus, "tie_pending"); assert.equal(closed.meeting.speakerCitizenId, "");
    assert.deepEqual(JSON.parse(closed.meeting.tiedCandidateIdsJson), ["amberina", "zxy"]);
    await act(other, "resolve_speaker_tie", { candidateCitizenId: "zxy" }, 403);
    await act(truth, "resolve_speaker_tie", { candidateCitizenId: "truth" }, 409);
    assert.equal((await act(truth, "resolve_speaker_tie", { candidateCitizenId: "zxy" })).meeting.speakerCitizenId, "zxy");
  } finally { sqlite.close(); }
});

test("empty elections do not invent a winner; overdue elections use the same automatic tally", async () => {
  const sqlite = setup();
  try {
    const owner = await login("amberina"), no2 = await login("zxy");
    await election(owner);
    let board = await act(no2, "close_speaker_election");
    assert.equal(board.meeting.speakerStatus, "tie_pending"); assert.deepEqual(JSON.parse(board.meeting.tiedCandidateIdsJson), []);
    await act(owner, "revoke_speaker_election"); await election(no2); await act(no2, "stand_for_speaker"); await act(owner, "cast_speaker_vote", { candidateCitizenId: "zxy" });
    sqlite.prepare("UPDATE parliament_meeting_sessions SET speaker_election_deadline = ? WHERE item_id='speaker-test'").run(new Date(Date.now() - 1000).toISOString());
    board = await (await visit({ cookie: owner })).json();
    assert.equal(board.meeting.speakerStatus, "elected"); assert.equal(board.meeting.speakerCitizenId, "zxy");
    const once = sqlite.prepare("SELECT COUNT(*) AS n FROM parliament_audit_events WHERE event_type='speaker_elected'").get().n;
    await visit({ cookie: owner });
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM parliament_audit_events WHERE event_type='speaker_elected'").get().n, once);
  } finally { sqlite.close(); }
});

test("revocation removes a live speaker's power, clears pending requests, and preserves ballots and speeches", async () => {
  const sqlite = setup();
  try {
    const owner = await login("amberina"), no2 = await login("zxy"), truth = await login("truth");
    await election(owner); await act(no2, "stand_for_speaker"); await act(owner, "cast_speaker_vote", { candidateCitizenId: "zxy" }); await act(truth, "close_speaker_election");
    await act(no2, "start_debate_session"); await act(truth, "create_floor_request", { requestType: "speech", body: "pending request" });
    sqlite.exec("INSERT INTO parliament_comments (id,item_id,citizen_id,comment_type,body) VALUES ('speech-survives','speaker-test','truth','speech','Recorded speech')");
    const board = await act(truth, "revoke_speaker_election");
    assert.equal(board.meeting.speakerStatus, "not_configured"); assert.equal(board.meeting.speakerCitizenId, ""); assert.equal(board.meeting.currentFloorCitizenId, ""); assert.equal(board.meeting.debateStartedAt, ""); assert.equal(board.meeting.seatsLocked, 0);
    assert.equal(board.speakerVotes.length, 1); assert.ok(board.comments.some((comment) => comment.id === "speech-survives")); assert.equal(board.floorRequests[0].status, "rejected");
    assert.equal((await (await visit({ cookie: no2 })).json()).session.meetingSpeaker, false);
    await act(no2, "start_debate_session", {}, 403);
    const record = JSON.parse(board.auditEvents.find((event) => event.eventType === "speaker_election_revoked").metadataJson);
    assert.equal(record.previous.meeting.speakerCitizenId, "zxy"); assert.equal(record.previous.ballots.length, 1);
  } finally { sqlite.close(); }
});

test("direct appointment enters debate, supports immediate start or seating first, and protects frozen business", async () => {
  const sqlite = setup("proposal");
  try {
    const owner = await login("amberina"), no2 = await login("zxy"), truth = await login("truth"), other = await login("kaito");
    for (const candidateCitizenId of ["sealed-6", "unknown", ""]) await act(no2, "assign_speaker", { candidateCitizenId }, 400);
    let board = await act(no2, "assign_speaker", { candidateCitizenId: "kaito", startDebateNow: false });
    assert.equal(board.activeItem.stage, "debate"); assert.equal(board.meeting.speakerCitizenId, "kaito"); assert.equal(board.meeting.debateStartedAt, ""); assert.equal(board.meeting.seatsLocked, 0);
    await act(owner, "choose_seat", { side: "proposal", seatIndex: 1 }); await act(other, "start_debate_session");
    board = await act(truth, "assign_speaker", { candidateCitizenId: "amberina", startDebateNow: true });
    assert.ok(board.meeting.debateStartedAt); assert.equal(board.meeting.seatsLocked, 1); assert.equal(board.meeting.speakerDecidedByCitizenId, "truth"); assert.equal(board.seats.some((seat) => seat.citizenId === "amberina"), false);
    await act(other, "start_debate_session", {}, 403);
    for (const stage of ["voting", "resolved"]) {
      sqlite.prepare("UPDATE parliament_items SET stage=? WHERE id='speaker-test'").run(stage);
      for (const action of ["assign_speaker", "revoke_speaker_election", "close_speaker_election"]) await act(owner, action, { candidateCitizenId: "zxy" }, 409);
      assert.equal(sqlite.prepare("SELECT speaker_citizen_id FROM parliament_meeting_sessions WHERE item_id='speaker-test'").get().speaker_citizen_id, "amberina");
    }
  } finally { sqlite.close(); }
});
