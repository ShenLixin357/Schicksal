import { env } from "cloudflare:workers";
import { standaloneMember } from "../../../standalone-access";
import { readVaseHistory, vaseReply } from "../../../club/vase/vase-server";

export async function GET(request: Request) {
  const member = standaloneMember(request, env);
  if (!member || !["amberina", "zxy", "truth"].includes(member)) {
    return vaseReply({ error: "这里没有为这个身份留下入口。" }, 403);
  }
  try { return await readVaseHistory(env.DB, request); }
  catch { return vaseReply({ error: "花瓶的往事暂时没有展开，请稍后重试。" }, 503); }
}
