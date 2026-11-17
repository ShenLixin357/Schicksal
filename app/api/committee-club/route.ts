import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { committeeClubMessages, committeeClubProfiles, committeeClubRoom } from "../../../db/schema";
import { requireMember } from "../../../server/auth/member.ts";
import { readJson, apiFailure } from "../../../server/http.ts";
import { readHistoryQuery, type ChatCursor } from "../../club/chat-history";
import { changeVase } from "../../club/vase/vase-server";

const CLUB_MEMBER_IDS = new Set(["amberina", "zxy", "truth"]);
const CLUB_AVATARS = new Set(["sigil", "crystal_ball", "witch_hat", "pumpkin", "black_cat", "crescent"]);
const CLUB_STICKERS = new Set(["", "ghost", "sparkles", "pumpkin", "crystal", "bat", "candy", "moon"]);

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function denyUnlessMember(citizenId: string) {
  return CLUB_MEMBER_IDS.has(citizenId)
    ? null
    : Response.json({ error: "这里没有为这个身份留下入口。" }, { status: 403 });
}

type LoungeSeatRow = { seatIndex: number; citizenId: string; seatedAt: string };

async function getLoungeSeats() {
  const result = await env.DB.prepare(`SELECT
    seat_index AS seatIndex,
    citizen_id AS citizenId,
    seated_at AS seatedAt
    FROM committee_lounge_seats
    ORDER BY seat_index`).all<LoungeSeatRow>();
  return result.results;
}

export async function GET(request: Request) {
  try {
    const citizenId = await requireMember(request);
    const denied = denyUnlessMember(citizenId);
    if (denied) return denied;

    let history: ReturnType<typeof readHistoryQuery>;
    try { history = readHistoryQuery(new URL(request.url).searchParams); }
    catch (error) { return Response.json({ error: error instanceof Error ? error.message : "无效的翻页位置。" }, { status: 400 }); }
    const conditions: string[] = [], values: (string | number)[] = [];
    if (history.query) {
      conditions.push("body LIKE ? ESCAPE '\\'");
      values.push(`%${history.query.replace(/[\\%_]/g, char => `\\${char}`)}%`);
    }
    if (history.cursor) {
      conditions.push("(julianday(created_at) < julianday(?) OR (julianday(created_at) = julianday(?) AND id < ?))");
      values.push(history.cursor.createdAt, history.cursor.createdAt, history.cursor.id);
    }
    values.push(history.pageSize + 1);
    const messagesQuery = env.DB.prepare(`SELECT id, citizen_id AS citizenId, body, sticker, created_at AS createdAt
      FROM committee_club_messages ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
      ORDER BY julianday(created_at) DESC, id DESC LIMIT ?`).bind(...values);

    const db = getDb();
    const [profiles, newestMessages, roomRows, seats] = await Promise.all([
      db.select().from(committeeClubProfiles),
      messagesQuery.all<{ id: string; citizenId: string; body: string; sticker: string; createdAt: string }>(),
      db.select().from(committeeClubRoom).where(eq(committeeClubRoom.id, "main")).limit(1),
      getLoungeSeats(),
    ]);

    const page = newestMessages.results.slice(0, history.pageSize);
    const oldest = page.at(-1);
    const nextCursor: ChatCursor | null = newestMessages.results.length > history.pageSize && oldest
      ? { createdAt: oldest.createdAt, id: oldest.id } : null;
    return Response.json({
      profiles,
      messages: page.reverse(),
      nextCursor,
      room: roomRows[0] ?? { id: "main", vaseSelection: "autumn", updatedByCitizenId: "", updatedAt: "" },
      seats,
    });
  } catch (error) {
    return apiFailure(error, "Committee Lounge 暂时没有回应。");
  }
}

export async function POST(request: Request) {
  try {
    const citizenId = await requireMember(request);
    const payload = await readJson<{
      action?: unknown;
      citizenId?: unknown;
      body?: unknown;
      sticker?: unknown;
      maskName?: unknown;
      avatar?: unknown;
      vaseSelection?: unknown;
      requestId?: unknown;
      seatIndex?: unknown;
    }>(request, 8000);
    const action = cleanText(payload.action, 40);
    const denied = denyUnlessMember(citizenId);
    if (denied) return denied;
    const db = getDb();

    if (action === "message") {
      const body = cleanText(payload.body, 500);
      const sticker = cleanText(payload.sticker, 30);
      if (!body && !sticker) return Response.json({ error: "写一点内容，或者选择一个魔法表情。" }, { status: 400 });
      if (!CLUB_STICKERS.has(sticker)) return Response.json({ error: "这个魔法表情暂时不在房间里。" }, { status: 400 });
      const [message] = await db.insert(committeeClubMessages).values({
        id: crypto.randomUUID(),
        citizenId,
        body,
        sticker,
      }).returning();
      return Response.json({ message }, { status: 201 });
    }

    if (action === "mask") {
      const maskName = cleanText(payload.maskName, 24);
      const avatar = cleanText(payload.avatar, 30);
      if (!maskName) return Response.json({ error: "请给这副面具起一个名字。" }, { status: 400 });
      if (!CLUB_AVATARS.has(avatar)) return Response.json({ error: "请选择房间提供的面具头像。" }, { status: 400 });
      const now = new Date().toISOString();
      const [profile] = await db.insert(committeeClubProfiles).values({ citizenId, maskName, avatar, updatedAt: now })
        .onConflictDoUpdate({ target: committeeClubProfiles.citizenId, set: { maskName, avatar, updatedAt: now } })
        .returning();
      return Response.json({ profile });
    }

    if (action === "vase" || action === "vase-random") return await changeVase(env.DB, citizenId, payload);

    if (action === "seat") {
      const seatIndex = typeof payload.seatIndex === "number" ? payload.seatIndex : Number.NaN;
      if (!Number.isInteger(seatIndex) || seatIndex < 0 || seatIndex > 2) {
        return Response.json({ error: "这把椅子不属于委员会 Lounge。" }, { status: 400 });
      }
      const occupied = await env.DB.prepare(`SELECT citizen_id AS citizenId
        FROM committee_lounge_seats WHERE seat_index = ?`).bind(seatIndex).first<{ citizenId: string }>();
      if (occupied && occupied.citizenId !== citizenId) {
        return Response.json({ error: "这把椅子已经有人落座了。" }, { status: 409 });
      }
      const now = new Date().toISOString();
      try {
        await env.DB.batch([
          env.DB.prepare("DELETE FROM committee_lounge_seats WHERE citizen_id = ?").bind(citizenId),
          env.DB.prepare(`INSERT INTO committee_lounge_seats (seat_index, citizen_id, seated_at)
            VALUES (?, ?, ?)`).bind(seatIndex, citizenId, now),
        ]);
      } catch (error) {
        if (error instanceof Error && /UNIQUE|constraint/i.test(error.message)) {
          return Response.json({ error: "有人刚刚抢先坐到了这把椅子上。" }, { status: 409 });
        }
        throw error;
      }
      return Response.json({ seats: await getLoungeSeats() });
    }

    return Response.json({ error: "未知的 Lounge 动作。" }, { status: 400 });
  } catch (error) {
    return apiFailure(error, "Committee Lounge 暂时无法保存这次动作。");
  }
}


