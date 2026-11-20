import assert from "node:assert/strict";
import test from "node:test";
import { fetchCommitteeRoom, fetchCommitteeHistory, postCommitteeAction } from "../app/club/lounge-api.ts";

test("Lounge transport loads the signed-in room without claimed member ID", async () => {
  const original = globalThis.fetch, calls = [];
  globalThis.fetch = async (url, config) => {
    calls.push({ url, config });
    return Response.json({ profiles: [], messages: [], seats: [] });
  };
  try {
    const payload = await fetchCommitteeRoom();
    assert.deepEqual(payload.messages, []);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/api/committee-club");
    assert.equal(calls[0].config.cache, "no-store");
  } finally { globalThis.fetch = original; }
});

test("pagination includes encoded search and cursor but never sends citizenship claims", async () => {
  const original = globalThis.fetch, calls = [];
  globalThis.fetch = async (url, config) => {
    calls.push({ url, config });
    return Response.json({ messages: [], nextCursor: null });
  };
  try {
    const abort = new AbortController();
    await fetchCommitteeHistory("天命 %_\\?", { createdAt: "2026-11-20T01:00:00.000Z", id: "previous" }, abort.signal);
    const target = new URL(calls[0].url, "https://schicksal.invalid");
    assert.equal(target.searchParams.get("q"), "天命 %_\\?");
    assert.equal(target.searchParams.get("beforeId"), "previous");
    assert.equal(target.searchParams.get("beforeAt"), "2026-11-20T01:00:00.000Z");
    assert.equal(target.searchParams.has("citizenId"), false);
    assert.equal(calls[0].config.signal, abort.signal);
  } finally { globalThis.fetch = original; }
});

test("mutations send action only, discard spoofed identities and keep error statuses visible", async () => {
  const original = globalThis.fetch, calls = [];
  globalThis.fetch = async (url, config) => {
    calls.push({ url, config });
    return Response.json({ message: { id: "test", citizenId: "truth", body: "hello" } });
  };
  try {
    const result = await postCommitteeAction({ action: "message", body: "hello", citizenId: "amberina" });
    assert.equal(result.message.citizenId, "truth");
    assert.equal(calls[0].url, "/api/committee-club");
    assert.equal(calls[0].config.method, "POST");
    assert.deepEqual(JSON.parse(calls[0].config.body), { action: "message", body: "hello" });
    assert.equal(calls[0].config.headers["content-type"], "application/json");

    globalThis.fetch = async () => Response.json({ error: "No access" }, { status: 403 });
    await assert.rejects(postCommitteeAction({ action: "seat", seatIndex: 0 }), /No access/);
  } finally { globalThis.fetch = original; }
});
