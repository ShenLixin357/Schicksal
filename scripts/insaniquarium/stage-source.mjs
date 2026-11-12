import { readFile, writeFile, copyFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const root = new URL("../../", import.meta.url);
const input = process.argv[2];
if (!input) throw new Error("Pass the matching prepared engine-source archive.");
const bytes = await readFile(resolve(input));
if (bytes.length > 25 * 1024 * 1024) throw new Error("Engine source archive exceeds the Cloudflare per-file asset limit.");
const destination = new URL("public/games/insaniquarium/source/insaniquarium-source.tar.gz", root);
await mkdir(new URL("./", destination), { recursive: true });
await copyFile(resolve(input), destination);
const manifestPath = new URL("public/games/insaniquarium/engine/build.json", root);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.sourceBundle = { path: "../source/insaniquarium-source.tar.gz", sha256: createHash("sha256").update(bytes).digest("hex") };
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log("[insaniquarium] matching source archive staged for members");
