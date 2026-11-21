import { env } from "cloudflare:workers";
import { currentSession, sameOrigin, verifyMemberPassword, verifyTechnologyPassword } from "../../../member-session.ts";
import { hashMemberPassword } from "../../../member-passwords.ts";
import { isCurrentTechnologyMinister } from "../../../identity/office-registry.ts";
import { readJson } from "../../../../server/http.ts";

const headers = { "Cache-Control": "private, no-store" };
/** Credentials are separate from citizen passwords; no credential is ever sent
 * back to the client. Initial enrollment requires re-auth of personal password.
 */
export async function GET(request: Request) {
  try {
    const session = await currentSession(request);
    if (!session || !isCurrentTechnologyMinister(session.citizenId))
      return Response.json({ error: "仅现任科技部长可查看部长账号设置。" }, { status: 403, headers });
    const row = await env.DB.prepare("SELECT citizen_id FROM technology_credentials WHERE citizen_id = ?")
      .bind(session.citizenId).first();
    return Response.json({ configured: Boolean(row) }, { headers });
  } catch {
    return Response.json({ error: "暂时无法读取部长凭据状态。" }, { status: 503, headers });
  }
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "请从本站设置部长账号。" }, { status: 403, headers });
  try {
    const session = await currentSession(request);
    if (!session || !isCurrentTechnologyMinister(session.citizenId))
      return Response.json({ error: "没有部长账号设置权限。" }, { status: 403, headers });
    const data = await readJson<{ personalPassword?: unknown; oldMinistryPassword?: unknown; ministryPassword?: unknown }>(request, 4096);
    const password = data.ministryPassword;
    if (typeof password !== "string" || password.length < 12 || password.length > 128)
      return Response.json({ error: "部长密码需要至少 12 位，最多 128 位。" }, { status: 400, headers });
    const old = await env.DB.prepare("SELECT citizen_id FROM technology_credentials WHERE citizen_id = ?")
      .bind(session.citizenId).first();
    const authenticated = old
      ? typeof data.oldMinistryPassword === "string" && await verifyTechnologyPassword(session.citizenId, data.oldMinistryPassword)
      : typeof data.personalPassword === "string" && await verifyMemberPassword(session.citizenId, data.personalPassword);
    if (!authenticated)
      return Response.json({ error: old ? "当前部长密码验证失败。" : "请正确输入个人账号密码以开通部长身份。" }, { status: 401, headers });
    if (!old && password === data.personalPassword)
      return Response.json({ error: "部长密码必须与个人账号密码不同。" }, { status: 400, headers });
    const encrypted = await hashMemberPassword(password), now = Date.now();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO technology_credentials (citizen_id,password_hash,password_salt,updated_at,updated_by) VALUES (?,?,?,?,?) ON CONFLICT(citizen_id) DO UPDATE SET password_hash=excluded.password_hash,password_salt=excluded.password_salt,updated_at=excluded.updated_at,updated_by=excluded.updated_by")
        .bind(session.citizenId,encrypted.hash,encrypted.salt,now,session.citizenId),
      env.DB.prepare("UPDATE member_sessions SET account_mode='citizen', minister_grant_expires_at=0 WHERE citizen_id=?")
        .bind(session.citizenId),
    ]);
    return Response.json({ ok: true, configured: true, reauthenticationRequired: true }, { headers });
  } catch {
    return Response.json({ error: "部长密码设置失败，请稍后重试。" }, { status: 503, headers });
  }
}
