export class PhotoStorageError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "PhotoStorageError";
    this.status = status;
  }
}

type PhotoObject = { body: BodyInit | null; contentType?: string | null };
export type PhotoStorage = {
  put(key: string, bytes: Uint8Array, mimeType: string, originalName: string): Promise<void>;
  get(key: string): Promise<PhotoObject | null>;
  delete(key: string): Promise<void>;
};
type StorageConfig = {
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_STORAGE_BUCKET?: string;
  BUCKET?: {
    put(key: string, bytes: Uint8Array, options: object): Promise<unknown>;
    get(key: string): Promise<{ body: BodyInit; httpMetadata?: { contentType?: string } } | null>;
    delete(key: string): Promise<unknown>;
  };
};

function objectPath(key: string) {
  const parts = key.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) {
    throw new PhotoStorageError("照片文件路径无效。", 400);
  }
  return parts.map(encodeURIComponent).join("/");
}

async function isMissing(response: Response) {
  if (response.status === 404) return true;
  if (response.status !== 400) return false;
  // Storage can encode a missing object as HTTP 400 with statusCode 404.
  const detail = await response.json().catch(() => null) as { statusCode?: string | number } | null;
  return String(detail?.statusCode) === "404";
}

/** Server-only adapter. Private photo URLs and storage credentials never reach the client. */
export function getPhotoStorage(environment: object, fetcher: typeof fetch = fetch): PhotoStorage {
  const config = environment as StorageConfig;
  const urlValue = config.SUPABASE_URL?.trim();
  const key = (config.SUPABASE_SECRET_KEY || config.SUPABASE_SERVICE_ROLE_KEY)?.trim();
  if (!urlValue && !key && config.BUCKET) {
    const bucket = config.BUCKET;
    // Keep the original hosted Site compatible with its existing R2 binding.
    return {
      async put(path, bytes, mimeType, originalName) {
        await bucket.put(path, bytes, { httpMetadata: { contentType: mimeType }, customMetadata: { originalName } });
      },
      async get(path) {
        const object = await bucket.get(path);
        return object ? { body: object.body, contentType: object.httpMetadata?.contentType } : null;
      },
      async delete(path) { await bucket.delete(path); },
    };
  }
  if (!urlValue || !key) {
    throw new PhotoStorageError("照片存储尚未配置，请在 Cloudflare 设置 SUPABASE_URL 和 SUPABASE_SECRET_KEY。", 503);
  }
  let base: URL;
  try { base = new URL(urlValue); } catch {
    throw new PhotoStorageError("照片存储地址无效，请检查 SUPABASE_URL。", 503);
  }
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash || base.pathname !== "/") {
    throw new PhotoStorageError("SUPABASE_URL 须填写项目的 HTTPS 根地址。", 503);
  }
  if (!key.startsWith("sb_secret_") && !key.startsWith("eyJ")) {
    throw new PhotoStorageError("照片存储需要服务端 Secret key，请检查 SUPABASE_SECRET_KEY。", 503);
  }
  const bucket = config.SUPABASE_STORAGE_BUCKET?.trim() || "schicksal-photos";
  const bucketPath = encodeURIComponent(bucket);
  const headers = new Headers({ apikey: key });
  // New sb_secret keys belong only in apikey. Legacy service_role keys are JWTs.
  if (key.startsWith("eyJ")) headers.set("Authorization", `Bearer ${key}`);

  async function request(path: string, init: RequestInit = {}) {
    const requestHeaders = new Headers(headers);
    new Headers(init.headers).forEach((value, name) => requestHeaders.set(name, value));
    try {
      return await fetcher(new URL(`/storage/v1/${path}`, base).toString(), {
        ...init, headers: requestHeaders, redirect: "error", signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw new PhotoStorageError("照片存储暂时无法连接，请稍后重试。");
    }
  }
  function failed(status: number): never {
    // Never return provider response bodies, request headers or secrets to visitors.
    throw new PhotoStorageError(`照片存储请求失败（${status}），请检查私密存储桶和服务端密钥。`);
  }

  return {
    async put(path, bytes, mimeType) {
      const response = await request(`object/${bucketPath}/${objectPath(path)}`, {
        method: "POST", headers: { "Content-Type": mimeType, "x-upsert": "false" }, body: bytes.slice().buffer,
      });
      if (!response.ok) failed(response.status);
      await response.body?.cancel();
    },
    async get(path) {
      const response = await request(`object/authenticated/${bucketPath}/${objectPath(path)}`);
      if (!response.ok) {
        if (await isMissing(response)) return null;
        failed(response.status);
      }
      return { body: response.body, contentType: response.headers.get("Content-Type") };
    },
    async delete(path) {
      objectPath(path);
      const response = await request(`object/${bucketPath}`, {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: [path] }),
      });
      if (!response.ok) {
        if (await isMissing(response)) return;
        failed(response.status);
      }
      await response.body?.cancel();
    },
  };
}
