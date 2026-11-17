import { env } from "cloudflare:workers";
import { cookieToken, currentMember, digest, MEMBER_SESSION_SECONDS, sameOrigin, sessionCookie, verifyMemberPassword } from "../../member-session";

export async function GET(request: Request) {
  try {
    const citizenId = await currentMember(request);
    const token = citizenId ? cookieToken(request) : null;
    // A non-secret display marker: never return the cookie or stored session hash.
    // It changes on each successful login and is shared across the user's tabs.
    const briefingSessionKey = token ? await digest("briefing-ui-v2:" + token) : null;
    return Response.json({ citizenId, briefingSessionKey }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "登录服务暂时未能回应。" }, { status: 503 }); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "请从本站登录。" }, { status: 403 });
  try {
    const raw = await request.text(); if (raw.length > 4096) return Response.json({ error: "登录信息过长。" }, { status: 400 });
    let payload: { citizenId?: unknown; password?: unknown };
    try { const value: unknown = JSON.parse(raw); if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(); payload = value; }
    catch { return Response.json({ error: "登录信息格式不正确。" }, { status: 400 }); }
    const citizenId = typeof payload.citizenId === "string" ? payload.citizenId : "", password = typeof payload.password === "string" ? payload.password : "";
    const now = Date.now(), windowKey = await digest(`${request.headers.get("CF-Connecting-IP") || "local"}:${Math.floor(now / 60000)}`);
    const rate = await env.DB.prepare("INSERT INTO member_login_windows (window_key, attempts, expires_at) VALUES (?, 1, ?) ON CONFLICT(window_key) DO UPDATE SET attempts=attempts+1 RETURNING attempts").bind(windowKey, now + 120000).first<{ attempts: number }>();
    if ((rate?.attempts ?? 99) > 20) return Response.json({ error: "尝试次数较多，请一分钟后重试。" }, { status: 429, headers: { "Retry-After": "60" } });
    if (!await verifyMemberPassword(citizenId, password)) return Response.json({ error: "密码不正确，请重新输入。" }, { status: 401 });
    const token = [...crypto.getRandomValues(new Uint8Array(32))].map((value) => value.toString(16).padStart(2, "0")).join("");
    await env.DB.batch([
      env.DB.prepare("DELETE FROM member_sessions WHERE expires_at < ?").bind(now),
      env.DB.prepare("DELETE FROM member_login_windows WHERE expires_at < ?").bind(now),
      env.DB.prepare("INSERT INTO member_sessions (token_hash, citizen_id, expires_at) VALUES (?, ?, ?)").bind(await digest(token), citizenId, now + MEMBER_SESSION_SECONDS * 1000),
    ]);
    return Response.json({ citizenId }, { headers: { "Set-Cookie": sessionCookie(request, token), "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "暂时无法完成登录，请稍后重试。" }, { status: 503 }); }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "请求来源不匹配。" }, { status: 403 });
  try { const token = cookieToken(request); if (token) await env.DB.prepare("DELETE FROM member_sessions WHERE token_hash = ?").bind(await digest(token)).run(); }
  catch { /* Always clear the browser cookie even if storage is unavailable. */ }
  return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(request, "", 0), "Cache-Control": "no-store" } });
}
