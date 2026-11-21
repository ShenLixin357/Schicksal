import { env } from "cloudflare:workers";
import { cookieToken, currentSession, digest, MINISTRY_GRANT_MS, sameOrigin, verifyTechnologyPassword } from "../../../member-session.ts";
import { isIncumbentTechnologyMinister } from "../../../../server/auth/offices.ts";
import { readJson } from "../../../../server/http.ts";

const headers = { "Cache-Control": "private, no-store" };

/** The held gesture opens UI only. Privileged switching is server-side and
 * requires a reconfirmed incumbent personal password or a fresh grant.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "请从本站切换身份。" }, { status: 403, headers });
  try {
    const session = await currentSession(request);
    const token = cookieToken(request);
    if (!session || !token) return Response.json({ error: "登录已失效，请重新进入。" }, { status: 401, headers });
    const payload = await readJson<{ target?: unknown; password?: unknown }>(request, 4096);
    const target = payload.target;
    if (target !== "citizen" && target !== "technology")
      return Response.json({ error: "未知切换身份。" }, { status: 400, headers });
    const now = Date.now();
    const tokenHash = await digest(token);
    if (target === "citizen") {
      const changed = await env.DB.prepare("UPDATE member_sessions SET account_mode = 'citizen' WHERE token_hash = ? AND citizen_id = ? AND expires_at > ?")
        .bind(tokenHash, session.citizenId, now).run();
      if (!changed.meta.changes) return Response.json({ error: "登录已失效。" }, { status: 401, headers });
      return Response.json({ citizenId: session.citizenId, accountMode: "citizen" }, { headers });
    }
    if (!await isIncumbentTechnologyMinister(session.citizenId))
      return Response.json({ error: "仅现任科技部部长可使用部长账号。" }, { status: 403, headers });
    const needsPassword = session.ministerGrantExpiresAt <= now;
    if (needsPassword && !(typeof payload.password === "string" && await verifyTechnologyPassword(session.citizenId, payload.password)))
      return Response.json({ error: "请输入正确的现任部长的个人账号密码。", requiresPassword: true }, { status: 401, headers });
    const grant = needsPassword ? now + MINISTRY_GRANT_MS : session.ministerGrantExpiresAt;
    const changed = await env.DB.prepare("UPDATE member_sessions SET account_mode = 'technology', minister_grant_expires_at = ? WHERE token_hash = ? AND citizen_id = ? AND expires_at > ?")
      .bind(grant, tokenHash, session.citizenId, now).run();
    if (!changed.meta.changes) return Response.json({ error: "登录已失效。" }, { status: 401, headers });
    return Response.json({ citizenId: session.citizenId, accountMode: "technology", grantExpiresAt: grant }, { headers });
  } catch {
    return Response.json({ error: "身份切换暂时失败，请稍后重试。" }, { status: 503, headers });
  }
}
