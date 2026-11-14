import { VASE_IDS, VASE_OPTIONS, type VaseChange, type VaseHistoryEntry, type VaseRoom } from "./vase-catalogue";

type Statement = {
  bind(...values: (string | number)[]): Statement;
  all<T>(): Promise<{ results: T[] }>;
};
type VaseDatabase = { prepare(sql: string): Statement; batch(statements: Statement[]): Promise<{ results: unknown[] }[]> };
const roomQuery = `SELECT id, vase_selection AS vaseSelection, updated_by_citizen_id AS updatedByCitizenId,
  updated_at AS updatedAt FROM committee_club_room WHERE id = 'main'`;
const historyFields = "seq, citizen_id AS citizenId, vase_selection AS vaseSelection, created_at AS createdAt, method";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
export const vaseReply = (body: unknown, status = 200) => Response.json(body, { status, headers });

export async function changeVase(db: VaseDatabase, citizenId: string, payload: {
  action?: unknown; vaseSelection?: unknown; requestId?: unknown;
}) {
  const random = payload.action === "vase-random";
  const selection = typeof payload.vaseSelection === "string" ? payload.vaseSelection.trim() : "";
  if (!random && !VASE_OPTIONS.some(option => option.id === selection && !option.hidden)) {
    return vaseReply({ error: "请选择名单里的陈设。" }, 400);
  }
  const clientId = payload.requestId ?? crypto.randomUUID();
  if (typeof clientId !== "string" || !/^[a-zA-Z0-9_-]{8,96}$/.test(clientId)) {
    return vaseReply({ error: "这次魔法没有留下完整的印记，请重新打开花瓶。" }, 400);
  }
  const requestId = `${citizenId}:${clientId}`;
  const now = new Date().toISOString();
  const current = "COALESCE((SELECT vase_selection FROM committee_club_room WHERE id = 'main'), 'autumn')";
  // Selection, append-only authorship and room update run in ONE D1 transaction.
  // SQLite chooses against the actual current value, including simultaneous draws.
  const insert = random
    ? db.prepare(`INSERT INTO committee_vase_history(request_id, citizen_id, vase_selection, created_at, method)
        SELECT ?, ?, value, ?, 'random' FROM json_each(?) WHERE value <> ${current}
        ORDER BY random() LIMIT 1 ON CONFLICT(request_id) DO NOTHING`)
      .bind(requestId, citizenId, now, JSON.stringify(VASE_IDS))
    : db.prepare(`INSERT INTO committee_vase_history(request_id, citizen_id, vase_selection, created_at, method)
        SELECT ?, ?, ?, ?, 'manual' WHERE ? <> ${current} ON CONFLICT(request_id) DO NOTHING`)
      .bind(requestId, citizenId, selection, now, selection);
  const result = await db.batch([
    insert,
    // Replaying an earlier request must never restore its old room over a newer change.
    db.prepare(`INSERT INTO committee_club_room(id, vase_selection, updated_by_citizen_id, updated_at)
      SELECT 'main', vase_selection, citizen_id, created_at FROM committee_vase_history
      WHERE request_id = ? AND seq = (SELECT MAX(seq) FROM committee_vase_history)
      ON CONFLICT(id) DO UPDATE SET vase_selection = excluded.vase_selection,
        updated_by_citizen_id = excluded.updated_by_citizen_id, updated_at = excluded.updated_at`).bind(requestId),
    db.prepare(roomQuery),
    db.prepare(`SELECT ${historyFields} FROM committee_vase_history WHERE request_id = ?`).bind(requestId),
  ]);
  const room = result[2].results[0] as VaseRoom | undefined;
  const draw = result[3].results[0] as VaseHistoryEntry | undefined;
  return vaseReply({ room: room ?? { id: "main", vaseSelection: "autumn", updatedByCitizenId: "", updatedAt: "" }, draw: draw ?? null } satisfies VaseChange);
}

export async function readVaseHistory(db: VaseDatabase, request: Request) {
  const before = new URL(request.url).searchParams.get("before");
  if (before !== null && (!/^[1-9]\d*$/.test(before) || !Number.isSafeInteger(Number(before)))) {
    return vaseReply({ error: "这一页往事的位置没有记清。" }, 400);
  }
  const statement = before
    ? db.prepare(`SELECT ${historyFields} FROM committee_vase_history WHERE seq < ? ORDER BY seq DESC LIMIT 31`).bind(Number(before))
    : db.prepare(`SELECT ${historyFields} FROM committee_vase_history ORDER BY seq DESC LIMIT 31`);
  const rows = (await statement.all<VaseHistoryEntry>()).results;
  const items = rows.slice(0, 30);
  return vaseReply({ items, nextCursor: rows.length > 30 ? items.at(-1)!.seq : null });
}
