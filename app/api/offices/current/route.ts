import { requireMember } from "../../../../server/auth/member.ts";
import { ApiError } from "../../../../server/http.ts";
import { readCurrentOffices } from "../../../../server/auth/offices.ts";
const headers = { "Cache-Control": "private, no-store" };
/** Authenticated UI reads the same current office source as the permission gate. */
export async function GET(request: Request) {
  try {
    await requireMember(request);
    return Response.json({ offices: await readCurrentOffices() }, { headers });
  } catch (error) {
    return Response.json({ error: error instanceof ApiError ? error.message : "无法验证当前公职名册。" }, { status: error instanceof ApiError ? error.status : 503, headers });
  }
}
