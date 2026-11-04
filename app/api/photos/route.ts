import { desc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { ensurePhotoSchema } from "../../../db/photo-schema";
import { archivePhotos } from "../../../db/schema";
import { standaloneMember } from "../../standalone-access";
import { getPhotoStorage, PhotoStorageError, type PhotoStorage } from "../../photo-storage";

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);
const SUBJECT_IDS = new Set([
  "empire",
  "amberina",
  "zxy",
  "truth",
  "kaito",
  "harry",
  "sealed-6",
  "sealed-7",
  "sealed-8",
]);

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normaliseSubjects(value: unknown) {
  if (!Array.isArray(value)) return [];
  const subjects = [...new Set(value.filter((item): item is string => typeof item === "string" && SUBJECT_IDS.has(item)))].sort();
  if (subjects.includes("empire")) return ["empire"];
  return subjects;
}

function publicPhoto(row: typeof archivePhotos.$inferSelect) {
  let subjects: string[] = [];
  try {
    const parsed = JSON.parse(row.subjectsJson);
    if (Array.isArray(parsed)) subjects = parsed.filter((item): item is string => typeof item === "string");
  } catch {
    subjects = [];
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    era: row.era,
    capturedAt: row.capturedAt,
    subjects,
    subjectKey: row.subjectKey,
    uploaderCitizenId: row.uploaderCitizenId,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt,
    imageUrl: `/api/photos/image?id=${encodeURIComponent(row.id)}`,
  };
}

export async function GET() {
  try {
    await ensurePhotoSchema();
    const rows = await getDb()
      .select()
      .from(archivePhotos)
      .orderBy(desc(archivePhotos.createdAt), desc(archivePhotos.id))
      .limit(250);
    return Response.json({ photos: rows.map(publicPhoto) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "影像馆暂时无法读取。" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let objectKey = "";
  let storage: PhotoStorage | null = null;
  try {
    storage = getPhotoStorage(env);
    const payload = await request.json() as {
      dataBase64?: unknown;
      originalName?: unknown;
      mimeType?: unknown;
      sizeBytes?: unknown;
      title?: unknown;
      description?: unknown;
      era?: unknown;
      capturedAt?: unknown;
      uploaderCitizenId?: unknown;
      subjects?: unknown;
    };
    const title = cleanText(payload.title, 120);
    const description = cleanText(payload.description, 800);
    const era = cleanText(payload.era, 80);
    const capturedAt = cleanText(payload.capturedAt, 24);
    const uploaderCitizenId = standaloneMember(request, env) || cleanText(payload.uploaderCitizenId, 40);
    const originalName = cleanText(payload.originalName, 180);
    const mimeType = cleanText(payload.mimeType, 80);
    const subjects = normaliseSubjects(payload.subjects);
    const declaredSize = typeof payload.sizeBytes === "number" ? payload.sizeBytes : 0;

    if (typeof payload.dataBase64 !== "string" || !payload.dataBase64) {
      return Response.json({ error: "请选择一张照片。" }, { status: 400 });
    }
    if (!title) {
      return Response.json({ error: "请填写照片标题。" }, { status: 400 });
    }
    if (!subjects.length) {
      return Response.json({ error: "请至少选择一个人物标志或“天命全体照”。" }, { status: 400 });
    }
    const extension = ALLOWED_TYPES.get(mimeType);
    if (!extension) {
      return Response.json({ error: "仅支持 JPG、PNG、WEBP 或 GIF 图片。" }, { status: 415 });
    }
    if (declaredSize <= 0 || declaredSize > MAX_FILE_BYTES || payload.dataBase64.length > 16_800_000) {
      return Response.json({ error: "单张照片须小于 12 MB。" }, { status: 413 });
    }

    let bytes: Uint8Array;
    try {
      const binary = atob(payload.dataBase64);
      bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    } catch {
      return Response.json({ error: "照片内容无法读取，请重新选择文件。" }, { status: 400 });
    }
    if (bytes.byteLength !== declaredSize || bytes.byteLength > MAX_FILE_BYTES) {
      return Response.json({ error: "照片大小校验失败，请重新选择文件。" }, { status: 400 });
    }

    await ensurePhotoSchema();
    const id = crypto.randomUUID();
    objectKey = `family-archive/${id}.${extension}`;
    await storage.put(objectKey, bytes, mimeType, originalName);

    const [row] = await getDb()
      .insert(archivePhotos)
      .values({
        id,
        objectKey,
        originalName,
        title,
        description,
        era,
        capturedAt,
        subjectsJson: JSON.stringify(subjects),
        subjectKey: subjects.join("+"),
        uploaderCitizenId: SUBJECT_IDS.has(uploaderCitizenId) ? uploaderCitizenId : "amberina",
        mimeType,
        sizeBytes: bytes.byteLength,
      })
      .returning();

    return Response.json({ photo: publicPhoto(row) }, { status: 201 });
  } catch (error) {
    if (objectKey) await storage?.delete(objectKey).catch(() => undefined);
    return Response.json(
      { error: error instanceof Error ? error.message : "照片上传失败，请稍后重试。" },
      { status: error instanceof PhotoStorageError ? error.status : 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const storage = getPhotoStorage(env);
    await ensurePhotoSchema();
    const id = new URL(request.url).searchParams.get("id")?.trim();
    if (!id) return Response.json({ error: "缺少照片编号。" }, { status: 400 });
    const [row] = await getDb().select().from(archivePhotos).where(eq(archivePhotos.id, id)).limit(1);
    if (!row) return Response.json({ error: "找不到这张照片。" }, { status: 404 });
    await storage.delete(row.objectKey);
    await getDb().delete(archivePhotos).where(eq(archivePhotos.id, id));
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "无法删除照片。" },
      { status: error instanceof PhotoStorageError ? error.status : 500 },
    );
  }
}
