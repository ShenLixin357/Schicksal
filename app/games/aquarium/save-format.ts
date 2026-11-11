// The payload contains the original engine's bytes, never reconstructed fish data.
export const MAX_SAVE_BYTES = 512_000;
export const MAX_REQUEST_BYTES = 800_000;
export type OriginalSave = {
  version: 1;
  format: "winfish-1.1";
  files: { path: string; data: string }[];
};

export function validSavePath(path: string): boolean {
  return path.length > 0 && path.length <= 160 &&
    path.split("/").every(part => /^[A-Za-z0-9 _.-]+$/.test(part) && part !== "." && part !== "..") &&
    /\.(dat|json|sav|xml)$/i.test(path);
}

export function validateOriginalSave(value: unknown): value is OriginalSave {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const save = value as OriginalSave;
  if (save.version !== 1 || save.format !== "winfish-1.1" || !Array.isArray(save.files) || save.files.length > 128) return false;
  const seen = new Set<string>();
  let bytes = 0;
  for (const file of save.files) {
    if (!file || typeof file.path !== "string" || !validSavePath(file.path) || seen.has(file.path.toLowerCase()) || typeof file.data !== "string") return false;
    if (file.data.length > 4 * Math.ceil(MAX_SAVE_BYTES / 3) || file.data.length % 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.data)) return false;
    const decoded = atob(file.data);
    if (btoa(decoded) !== file.data) return false;
    bytes += decoded.length;
    if (bytes > MAX_SAVE_BYTES) return false;
    seen.add(file.path.toLowerCase());
  }
  return true;
}
