import { env } from "cloudflare:workers";
import { cookieToken, digest } from "./member-session-core";
import { matchesMemberPassword } from "./member-passwords";
import { isCurrentTechnologyMinister } from "./identity/office-registry.ts";
export { cookieToken, digest, MEMBER_SESSION_SECONDS, sameOrigin, sessionCookie } from "./member-session-core";
const MEMBER_IDS = new Set(["amberina", "zxy", "truth", "kaito", "harry"]);
const LEGACY_SITE_PASSWORD = "";

export type AccountMode = "citizen" | "technology";
export const MINISTRY_GRANT_MS = 20 * 60 * 1000;
export async function currentSession(request: Request): Promise<{
  citizenId: string; accountMode: AccountMode; ministerGrantExpiresAt: number;
} | null> {
  const token = cookieToken(request); if (!token) return null;
  const now = Date.now();
  const row = await env.DB.prepare(`SELECT citizen_id AS citizenId, account_mode AS accountMode,
    minister_grant_expires_at AS ministerGrantExpiresAt
    FROM member_sessions WHERE token_hash = ? AND expires_at > ?`)
    .bind(await digest(token), now)
    .first<{ citizenId: string; accountMode: string; ministerGrantExpiresAt: number }>();
  if (!row || !MEMBER_IDS.has(row.citizenId)) return null;
  const ministerGrantExpiresAt = Number(row.ministerGrantExpiresAt) || 0;
  const accountMode: AccountMode = row.accountMode === "technology"
    && ministerGrantExpiresAt > now && isCurrentTechnologyMinister(row.citizenId)
    ? "technology" : "citizen";
  return { citizenId: row.citizenId, accountMode, ministerGrantExpiresAt };
}
export async function currentMember(request: Request): Promise<string | null> {
  return (await currentSession(request))?.citizenId ?? null;
}
export async function verifyTechnologyPassword(citizenId: string, password: string): Promise<boolean> {
  if (!isCurrentTechnologyMinister(citizenId) || !password || password.length > 1024) return false;
  const stored = await env.DB.prepare("SELECT password_hash AS hash, password_salt AS salt FROM technology_credentials WHERE citizen_id = ?")
    .bind(citizenId).first<{ hash: string; salt: string }>();
  return Boolean(stored) && matchesMemberPassword(password, stored!.salt, stored!.hash);
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
