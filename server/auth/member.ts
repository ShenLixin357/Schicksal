import { currentMember, currentSession, sameOrigin } from "../../app/member-session.ts";
import { isIncumbentTechnologyMinister } from "./offices.ts";
import { ApiError } from "../http.ts";
/** Resolve from real sessions independently of the Worker header boundary. */
export async function requireMember(request: Request): Promise<string> {
    const member = await currentMember(request);
    if (!member)
        throw new ApiError("请先登录天命成员身份。", 401);
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !sameOrigin(request))
        throw new ApiError("请从天命网站内操作。", 403);
    return member;
}

/** Sensitive operations require both the incumbent's identity and an elevated
 * minister session, never the public office badge or ordinary citizen cookie.
 */
export async function requireTechnologyMinister(request: Request): Promise<string> {
  const member = await requireMember(request);
  const session = await currentSession(request);
  if (!session || session.accountMode !== "technology" || !await isIncumbentTechnologyMinister(member))
    throw new ApiError("请切换到科技部部长账号后操作。", 403);
  return member;
}
