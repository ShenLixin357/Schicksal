import { env } from "cloudflare:workers";
import { requireMember } from "../../../../server/auth/member.ts";
import { apiFailure } from "../../../../server/http.ts";
import { readVaseHistory, vaseReply } from "../../../club/vase/vase-server";

export async function GET(request: Request) {
  try {
    // This route must validate the actual cookie-backed member session, even
    // when called directly without the outer Cloudflare Worker boundary.
    const member = await requireMember(request);
    if (!["amberina", "zxy", "truth"].includes(member)) {
      return vaseReply({ error: "这里没有为这个身份留下入口。" }, 403);
    }
    return await readVaseHistory(env.DB, request);
  } catch (error) {
    return apiFailure(error, "花瓶的往事暂时没有展开，请稍后重试。");
  }
}
