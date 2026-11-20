#!/usr/bin/env node
/** Read-only asset inventory: covers ALL public payloads, not just image/media.
 * Never deletes original art, preserved game assets or historical variants.
 * Hash in bounded buffers so large .tar.gz/.wasm resources do not inflate RAM.
 */
import { readdirSync, statSync, openSync, readSync, closeSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, relative, join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const roots = ["public", "app/assets"];
const artExtensions = new Set([".png",".jpg",".jpeg",".webp",".gif",".svg",".avif",".mp3",".ogg",".wav",".glb",".gltf",".fbx"]);
const byHash = new Map();
const inventory = [];

function boundedSha256(path) {
  const fd = openSync(path, "r");
  const hasher = createHash("sha256");
  const buffer = Buffer.allocUnsafe(256 * 1024);
  try {
    let count;
    while ((count = readSync(fd, buffer, 0, buffer.length, null)) > 0)
      hasher.update(buffer.subarray(0, count));
    return hasher.digest("hex");
  } finally {
    closeSync(fd);
  }
}
function visit(location, publicRoot) {
  let entries;
  try { entries = readdirSync(location, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const path = join(location, entry.name);
    if (entry.isDirectory()) { visit(path, publicRoot); continue; }
    if (!entry.isFile()) continue;
    const extension = extname(entry.name).toLowerCase() || "(none)";
    // The complete public/ tree consumes hosting/storage budget, including
    // archives, WASM, game binaries, HTML, JSON and game scripts.
    if (!publicRoot && !artExtensions.has(extension)) continue;
    const bytes = statSync(path).size;
    const hash = boundedSha256(path);
    const name = relative(root, path).replaceAll("\\", "/");
    const record = { name, bytes, hash, extension };
    inventory.push(record);
    const same = byHash.get(hash) ?? [];
    same.push(record);
    byHash.set(hash, same);
  }
}
for (const name of roots) visit(join(root, name), name === "public");
const duplicates = [...byHash.values()].filter(group => group.length > 1);
const wastedBytes = duplicates.reduce((sum, group) =>
  sum + group.slice(1).reduce((n, item) => n + item.bytes, 0), 0);
const largest = [...inventory].sort((a,b) => b.bytes - a.bytes).slice(0, 15)
  .map(({name,bytes}) => ({ name, bytes }));
const extensions = Object.fromEntries(
  [...new Set(inventory.map(x => x.extension))].sort().map(ext => [
    ext,
    { files: inventory.filter(x=>x.extension===ext).length,
      bytes: inventory.filter(x=>x.extension===ext).reduce((n,x)=>n+x.bytes,0) },
  ]),
);
const publicRecords = inventory.filter(x => x.name.startsWith("public/"));
const report = {
  files: inventory.length,
  totalBytes: inventory.reduce((sum, item) => sum + item.bytes, 0),
  publicFiles: publicRecords.length,
  publicBytes: publicRecords.reduce((sum, item) => sum + item.bytes, 0),
  identicalDuplicateGroups: duplicates.map(group => group.map(({name,bytes}) => ({name,bytes}))),
  identicalRedundantBytes: wastedBytes,
  byExtension: extensions,
  largest,
  largePublicAssets: [...publicRecords].filter(x => x.bytes >= 2 * 1048576)
    .sort((a,b) => b.bytes - a.bytes).map(({name,bytes}) => ({name,bytes})),
  note: "Read-only. Exact duplicates, older artistic variants, bundled game engines and publicly served source archives are review candidates, NEVER automatic deletion targets. Repository size is not the same as first-load network traffic or runtime RAM.",
};
if (process.argv.includes("--json")) process.stdout.write(JSON.stringify(report,null,2)+"\n");
else {
  process.stdout.write(`Public assets: ${report.publicFiles} files, ${(report.publicBytes/1048576).toFixed(1)} MiB; audited total ${(report.totalBytes/1048576).toFixed(1)} MiB; exact duplicate payload ${(wastedBytes/1048576).toFixed(1)} MiB.\n`);
  for (const {name,bytes} of largest)
    process.stdout.write(`  ${(bytes/1048576).toFixed(2)} MiB  ${name}\n`);
  for (const group of report.identicalDuplicateGroups)
    process.stdout.write("  Duplicate bytes (review only): " + group.map(x=>x.name).join(" = ") + "\n");
}
