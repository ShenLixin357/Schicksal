import { env } from "cloudflare:workers";
import { cookieToken, digest } from "./member-session-core";
import { matchesMemberPassword } from "./member-passwords";
import { isIncumbentTechnologyMinister } from "../server/auth/offices.ts";
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
    && ministerGrantExpiresAt > now && await isIncumbentTechnologyMinister(row.citizenId)
    ? "technology" : "citizen";
  return { citizenId: row.citizenId, accountMode, ministerGrantExpiresAt };
}
export async function currentMember(request: Request): Promise<string | null> {
  return (await currentSession(request))?.citizenId ?? null;
}
/** Direct minister login uses an independent *server secret* and never
 * accepts any personal account password. Do not commit or expose that secret.
 * A currently logged-in officeholder switches modes by session authorization
 * instead, so no password is requested for a long hold.
 */
export async function verifyTechnologyPassword(citizenId: string, password: string): Promise<boolean> {
  if (!await isIncumbentTechnologyMinister(citizenId) || !password || password.length > 1024) return false;
  const secret = (env as unknown as { SCHICKSAL_MINISTRY_DIRECT_PASSWORD?: string }).SCHICKSAL_MINISTRY_DIRECT_PASSWORD;
  if (!secret || secret.length < 12) return false;
  const [a,b] = await Promise.all([digest(password), digest(secret)]);
  let difference = 0;
  for(let i=0;i<a.length;i++) difference |= a.charCodeAt(i)^b.charCodeAt(i);
  return difference === 0;
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
