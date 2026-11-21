import { env } from "cloudflare:workers";
import { currentMember, sameOrigin, sessionCookie } from "../../member-session";
import { requireTechnologyMinister } from "../../../server/auth/member.ts";
import { hashMemberPassword } from "../../member-passwords";
import { CITIZENS } from "../../citizens";

const headers = { "Cache-Control": "private, no-store" };
const settings = env as unknown as { SCHICKSAL_HOSTING?: string; SCHICKSAL_MEMBER_PASSWORDS?: string };
const reply = (data: object, status = 200) => Response.json(data, { status, headers });

export async function GET(request: Request) {
  if (settings.SCHICKSAL_HOSTING !== "cloudflare") return reply({ error: "此部署未启用成员设置。" }, 404);
  try {
    await requireTechnologyMinister(request);
    const saved = await env.DB.prepare("SELECT citizen_id AS citizenId, updated_at AS updatedAt FROM member_credentials").all<{ citizenId: string; updatedAt: number }>();
    let configured: Record<string, unknown> = {};
    try { configured = JSON.parse(settings.SCHICKSAL_MEMBER_PASSWORDS || "{}"); } catch { /* Database credentials can still be managed. */ }
    return reply({ members: CITIZENS.filter((citizen) => !citizen.locked).map((citizen) => ({
      id: citizen.id, label: citizen.username, name: citizen.name,
      configured: saved.results.some((row) => row.citizenId === citizen.id) || typeof configured[citizen.id] === "string" && (configured[citizen.id] as string).length > 0,
    })) });
  } catch { return reply({ error: "暂时无法读取成员设置。" }, 503); }
}

export async function POST(request: Request) {
  if (settings.SCHICKSAL_HOSTING !== "cloudflare") return reply({ error: "此部署未启用成员设置。" }, 404);
  if (!sameOrigin(request)) return reply({ error: "请从本站修改成员密码。" }, 403);
  try {
    const adminMember = await requireTechnologyMinister(request);
    const text = await request.text();
    if (text.length > 8192) return reply({ error: "提交内容过长。" }, 400);
    let value: { citizenId?: unknown; password?: unknown };
    try { value = JSON.parse(text); if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(); }
    catch { return reply({ error: "成员设置格式不正确。" }, 400); }
    const id = value.citizenId, password = value.password;
    if (typeof id !== "string" || !CITIZENS.some((citizen) => citizen.id === id && !citizen.locked)) return reply({ error: "请选择已有成员。" }, 400);
    if (typeof password !== "string" || !password.length || password.length > 1024) return reply({ error: "请输入 1 至 1024 个字符的密码。" }, 400);
    const encrypted = await hashMemberPassword(password);
    await env.DB.batch([
      env.DB.prepare("INSERT INTO member_credentials (citizen_id, password_hash, password_salt, updated_at, updated_by) VALUES (?, ?, ?, ?, ?) ON CONFLICT(citizen_id) DO UPDATE SET password_hash=excluded.password_hash, password_salt=excluded.password_salt, updated_at=excluded.updated_at, updated_by=excluded.updated_by").bind(id, encrypted.hash, encrypted.salt, Date.now(), adminMember),
      env.DB.prepare("DELETE FROM member_sessions WHERE citizen_id = ?").bind(id),
    ]);
    return Response.json({ ok: true, requiresLogin: id === adminMember }, { headers: { ...headers, ...(id === adminMember ? { "Set-Cookie": sessionCookie(request, "", 0) } : {}) } });
  } catch { return reply({ error: "暂时无法保存成员密码，请稍后重试。" }, 503); }
}
