export const MAX_SAVE_BYTES = 512_000;
export function validSavePath(path) {
  return typeof path === "string" && path.length > 0 && path.length <= 160 &&
    path.split("/").every(p => /^[A-Za-z0-9 _.-]+$/.test(p) && p !== "." && p !== "..") && /\.(dat|json|sav|xml)$/i.test(path);
}
export function encodeBytes(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
export function decodeBytes(data) { return Uint8Array.from(atob(data), c => c.charCodeAt(0)); }
export function validateSave(save) {
  if (save?.version !== 1 || save.format !== "winfish-1.1" || !Array.isArray(save.files) || save.files.length > 128) return false;
  let total = 0;
  const seen = new Set();
  try {
    for (const file of save.files) {
      if (!validSavePath(file.path) || seen.has(file.path.toLowerCase()) || typeof file.data !== "string" || file.data.length > 682668) return false;
      const bytes = decodeBytes(file.data);
      if (encodeBytes(bytes) !== file.data) return false;
      total += bytes.byteLength;
      if (total > MAX_SAVE_BYTES) return false;
      seen.add(file.path.toLowerCase());
    }
  } catch { return false; }
  return true;
}
export function collectSave(FS) {
  const files = [];
  let total = 0;
  function walk(dir, relative = "") {
    for (const name of FS.readdir(dir).filter(x => x !== "." && x !== "..").sort()) {
      const absolute = `${dir}/${name}`, path = relative ? `${relative}/${name}` : name;
      const stat = FS.stat(absolute);
      if (FS.isDir(stat.mode)) walk(absolute, path);
      else if (validSavePath(path)) {
        const bytes = FS.readFile(absolute);
        total += bytes.byteLength;
        if (total > MAX_SAVE_BYTES || files.length >= 128) throw new Error("存档超过大小限制，请保留原文件备份。");
        files.push({ path, data: encodeBytes(bytes) });
      }
    }
  }
  walk("/saves");
  return { version: 1, format: "winfish-1.1", files };
}
export function restoreSave(FS, save) {
  if (!validateSave(save)) throw new Error("存档格式不正确，未载入。");
  // Only called before main(); a running game must never see partial restoration.
  for (const file of save.files) {
    const target = `/saves/${file.path}`;
    FS.mkdirTree(target.slice(0, target.lastIndexOf("/")));
    FS.writeFile(target, decodeBytes(file.data));
  }
}
export function assetPath(relative) {
  const parts = relative.replaceAll("\\", "/").split("/");
  if (parts.some(x => x === "." || x === ".." || !x)) return null;
  const index = parts.findIndex(x => /^(data|properties|images|sounds|music|fishsongs)$/i.test(x));
  if (index < 0) return null;
  const path = parts.slice(index).join("/");
  if (!/\.(gif|jpe?g|png|bmp|tga|wav|ogg|mp3|mo3|mod|xm|it|s3m|xml|txt|dat|fnt|ttf|ini)$/i.test(path)) return null;
  return path;
}
export async function prepareAssets(fileList) {
  const files = [], seen = new Set();
  let total = 0;
  for (const file of fileList) {
    const path = assetPath(file.webkitRelativePath || file.name);
    if (!path || seen.has(path.toLowerCase())) continue;
    total += file.size;
    if (total > 64 * 1024 * 1024 || files.length >= 4096) throw new Error("游戏文件过多，请选择原版游戏目录。");
    files.push({ path, bytes: new Uint8Array(await file.arrayBuffer()) });
    seen.add(path.toLowerCase());
  }
  if (!seen.has("properties/resources.xml")) throw new Error("没有找到 properties/resources.xml，请选择完整游戏文件夹。");
  if (!files.some(f => /^images\//i.test(f.path))) throw new Error("没有找到原版 images 图片目录，请选择已安装的游戏目录。");
  return files;
}
export function installAssets(FS, files) {
  // Windows retail paths are case insensitive. Resolve a matching entry only
  // after the normal MEMFS lookup fails, including resource alpha-mask names.
  const lookupNode = FS.lookupNode.bind(FS);
  FS.lookupNode = (parent, name) => {
    try { return lookupNode(parent, name); }
    catch (error) {
      const alias = Object.keys(parent.contents || {}).find(k => k.toLowerCase() === name.toLowerCase());
      if (alias !== undefined) return lookupNode(parent, alias);
      throw error;
    }
  };
  for (const file of files) {
    if (assetPath(file.path) !== file.path || !(file.bytes instanceof Uint8Array)) throw new Error("游戏资源缓存无效，请重新选择文件夹。");
    const target = `/${file.path}`;
    FS.mkdirTree(target.slice(0, target.lastIndexOf("/")));
    FS.writeFile(target, file.bytes);
  }
}
