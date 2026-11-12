import { prepareZip } from "./zip-import.mjs";

const MAX_BYTES = 64 * 1024 * 1024;
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
export async function sha256(bytes) { return hex(await crypto.subtle.digest("SHA-256", bytes)); }

function checkResponse(response) {
  if ([401, 403].includes(response.status) || response.ok && response.headers.get("content-type")?.includes("text/html"))
    throw new Error("登录已失效，请重新登录天命网站。");
  if (!response.ok) throw new Error("游戏文件暂时未能加载，请点击重新加载。");
}

function validManifest(m) {
  return m?.version === 1 && /^[a-f0-9]{64}$/.test(m.sha256) &&
    Array.isArray(m.parts) && m.parts.length > 0 && m.parts.length <= 32 &&
    m.parts.every((p, i) => p?.file === `resources-${m.sha256.slice(0, 16)}-${i}.bin` && Number.isSafeInteger(p.bytes) && p.bytes > 0 && p.bytes <= 2 * 1024 * 1024) &&
    m.parts.reduce((sum, p) => sum + p.bytes, 0) === m.bytes &&
    Number.isSafeInteger(m.bytes) && m.bytes > 0 && m.bytes <= MAX_BYTES &&
    Number.isSafeInteger(m.files) && m.files > 0 && m.files <= 4096 &&
    Number.isSafeInteger(m.uncompressedBytes) && m.uncompressedBytes > 0 && m.uncompressedBytes <= MAX_BYTES;
}

export async function loadHostedAssets({
  fetcher = (...args) => globalThis.fetch(...args), baseURL = new URL("./resources/", import.meta.url),
  readCache = async () => null, writeCache = async () => {}, onProgress = () => {},
} = {}) {
  onProgress("正在加载游戏文件…");
  const response = await fetcher(new URL("manifest.json", baseURL), { credentials: "same-origin", cache: "no-store" });
  checkResponse(response);
  let manifest;
  try { manifest = await response.json(); } catch { throw new Error("游戏文件信息暂时未能加载，请点击重新加载。"); }
  if (!validManifest(manifest)) throw new Error("游戏文件信息暂时未能加载，请点击重新加载。");
  const matches = async bytes => bytes instanceof Uint8Array && bytes.byteLength === manifest.bytes && await sha256(bytes) === manifest.sha256;
  let archive;
  try { archive = await readCache(manifest.sha256); } catch { /* Download works without persistent browser storage. */ }
  if (!await matches(archive)) {
    const parts = await Promise.all(manifest.parts.map(async part => {
      const pack = await fetcher(new URL(part.file, baseURL), { credentials: "same-origin", cache: "no-cache" });
      checkResponse(pack);
      const bytes = new Uint8Array(await pack.arrayBuffer());
      if (bytes.byteLength !== part.bytes) throw new Error("游戏文件未完整加载，请点击重新加载。");
      return bytes;
    }));
    archive = new Uint8Array(manifest.bytes);
    let offset = 0;
    for (const part of parts) { archive.set(part, offset); offset += part.byteLength; }
    if (!await matches(archive)) throw new Error("游戏文件未完整加载，请点击重新加载。");
    try { await writeCache(manifest.sha256, archive); } catch { /* The current game can still run from memory. */ }
  }
  let files;
  try { files = await prepareZip(new Blob([archive])); }
  catch { throw new Error("游戏文件暂时无法读取，请点击重新加载。"); }
  if (files.length !== manifest.files || files.reduce((sum, f) => sum + f.bytes.byteLength, 0) !== manifest.uncompressedBytes)
    throw new Error("游戏文件不完整，请点击重新加载。");
  onProgress("游戏已就绪，点击开始游戏即可。");
  return files;
}
