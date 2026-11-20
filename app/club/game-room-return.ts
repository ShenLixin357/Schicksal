export const GAME_ROOM_RETURN_KEY = "schicksal:lounge-return";

/**
 * The external full-page games are the only consumers of this temporary
 * navigation hint. It carries no member data, tokens, saves or game results.
 * Authorization and mandatory briefing are enforced by the caller.
 */
type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem">;
type StorageCleaner = Pick<Storage, "removeItem">;
type ReturnLocation = Pick<Location, "search" | "href">;
type ReturnHistory = Pick<History, "replaceState" | "state">;

export function wantsGameRoomReturn(runtime: {
  location: ReturnLocation;
  sessionStorage?: StorageReader;
}): boolean {
  let saved = false;
  try { saved = runtime.sessionStorage?.getItem(GAME_ROOM_RETURN_KEY) === "game-room"; }
  catch { /* Restricted storage must not block a valid return URL. */ }
  return saved || new URLSearchParams(runtime.location.search).get("lounge") === "game-room";
}

export function rememberGameRoomReturn(runtime: { sessionStorage?: StorageWriter }): void {
  try { runtime.sessionStorage?.setItem(GAME_ROOM_RETURN_KEY, "game-room"); }
  catch { /* URL-based navigation still works if storage is unavailable. */ }
}

export function consumeGameRoomReturn(runtime: {
  location: ReturnLocation;
  sessionStorage?: StorageCleaner;
  history: ReturnHistory;
}): void {
  try { runtime.sessionStorage?.removeItem(GAME_ROOM_RETURN_KEY); }
  catch { /* Do not hold a user in a broken storage state. */ }
  const url = new URL(runtime.location.href);
  if (!url.searchParams.has("lounge")) return;
  url.searchParams.delete("lounge");
  runtime.history.replaceState(runtime.history.state, "", url);
}
