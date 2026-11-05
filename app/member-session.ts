import { env } from "cloudflare:workers";
import { cookieToken, digest } from "./member-session-core";
import { matchesMemberPassword } from "./member-passwords";
export { cookieToken, digest, MEMBER_SESSION_SECONDS, sameOrigin, sessionCookie } from "./member-session-core";
const MEMBER_IDS = new Set(["amberina", "zxy", "truth", "kaito", "harry"]);
const LEGACY_SITE_PASSWORD = "";

export async function currentMember(request: Request): Promise<string | null> {
  const token = cookieToken(request); if (!token) return null;
  const row = await env.DB.prepare("SELECT citizen_id AS citizenId FROM member_sessions WHERE token_hash = ? AND expires_at > ?").bind(await digest(token), Date.now()).first<{ citizenId: string }>();
  return row && MEMBER_IDS.has(row.citizenId) ? row.citizenId : null;
}
export async function verifyMemberPassword(citizenId: string, password: string) {
  if (!MEMBER_IDS.has(citizenId) || !password || password.length > 1024) return false;
  const settings = env as unknown as { SCHICKSAL_HOSTING?: string; SCHICKSAL_MEMBER_PASSWORDS?: string; SCHICKSAL_SITE_PASSWORD?: string };
  if (settings.SCHICKSAL_HOSTING === "cloudflare") {
    const saved = await env.DB.prepare("SELECT password_hash AS hash, password_salt AS salt FROM member_credentials WHERE citizen_id = ?").bind(citizenId).first<{ hash: string; salt: string }>();
    if (saved) return matchesMemberPassword(password, saved.salt, saved.hash);
  }
  let expected: string | undefined;
  if (settings.SCHICKSAL_MEMBER_PASSWORDS) {
    const passwords = JSON.parse(settings.SCHICKSAL_MEMBER_PASSWORDS) as Record<string, unknown>;
    expected = Object.hasOwn(passwords, citizenId) && typeof passwords[citizenId] === "string" ? passwords[citizenId] as string : undefined;
  } else expected = settings.SCHICKSAL_SITE_PASSWORD || LEGACY_SITE_PASSWORD;
  const [left, right] = await Promise.all([digest(password), digest(expected ?? "unconfigured-member")]);
  let difference = 0; for (let i = 0; i < left.length; i++) difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return Boolean(expected) && difference === 0;
}
