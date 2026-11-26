import type { ClubData, ClubMessage, ClubProfile } from "./lounge-contract";
import type { ChatCursor } from "./chat-history";

type ClubMutationResult = ClubData & { message?: ClubMessage; profile?: ClubProfile };
const endpoint = "/api/committee-club";

/**
 * UI/transport boundary only. The server owns all member identity and
 * privileges; no query string or submitted action may impersonate a member.
 */
async function readRoomResponse<T extends ClubData>(response: Response, failure: string): Promise<T> {
  const payload = await response.json() as T;
  if (!response.ok) throw new Error(payload.error || failure);
  return payload;
}

export async function fetchCommitteeRoom(signal?: AbortSignal): Promise<ClubData> {
  return readRoomResponse(await fetch(endpoint, { cache: "no-store", signal }), "Committee Lounge 暂时没有回应。");
}

export async function fetchCommitteeHistory(
  query: string,
  cursor: ChatCursor | null,
  signal: AbortSignal,
): Promise<ClubData> {
  const params = new URLSearchParams({ q: query });
  if (cursor) {
    params.set("beforeAt", cursor.createdAt);
    params.set("beforeId", cursor.id);
  }
  return readRoomResponse(
    await fetch(`${endpoint}?${params}`, { cache: "no-store", signal }),
    "卷轴暂时无法翻页。",
  );
}

export async function postCommitteeAction(body: Record<string, string | number>): Promise<ClubMutationResult> {
  // Compatibility input may carry a legacy claimed identity; never send it.
  const action = { ...body };
  delete action.citizenId;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(action),
  });
  return readRoomResponse<ClubMutationResult>(response, "房间没能保存这次魔法。");
}
