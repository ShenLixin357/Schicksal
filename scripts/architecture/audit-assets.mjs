#!/usr/bin/env node
/** Read-only asset inventory. It NEVER deletes or edits approved scene art. */
import { readdirSync, statSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, relative, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const roots = ["public", "app/assets"];
const extensions = new Set([".png",".jpg",".jpeg",".webp",".gif",".svg",".avif",".mp3",".ogg",".wav",".glb",".gltf",".fbx"]);
const byHash = new Map();
const inventory = [];
function visit(location) {
  let entries;
  try { entries = readdirSync(location, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const path = join(location, entry.name);
    if (entry.isDirectory()) { visit(path); continue; }
    if (!entry.isFile()) continue;
    const ext = entry.name.slice(entry.name.lastIndexOf(".")).toLowerCase();
    if (!extensions.has(ext)) continue;
    const bytes = statSync(path).size;
    const hash = createHash("sha256").update(readFileSync(path)).digest("hex");
    const name = relative(root, path).replaceAll("\\","/");
    const record = { name, bytes, hash };
    inventory.push(record);
    const same = byHash.get(hash) ?? [];
    same.push(record);
    byHash.set(hash,same);
  }
}
roots.forEach(name=>visit(join(root,name)));
const duplicates = [...byHash.values()].filter(items=>items.length>1);
const wastedBytes = duplicates.reduce((sum,group)=>sum+group.slice(1).reduce((n,item)=>n+item.bytes,0),0);
const largest = [...inventory].sort((a,b)=>b.bytes-a.bytes).slice(0,10).map(({name,bytes})=>({name,bytes}));
const report = {
  files: inventory.length,
  totalBytes: inventory.reduce((sum,item)=>sum+item.bytes,0),
  identicalDuplicateGroups: duplicates.map(group=>group.map(({name,bytes})=>({name,bytes}))),
  identicalRedundantBytes: wastedBytes,
  largest,
  note: "Read-only report. Near-duplicate scene variants are not treated as exact duplicates and must never be auto-deleted."
};
if (process.argv.includes("--json")) process.stdout.write(JSON.stringify(report,null,2)+"\n");
else {
  process.stdout.write(`Assets: ${report.files} files, ${(report.totalBytes/1048576).toFixed(1)} MiB; identical duplicates: ${duplicates.length} groups, redundant ${(wastedBytes/1048576).toFixed(1)} MiB.\n`);
  for (const {name,bytes} of largest) process.stdout.write(`  ${(bytes/1048576).toFixed(2)} MiB  ${name}\n`);
  for (const group of report.identicalDuplicateGroups) process.stdout.write("  Duplicate content: "+group.map(x=>x.name).join(" = ")+"\n");
}
