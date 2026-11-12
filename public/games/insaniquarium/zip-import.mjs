import { assetPath, prepareAssets } from "./file-bridge.mjs";

class ResourceZipError extends Error {}

export async function prepareZip(file) {
  if (!file || file.size > 128 * 1024 * 1024) throw new Error("ZIP 文件过大，请选择原版游戏压缩包或解压后的游戏文件夹。");
  const { unzipSync } = await import("./vendor/fflate.mjs");
  const compressed = new Uint8Array(await file.arrayBuffer());
  let entries = 0, selected = 0, total = 0;
  const seen = new Set();
  let extracted;
  try {
    extracted = unzipSync(compressed, { filter(entry) {
      if (++entries > 8192) throw new ResourceZipError("ZIP 内文件过多，请选择原版游戏压缩包。");
      const path = assetPath(entry.name);
      if (!path) return false;
      if (seen.has(path.toLowerCase())) throw new ResourceZipError("ZIP 内有重复的游戏资源，请重新选择完整游戏文件夹。");
      seen.add(path.toLowerCase());
      total += entry.originalSize;
      // Check declared sizes before the decoder allocates output buffers.
      if (total > 64 * 1024 * 1024 || ++selected > 4096) throw new ResourceZipError("游戏资源过大，请选择原版游戏压缩包。");
      return true;
    } });
  } catch (error) {
    if (error instanceof ResourceZipError) throw error;
    throw new Error("无法读取这个 ZIP。请确认文件完整，或解压后选择游戏文件夹。");
  }
  return prepareAssets(Object.entries(extracted).map(([path, bytes]) => ({
    webkitRelativePath: path, size: bytes.byteLength,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  })));
}
