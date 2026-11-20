export class ApiError extends Error {
    constructor(message: string, readonly status: number) { super(message); }
}
/** Bound streamed bytes even when Content-Length is missing or forged. */
export async function readJson<T extends object = Record<string, unknown>>(request: Request, maxBytes: number): Promise<T> {
    const declared = Number(request.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > maxBytes)
        throw new ApiError("内容超出本次大小限制。", 413);
    const reader = request.body?.getReader();
    if (!reader)
        throw new ApiError("请求内容不能为空。", 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            size += value.byteLength;
            if (size > maxBytes) {
                await reader.cancel();
                throw new ApiError("内容超出本次大小限制。", 413);
            }
            chunks.push(value);
        }
    }
    finally {
        reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    try {
        const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
        if (!value || typeof value !== "object" || Array.isArray(value))
            throw new Error("object required");
        return value as T;
    }
    catch {
        throw new ApiError("请求内容格式不正确。", 400);
    }
}
export function apiFailure(error: unknown, message: string) {
    return Response.json({ error: error instanceof ApiError ? error.message : message }, {
        status: error instanceof ApiError ? error.status : 500,
        headers: { "Cache-Control": "private, no-store" },
    });
}
