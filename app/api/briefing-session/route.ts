import { cookieToken, currentMember, digest } from "../../member-session";

// Keeps the legacy /api/member-session payload unchanged. This marker is only
// for presentation state: it is NOT an authentication credential.
export async function GET(request: Request) {
  try {
    const citizenId = await currentMember(request);
    const token = citizenId ? cookieToken(request) : null;
    if (!citizenId || !token) return Response.json({ error: "未登录。" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const briefingSessionKey = await digest("briefing-ui-v2:" + token);
    return Response.json({ citizenId, briefingSessionKey }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "简报会话暂时不可用。" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
