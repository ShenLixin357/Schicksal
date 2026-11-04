import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../db";
import { ensurePhotoSchema } from "../../../../db/photo-schema";
import { archivePhotos } from "../../../../db/schema";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return new Response("Missing photo id", { status: 400 });
  if (!env.BUCKET) return new Response("Photo storage unavailable", { status: 503 });

  await ensurePhotoSchema();
  const [row] = await getDb()
    .select({ objectKey: archivePhotos.objectKey, mimeType: archivePhotos.mimeType })
    .from(archivePhotos)
    .where(eq(archivePhotos.id, id))
    .limit(1);
  if (!row) return new Response("Photo not found", { status: 404 });

  const object = await env.BUCKET.get(row.objectKey);
  if (!object) return new Response("Photo bytes not found", { status: 404 });

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? row.mimeType,
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
