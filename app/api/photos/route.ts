import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { ensurePhotoSchema } from "../../../db/photo-schema";
import { archivePhotos } from "../../../db/schema";
import { requireMember } from "../../../server/auth/member.ts";
import { readJson, apiFailure, ApiError } from "../../../server/http.ts";
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
    deletedAt: row.deletedAt,
    deletedByCitizenId: row.deletedByCitizenId,
    imageUrl: `/api/photos/image?id=${encodeURIComponent(row.id)}`,
  };
}

export async function GET(request: Request) {
  try {
    const member = await requireMember(request);
    await ensurePhotoSchema();
    const trash = new URL(request.url).searchParams.get("trash") === "1";
    if (trash && member !== "amberina") return Response.json({ error: "仅管理员可以查看回收站。" }, { status: 403 });
    const rows = await getDb()
      .select()
      .from(archivePhotos)
      .where(trash ? isNotNull(archivePhotos.deletedAt) : isNull(archivePhotos.deletedAt))
      .orderBy(desc(archivePhotos.createdAt), desc(archivePhotos.id))
      .limit(250);
    return Response.json({ photos: rows.map(publicPhoto) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiFailure(error, "影像馆暂时无法读取。");
  }
}

export async function POST(request: Request) {
  let objectKey = "";
  let storage: PhotoStorage | null = null;
  try {
    const uploaderCitizenId = await requireMember(request);
    storage = getPhotoStorage(env);
    const payload = await readJson<{
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
    }>(request, 17_000_000);
    const title = cleanText(payload.title, 120);
    const description = cleanText(payload.description, 800);
    const era = cleanText(payload.era, 80);
    const capturedAt = cleanText(payload.capturedAt, 24);
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
        uploaderCitizenId, // Authenticated session is authoritative; ignore client-supplied identity.
        mimeType,
        sizeBytes: bytes.byteLength,
      })
      .returning();

    return Response.json({ photo: publicPhoto(row) }, { status: 201 });
  } catch (error) {
    if (objectKey) await storage?.delete(objectKey).catch(() => undefined);
    return apiFailure(error instanceof PhotoStorageError ? new ApiError(error.message, error.status) : error, "照片上传失败，请稍后重试。");
  }
}

/** Every member may edit only their own active photos; the owner may edit all. */
export async function PATCH(request: Request) {
  try {
    const member = await requireMember(request);
    await ensurePhotoSchema();
    const id = new URL(request.url).searchParams.get("id")?.trim();
    if (!id) return Response.json({ error: "缺少照片编号。" }, { status: 400 });
    const [existing] = await getDb().select().from(archivePhotos).where(eq(archivePhotos.id, id)).limit(1);
    if (!existing || existing.deletedAt) return Response.json({ error: "照片不存在或已进入回收站。" }, { status: 404 });
    if (member !== "amberina" && member !== existing.uploaderCitizenId) return Response.json({ error: "只能编辑自己上传的照片。" }, { status: 403 });
    const payload = await readJson<{ title?: unknown; description?: unknown; era?: unknown; capturedAt?: unknown; subjects?: unknown }>(request, 4096);
    const changes: Partial<typeof archivePhotos.$inferInsert> = {};
    if ("title" in payload) {
      changes.title = cleanText(payload.title, 120);
      if (!changes.title) return Response.json({ error: "照片标题不能为空。" }, { status: 400 });
    }
    for (const [key, max] of [["description", 800], ["era", 80], ["capturedAt", 24]] as const) {
      if (key in payload) changes[key] = cleanText(payload[key], max);
    }
    if ("subjects" in payload) {
      const subjects = normaliseSubjects(payload.subjects);
      if (!subjects.length) return Response.json({ error: "请至少选择一个人物标志。" }, { status: 400 });
      changes.subjectsJson = JSON.stringify(subjects);
      changes.subjectKey = subjects.join("+");
    }
    if (!Object.keys(changes).length) return Response.json({ error: "没有可更新的字段。" }, { status: 400 });
    const [updated] = await getDb().update(archivePhotos).set(changes)
      .where(and(eq(archivePhotos.id, id), isNull(archivePhotos.deletedAt))).returning();
    if (!updated) return Response.json({ error: "照片状态已变化，请刷新。" }, { status: 409 });
    return Response.json({ photo: publicPhoto(updated) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiFailure(error, "无法编辑照片。"); }
}

/** Move to trash atomically in D1; NEVER delete bytes before a reversible step. */
export async function DELETE(request: Request) {
  try {
    const member = await requireMember(request);
    await ensurePhotoSchema();
    const id = new URL(request.url).searchParams.get("id")?.trim();
    if (!id) return Response.json({ error: "缺少照片编号。" }, { status: 400 });
    const [row] = await getDb().select().from(archivePhotos).where(eq(archivePhotos.id, id)).limit(1);
    if (!row) return Response.json({ error: "找不到这张照片。" }, { status: 404 });
    if (member !== "amberina" && member !== row.uploaderCitizenId) return Response.json({ error: "只能删除自己上传的照片。" }, { status: 403 });
    if (row.deletedAt) return Response.json({ deleted: true, alreadyInTrash: true });
    const [updated] = await getDb().update(archivePhotos)
      .set({ deletedAt: new Date().toISOString(), deletedByCitizenId: member })
      .where(and(eq(archivePhotos.id, id), isNull(archivePhotos.deletedAt))).returning();
    if (!updated) return Response.json({ error: "照片状态已变化，请刷新。" }, { status: 409 });
    return Response.json({ deleted: true, recoverable: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiFailure(error, "无法将照片移入回收站。"); }
}

/** Only the site owner can restore trashed photos; original storage key is untouched. */
export async function PUT(request: Request) {
  try {
    const member = await requireMember(request);
    if (member !== "amberina") return Response.json({ error: "仅管理员可以恢复照片。" }, { status: 403 });
    await ensurePhotoSchema();
    const id = new URL(request.url).searchParams.get("id")?.trim();
    if (!id) return Response.json({ error: "缺少照片编号。" }, { status: 400 });
    const [row] = await getDb().select().from(archivePhotos).where(eq(archivePhotos.id, id)).limit(1);
    if (!row) return Response.json({ error: "找不到这张照片。" }, { status: 404 });
    if (!row.deletedAt) return Response.json({ photo: publicPhoto(row), alreadyRestored: true });
    // Prevent restoring an orphaned metadata row if storage has been lost externally.
    const storage = getPhotoStorage(env);
    const object = await storage.get(row.objectKey);
    if (!object) return Response.json({ error: "原图缺失，请先从备份恢复文件。" }, { status: 409 });
    await object.body?.cancel?.();
    const [updated] = await getDb().update(archivePhotos)
      .set({ deletedAt: null, deletedByCitizenId: null })
      .where(and(eq(archivePhotos.id, id), isNotNull(archivePhotos.deletedAt))).returning();
    if (!updated) return Response.json({ error: "照片状态已变化，请刷新。" }, { status: 409 });
    return Response.json({ photo: publicPhoto(updated), restored: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiFailure(error instanceof PhotoStorageError ? new ApiError(error.message, error.status) : error, "无法恢复照片。"); }
}
