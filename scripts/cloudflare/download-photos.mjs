import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { readPrivateJson } from "./input.mjs";

// Auth is supplied once through hidden stdin, never through arguments or files.
const { siteUrl, bearer, photos, directory } = await readPrivateJson();
const origin = new URL(siteUrl).origin;
const output = resolve(directory), manifestFile = resolve(output, "manifest.json");
const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
for (const row of photos) {
  if (!/^family-archive\/[a-zA-Z0-9-]+\.(jpg|png|webp|gif)$/.test(row.object_key)) throw new Error("Unexpected photo object key");
  const url = new URL("/api/photos/image", origin); url.searchParams.set("id", row.id);
  const response = await fetch(url, { redirect: "error", headers: bearer ? { "OAI-Sites-Authorization": `Bearer ${bearer}` } : {} });
  if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error(`Photo download did not return an image (${response.status})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length !== row.size_bytes) throw new Error("Photo byte count differs from the source database");
  const file = resolve(output, "objects", row.object_key); await mkdir(dirname(file), { recursive: true }); await writeFile(file, bytes, { mode: 0o600 });
  const entry = { objectKey: row.object_key, sizeBytes: bytes.length, mimeType: row.mime_type, originalName: row.original_name, sha256: createHash("sha256").update(bytes).digest("hex") };
  manifest.photos = [...manifest.photos.filter((photo) => photo.objectKey !== row.object_key), entry];
}
await writeFile(manifestFile, JSON.stringify(manifest, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ downloaded: manifest.photos.length, byteCountsVerified: true }));
