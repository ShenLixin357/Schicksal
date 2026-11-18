import { env } from "cloudflare:workers";
import { currentMember } from "../../member-session";
import { cookieToken, digest, sameOrigin } from "../../member-session-core";
import { ensureBriefingInboxSchema } from "../../briefing/inbox-schema";

const headers = { "Cache-Control": "private, no-store" };
const PRESENCE_MS = 90_000;
const MEMBER_IDS = ["amberina", "zxy", "truth", "kaito", "harry"] as const;

export async function GET(request: Request) {
  try {
    if (!await currentMember(request)) return Response.json({ error: "请先登录。" }, { status: 401, headers });
    await ensureBriefingInboxSchema();
    const now = Date.now();
    const online = await env.DB.prepare(`SELECT DISTINCT presence.citizen_id AS citizenId
      FROM member_presence presence
      INNER JOIN member_sessions session ON session.token_hash = presence.session_hash
      WHERE presence.last_seen_ms > ? AND session.expires_at > ?`)
      .bind(now - PRESENCE_MS, now).all<{ citizenId: string }>();
    const onlineIds = new Set(online.results.map(row => row.citizenId));
    return Response.json({
      online: MEMBER_IDS.filter(id => onlineIds.has(id)),
      windowSeconds: PRESENCE_MS / 1000,
      checkedAt: new Date(now).toISOString(),
    }, { headers });
  } catch {
    return Response.json({ error: "在线状态暂时无法读取。" }, { status: 503, headers });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "请求来源不匹配。" }, { status: 403, headers });
  try {
    const citizenId = await currentMember(request);
    const token = cookieToken(request);
    if (!citizenId || !token) return Response.json({ error: "请先登录。" }, { status: 401, headers });
    await ensureBriefingInboxSchema();
    const now = Date.now();
    const tokenHash = await digest(token);
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO member_presence (session_hash, citizen_id, last_seen_ms)
        VALUES (?, ?, ?) ON CONFLICT(session_hash) DO UPDATE SET
        citizen_id = excluded.citizen_id, last_seen_ms = excluded.last_seen_ms`).bind(tokenHash, citizenId, now),
      env.DB.prepare(`DELETE FROM member_presence WHERE last_seen_ms < ?`).bind(now - 24 * 3600_000),
    ]);
    return Response.json({ ok: true }, { headers });
  } catch {
    return Response.json({ error: "在线状态暂时无法更新。" }, { status: 503, headers });
  }
}
