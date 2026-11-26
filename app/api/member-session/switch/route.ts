import { env } from "cloudflare:workers";
import { cookieToken, currentSession, digest, MINISTRY_GRANT_MS, sameOrigin } from "../../../member-session.ts";
import { isIncumbentTechnologyMinister } from "../../../../server/auth/offices.ts";
import { readJson } from "../../../../server/http.ts";

const headers = { "Cache-Control": "private, no-store" };

/** The held gesture opens UI only. Privileged switching is server-side and
 * authorizes a current signed-in officeholder with no password or dialog.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "请从本站切换身份。" }, { status: 403, headers });
  try {
    const session = await currentSession(request);
    const token = cookieToken(request);
    if (!session || !token) return Response.json({ error: "登录已失效，请重新进入。" }, { status: 401, headers });
    if (session.authSource !== "personal") return Response.json({error:"部长专用入口登录的会话不能切换为私人公民账号。请用个人账号重新登录。"}, { status:403, headers });
    const payload = await readJson<{ target?: unknown }>(request, 4096);
    const target = payload.target;
    if (target !== "citizen" && target !== "technology")
      return Response.json({ error: "未知切换身份。" }, { status: 400, headers });
    const now = Date.now();
    const tokenHash = await digest(token);
    if (target === "citizen") {
      const changed = await env.DB.prepare("UPDATE member_sessions SET account_mode = 'citizen', minister_grant_expires_at = 0 WHERE token_hash = ? AND citizen_id = ? AND expires_at > ?")
        .bind(tokenHash, session.citizenId, now).run();
      if (!changed.meta.changes) return Response.json({ error: "登录已失效。" }, { status: 401, headers });
      return Response.json({ citizenId: session.citizenId, accountMode: "citizen" }, { headers });
    }
    if (!await isIncumbentTechnologyMinister(session.citizenId))
      return Response.json({ error: "仅现任科技部部长可使用部长账号。" }, { status: 403, headers });
    // A valid personal login session plus the *current* office appointment
    // is sufficient for this deliberate long-press mode change.
    const grant = now + MINISTRY_GRANT_MS;
    const changed = await env.DB.prepare("UPDATE member_sessions SET account_mode = 'technology', minister_grant_expires_at = ? WHERE token_hash = ? AND citizen_id = ? AND expires_at > ?")
      .bind(grant, tokenHash, session.citizenId, now).run();
    if (!changed.meta.changes) return Response.json({ error: "登录已失效。" }, { status: 401, headers });
    return Response.json({ citizenId: session.citizenId, accountMode: "technology", grantExpiresAt: grant }, { headers });
  } catch {
    return Response.json({ error: "身份切换暂时失败，请稍后重试。" }, { status: 503, headers });
  }
}
