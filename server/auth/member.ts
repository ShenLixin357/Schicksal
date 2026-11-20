import { currentMember, sameOrigin } from "../../app/member-session.ts";
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
