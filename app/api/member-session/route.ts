import { env } from "cloudflare:workers";
import { cookieToken, currentSession, digest, MEMBER_SESSION_SECONDS, MINISTRY_GRANT_MS, sameOrigin, sessionCookie, verifyMemberPassword, verifyTechnologyPassword } from "../../member-session";
import { readJson, ApiError } from "../../../server/http.ts";
import { currentTechnologyMinisterId } from "../../../server/auth/offices.ts";

export async function GET(request: Request) {
  try { const session = await currentSession(request); return Response.json({ citizenId: session?.citizenId ?? null, accountMode: session?.accountMode ?? "citizen", authSource: session?.authSource ?? "personal" }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "登录服务暂时未能回应。" }, { status: 503 }); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "请从本站登录。" }, { status: 403 });
  try {
    let payload: { citizenId?: unknown; password?: unknown; accountMode?: unknown };
    try { payload = await readJson(request, 4096); }
    catch (error) {
      if (error instanceof ApiError) return Response.json({
        error: error.status === 413 ? "登录信息过长。" : "登录信息格式不正确。",
      }, { status: 400 });
      throw error;
    }
    const citizenId = typeof payload.citizenId === "string" ? payload.citizenId : "", password = typeof payload.password === "string" ? payload.password : "";
    const accountMode = payload.accountMode === "technology" ? "technology" : "citizen";
    if (payload.accountMode !== undefined && payload.accountMode !== accountMode) return Response.json({ error: "未知登录身份。" }, { status: 400 });
    const now = Date.now(), windowKey = await digest(`${request.headers.get("CF-Connecting-IP") || "local"}:${Math.floor(now / 60000)}`);
    const rate = await env.DB.prepare("INSERT INTO member_login_windows (window_key, attempts, expires_at) VALUES (?, 1, ?) ON CONFLICT(window_key) DO UPDATE SET attempts=attempts+1 RETURNING attempts").bind(windowKey, now + 120000).first<{ attempts: number }>();
    if ((rate?.attempts ?? 99) > 20) return Response.json({ error: "尝试次数较多，请一分钟后重试。" }, { status: 429, headers: { "Retry-After": "60" } });
    // Direct ministry login is its own entry: the worker resolves the current
    // officeholder; submitting an arbitrary citizen ID cannot impersonate it.
    if (accountMode === "technology" && citizenId !== "technology")
      return Response.json({ error: "请从科技部部长专用入口登录。" }, { status: 400 });
    const authenticatedCitizenId = accountMode === "technology"
      ? await currentTechnologyMinisterId() : citizenId;
    const authenticated = Boolean(authenticatedCitizenId) && (accountMode === "technology"
      ? await verifyTechnologyPassword(authenticatedCitizenId!, password)
      : await verifyMemberPassword(authenticatedCitizenId!, password));
    if (!authenticated) return Response.json({ error: "登录凭据不正确或当前部长身份不可用。" }, { status: 401 });
    const token = [...crypto.getRandomValues(new Uint8Array(32))].map((value) => value.toString(16).padStart(2, "0")).join("");
    await env.DB.batch([
      env.DB.prepare("DELETE FROM member_sessions WHERE expires_at < ?").bind(now),
      env.DB.prepare("DELETE FROM member_login_windows WHERE expires_at < ?").bind(now),
      env.DB.prepare("INSERT INTO member_sessions (token_hash, citizen_id, expires_at, account_mode, minister_grant_expires_at, auth_source) VALUES (?, ?, ?, ?, ?, ?)").bind(await digest(token), authenticatedCitizenId, now + (accountMode === "technology" ? MINISTRY_GRANT_MS : MEMBER_SESSION_SECONDS * 1000), accountMode, accountMode === "technology" ? now + MINISTRY_GRANT_MS : 0, accountMode === "technology" ? "ministry-direct" : "personal"),
    ]);
    return Response.json({ citizenId: authenticatedCitizenId, accountMode, authSource: accountMode === "technology" ? "ministry-direct" : "personal" }, { headers: { "Set-Cookie": sessionCookie(request, token), "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "暂时无法完成登录，请稍后重试。" }, { status: 503 }); }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "请求来源不匹配。" }, { status: 403 });
  try {
    const token = cookieToken(request);
    if (token) {
      const tokenHash = await digest(token);
      // Never claim a successful logout when the server token could still be valid.
      await env.DB.prepare("DELETE FROM member_sessions WHERE token_hash = ?").bind(tokenHash).run();
      // Presence is per session; a best-effort cleanup never masks session revocation.
      try { await env.DB.prepare("DELETE FROM member_presence WHERE session_hash = ?").bind(tokenHash).run(); }
      catch { /* Optional legacy presence table. */ }
    }
    return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(request, "", 0), "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "注销未完成，请检查网络后重试。" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
