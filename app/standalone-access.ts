import { sameOrigin } from "./member-session-core.ts";
import { privateLoginResponse } from "./private-login.ts";

export const STANDALONE_MEMBER_HEADER = "x-schicksal-server-member";
export const STANDALONE_MEMBER_IDS = ["amberina", "zxy", "truth", "kaito", "harry"] as const;
type HostingConfig = { SCHICKSAL_HOSTING?: string; SCHICKSAL_MEMBER_PASSWORDS?: string };

export function standaloneMember(request: Request, config: object): string | null {
  return (config as HostingConfig).SCHICKSAL_HOSTING === "cloudflare" ? request.headers.get(STANDALONE_MEMBER_HEADER) : null;
}

export function standalonePasswordsReady(config: HostingConfig): boolean {
  try {
    const values = JSON.parse(config.SCHICKSAL_MEMBER_PASSWORDS || "null");
    if (!values || typeof values !== "object" || Array.isArray(values) || !Object.hasOwn(values, "amberina")) return false;
    const entries = Object.entries(values);
    if (entries.some(([id]) => !STANDALONE_MEMBER_IDS.includes(id as typeof STANDALONE_MEMBER_IDS[number]))) return false;
    const passwords = entries.map(([, password]) => password);
    return passwords.every((password) => typeof password === "string" && password.length >= 12 && password.length <= 1024) && new Set(passwords).size === passwords.length;
  } catch { return false; }
}

// The standalone Worker replaces the platform boundary only on the independent
// deployment. The original Sites deployment keeps its existing authentication.
export async function standaloneBoundary(request: Request, config: HostingConfig, resolveMember: (request: Request) => Promise<string | null>): Promise<Request | Response> {
  if (config.SCHICKSAL_HOSTING !== "cloudflare") return request;
  const headers = new Headers(request.headers);
  for (const name of [...headers.keys()]) if (name.startsWith("oai-authenticated-") || name.toLowerCase() === STANDALONE_MEMBER_HEADER || name.toLowerCase() === "oai-sites-authorization") headers.delete(name);
  const clean = new Request(request, { headers }), path = new URL(request.url).pathname;
  const responseHeaders = { "Cache-Control": "no-store" };
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !sameOrigin(clean)) return Response.json({ error: "请从天命网站内操作。" }, { status: 403, headers: responseHeaders });
  if (path === "/api/member-session") {
    if (request.method === "POST" && !standalonePasswordsReady(config)) return Response.json({ error: "独立站成员账号尚未完成配置，请联系站长。" }, { status: 503, headers: responseHeaders });
    return clean;
  }
  const pageRequest = !path.startsWith("/api/") && ["GET", "HEAD"].includes(request.method);
  let member: string | null;
  try { member = await resolveMember(clean); }
  catch {
    return pageRequest ? privateLoginResponse(standalonePasswordsReady(config), request.method, true) : Response.json({ error: "入口暂时无法验证身份，请稍后重试。" }, { status: 503, headers: responseHeaders });
  }
  if (!member || !STANDALONE_MEMBER_IDS.includes(member as typeof STANDALONE_MEMBER_IDS[number])) {
    return pageRequest ? privateLoginResponse(standalonePasswordsReady(config), request.method) : Response.json({ error: "请先登录天命成员身份。" }, { status: 401, headers: responseHeaders });
  }
  headers.set(STANDALONE_MEMBER_HEADER, member);
  return new Request(clean, { headers });
}
