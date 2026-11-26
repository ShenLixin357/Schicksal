import { requireMember } from "../../../../server/auth/member.ts";
import { currentSession } from "../../../member-session.ts";
import { ApiError } from "../../../../server/http.ts";
import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../db";
import { ensurePhotoSchema } from "../../../../db/photo-schema";
import { archivePhotos } from "../../../../db/schema";
import { getPhotoStorage, PhotoStorageError } from "../../../photo-storage";

export async function GET(request: Request) {
  try {
    const member = await requireMember(request);
    const id = new URL(request.url).searchParams.get("id")?.trim();
    if (!id) return new Response("Missing photo id", { status: 400 });
    const storage = getPhotoStorage(env);

    await ensurePhotoSchema();
    const [row] = await getDb()
      .select({ objectKey: archivePhotos.objectKey, mimeType: archivePhotos.mimeType, deletedAt: archivePhotos.deletedAt })
      .from(archivePhotos)
      .where(eq(archivePhotos.id, id))
      .limit(1);
    if (!row || (row.deletedAt && (await currentSession(request))?.accountMode !== "technology")) return new Response("Photo not found", { status: 404 });

    const object = await storage.get(row.objectKey);
    if (!object) return new Response("Photo bytes not found", { status: 404 });

    return new Response(object.body, {
      headers: {
        "Content-Type": object.contentType ?? row.mimeType,
        "Cache-Control": "private, no-store",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return new Response(error instanceof ApiError || error instanceof PhotoStorageError ? error.message : "照片暂时无法读取。", {
      status: error instanceof ApiError || error instanceof PhotoStorageError ? error.status : 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
