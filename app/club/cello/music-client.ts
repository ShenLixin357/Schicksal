import type { MusicLibrary } from './music-model';
export async function musicRequest<T = Record<string, unknown>>(member: string, path = '', method = 'GET', body?: unknown): Promise<T> {
    const form = body instanceof FormData;
    const headers: Record<string, string> = { 'x-schicksal-member': member };
    if (body && !form)
        headers['Content-Type'] = 'application/json';
    const response = await fetch(`/api/emerald-music${path}`, { method, credentials: 'same-origin', headers, body: body ? (form ? body : JSON.stringify(body)) : undefined, cache: 'no-store', signal: AbortSignal.timeout(30000) });
    const result = await response.json().catch(() => ({ error: '响应中断，请保留编辑内容后重试。' }));
    if (!response.ok) {
        const message = result && typeof result === 'object' && 'error' in result && typeof result.error === 'string' ? result.error : '暂时无法保存，请稍后重试。';
        throw new Error(message);
    }
    return result as T;
}
export const readLibrary = (member: string, before?: string) => musicRequest<MusicLibrary>(member, before ? `?before=${encodeURIComponent(before)}` : '');
export const mediaUrl = (id: string) => `/api/emerald-music/media?id=${encodeURIComponent(id)}`;
