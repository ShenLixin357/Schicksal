import { env } from "cloudflare:workers";
import { currentMember, sameOrigin } from "../../member-session";
import { readJson, ApiError } from "../../../server/http.ts";
import { BEST_UPSERT_SQL, GAME_MEMBERS, isGameId, isGameMember, performanceFromSnapshot, rankBests, validBoard, type GameBest } from "../../club/minigames/game-records";

const BEST_SELECT = `SELECT b.game_id AS gameId, b.board_id AS boardId, b.citizen_id AS citizenId, b.run_id AS runId,
 b.score, b.moves, b.duration_ms AS durationMs, b.rounds, b.max_tier AS maxTier,
 b.rank_primary AS rankPrimary, b.rank_secondary AS rankSecondary, b.achieved_at AS achievedAt,
 p.mask_name AS displayName FROM lounge_game_bests b LEFT JOIN committee_club_profiles p ON p.citizen_id=b.citizen_id
 WHERE b.game_id=? AND b.board_id=?`;
const headers = { "Cache-Control": "no-store" };
async function boardRows(gameId: string, boardId: string) {
  const query = await env.DB.prepare(BEST_SELECT).bind(gameId, boardId).all<GameBest>();
  return rankBests(query.results.map((row: GameBest) => ({ ...row, displayName: row.displayName || GAME_MEMBERS.find((member) => member.id === row.citizenId)?.name || row.citizenId })));
}
export async function GET(request: Request) {
  try {
    const member = await currentMember(request); if (!isGameMember(member)) return Response.json({ error: "请重新登录委员会成员身份，以查看排行榜。" }, { status: 401, headers });
    if (request.headers.get("x-schicksal-member") !== member) return Response.json({ error: "登录身份已经改变，请以当前成员重新登录。" }, { status: 409, headers });
    const url = new URL(request.url), gameId = url.searchParams.get("gameId"), boardId = url.searchParams.get("boardId") || "classic";
    if (!isGameId(gameId) || !validBoard(gameId, boardId)) return Response.json({ error: "没有这个游戏榜单。" }, { status: 400, headers });
    const rows = await boardRows(gameId, boardId);
    return Response.json({ gameId, boardId, rows, personalBest: rows.find((row) => row.citizenId === member) ?? null, members: GAME_MEMBERS }, { headers });
  } catch { return Response.json({ error: "排行榜暂时未能回应，可以稍后刷新。" }, { status: 503, headers }); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "请求来源不匹配。" }, { status: 403, headers });
  try {
    const member = await currentMember(request); if (!isGameMember(member)) return Response.json({ error: "请重新登录以同步成绩；本机待同步纪录会保留。" }, { status: 401, headers });
    if (request.headers.get("x-schicksal-member") !== member) return Response.json({ error: "登录身份已经改变；这位成员的待同步成绩会保留。" }, { status: 409, headers });
    let payload: Record<string, unknown>;
    try { payload = await readJson(request, 80000); }
    catch (error) {
      if (error instanceof ApiError) return Response.json({
        error: error.status === 413 ? "成绩数据过长。" : "成绩信息格式不正确。",
      }, { status: error.status, headers });
      throw error;
    }
    if (!isGameId(payload.gameId) || typeof payload.runId !== "string" || !/^[a-zA-Z0-9-]{8,80}$/.test(payload.runId)) return Response.json({ error: "成绩信息不完整。" }, { status: 400, headers });
    const result = performanceFromSnapshot(payload.gameId, payload.snapshot, Number(payload.durationMs), Number(payload.effortMoves));
    if (!result) return Response.json({ error: "这份成绩尚未达到该榜单的记录条件。" }, { status: 400, headers });
    const changed = await env.DB.prepare(BEST_UPSERT_SQL).bind(result.gameId, result.boardId, member, payload.runId, result.score, result.moves, result.durationMs, result.rounds, result.maxTier, result.rankPrimary, result.rankSecondary, new Date().toISOString()).run();
    const rows = await boardRows(result.gameId, result.boardId);
    return Response.json({ personalBest: rows.find((row) => row.citizenId === member), improved: changed.meta.changes > 0 }, { headers });
  } catch { return Response.json({ error: "成绩暂时未能同步，请稍后重试。" }, { status: 503, headers }); }
}
