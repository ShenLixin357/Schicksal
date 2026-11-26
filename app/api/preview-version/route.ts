import { env } from "cloudflare:workers";
import { requireMember } from "../../../server/auth/member.ts";

/** Preview-only SHA handshake. The binding does not exist on production;
 * do not expose internals, credentials or member data.
 */
export async function GET(request: Request) {
  try {
    await requireMember(request);
    const sourceSha = (env as unknown as { SCHICKSAL_PREVIEW_COMMIT?: string }).SCHICKSAL_PREVIEW_COMMIT;
    if (!sourceSha || !/^[a-f0-9]{40}$/i.test(sourceSha))
      return Response.json({ error: "Not a verified preview deployment." }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    return Response.json({ preview: true, sourceSha }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Please sign in to verify the preview." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  }
}
