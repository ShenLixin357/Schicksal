import { requireMember } from "../../../server/auth/member.ts";
import { isCurrentTechnologyMinister } from "../../identity/office-registry.ts";

const headers = { "Cache-Control": "private, no-store" };
/** Ministry access is authorized by the authenticated member's current office,
 * never by the emblem, client state, a query string or a forged identity header.
 */
export async function GET(request: Request) {
  try {
    const member = await requireMember(request);
    if (!isCurrentTechnologyMinister(member)) {
      return Response.json({ error: "仅现任科技部部长可以访问管理台。" }, { status: 403, headers });
    }
    return Response.json({
      authorized: true, role: "technology-minister", administrativeScope: "all-site",
      // Existing routes may still have narrower checks; do not misrepresent
      // planned management functions as working actions.
      activeModules: ["photo-archive"],
    }, { headers });
  } catch {
    return Response.json({ error: "请先以有效公民身份登录。" }, { status: 401, headers });
  }
}
