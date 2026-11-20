import assert from "node:assert/strict";
import test from "node:test";
import {
  GAME_ROOM_RETURN_KEY,
  wantsGameRoomReturn,
  rememberGameRoomReturn,
  consumeGameRoomReturn,
} from "../app/club/game-room-return.ts";

function fixture(startUrl = "https://schicksal.invalid/?lounge=game-room&other=1") {
  const data = new Map();
  const changes = [];
  const runtime = {
    location: { href: startUrl, search: new URL(startUrl).search },
    sessionStorage: {
      getItem: name => data.get(name) ?? null,
      setItem: (name, value) => data.set(name, value),
      removeItem: name => data.delete(name),
    },
    history: {
      state: { preserved: true },
      replaceState(state, title, next) {
        changes.push({ state, title, next: next.toString() });
        runtime.location.href = next.toString();
        runtime.location.search = new URL(next).search;
      },
    },
  };
  return { data, changes, runtime };
}

test("external games may return to the room after a validated site entry", () => {
  const { runtime, data } = fixture("https://schicksal.invalid/?other=1");
  assert.equal(wantsGameRoomReturn(runtime), false);
  rememberGameRoomReturn(runtime);
  assert.equal(data.get(GAME_ROOM_RETURN_KEY), "game-room");
  assert.equal(wantsGameRoomReturn(runtime), true);
  consumeGameRoomReturn(runtime);
  assert.equal(wantsGameRoomReturn(runtime), false);
  assert.equal(data.has(GAME_ROOM_RETURN_KEY), false);
});

test("explicit game-room URLs work with storage disabled without erasing other queries", () => {
  const { runtime, changes } = fixture();
  Object.defineProperty(runtime, "sessionStorage", {
    get() { throw Error("storage denied"); },
  });
  assert.equal(wantsGameRoomReturn(runtime), true);
  assert.doesNotThrow(() => rememberGameRoomReturn(runtime));
  assert.doesNotThrow(() => consumeGameRoomReturn(runtime));
  assert.deepEqual(changes, [{ state: { preserved: true }, title: "", next: "https://schicksal.invalid/?other=1" }]);
});

test("other URL targets cannot activate the private room return", () => {
  for (const url of [
    "https://schicksal.invalid/?lounge=committee",
    "https://schicksal.invalid/?lounge=game-room-other",
    "https://schicksal.invalid/?other=1",
  ]) assert.equal(wantsGameRoomReturn(fixture(url).runtime), false);
});

test("consume is idempotent, preserves unrelated parameters and only clears return hint", () => {
  const { runtime, changes, data } = fixture("https://schicksal.invalid/?lounge=game-room&other=1&other=2#part");
  data.set("schicksal:unrelated", "keep");
  rememberGameRoomReturn(runtime);
  consumeGameRoomReturn(runtime);
  consumeGameRoomReturn(runtime);
  assert.equal(changes.length, 1); // Real history.replaceState updates the current URL.
  assert.equal(changes[0].next, "https://schicksal.invalid/?other=1&other=2#part");
  assert.equal(data.get("schicksal:unrelated"), "keep");
  assert.equal(data.has(GAME_ROOM_RETURN_KEY), false);
});
