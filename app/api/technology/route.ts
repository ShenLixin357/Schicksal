import { ApiError } from "../../../server/http.ts";
import { requireTechnologyMinister } from "../../../server/auth/member.ts";

const headers = { "Cache-Control": "private, no-store" };
/** Ministry access is authorized by the authenticated member's current office,
 * never by the emblem, client state, a query string or a forged identity header.
 */
export async function GET(request: Request) {
  try {
    await requireTechnologyMinister(request);
    return Response.json({
      authorized: true, role: "technology-minister", administrativeScope: "all-site",
      // Existing routes may still have narrower checks; do not misrepresent
      // planned management functions as working actions.
      activeModules: ["photo-archive"],
    }, { headers });
  } catch (error) {
    return Response.json({ error: error instanceof ApiError ? error.message : "部长身份校验失败。" }, { status: error instanceof ApiError ? error.status : 503, headers });
  }
}
