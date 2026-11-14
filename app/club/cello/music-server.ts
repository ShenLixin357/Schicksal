import { env } from 'cloudflare:workers';
import { currentMember, sameOrigin } from '../../member-session';
import { ROOM_MEMBERS } from './music-model';
export const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store', Vary: 'Cookie', 'X-Content-Type-Options': 'nosniff' };
export const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: PRIVATE_HEADERS });
export class MusicError extends Error {
    status: number;
    constructor(message: string, status = 400) { super(message); this.status = status; }
}
export async function access(request: Request, mutation = false) {
    if (mutation && !sameOrigin(request))
        throw new MusicError('请从天命网站内操作。', 403);
    const member = await currentMember(request);
    if (!member)
        throw new MusicError('请先登录天命成员身份。', 401);
    if (!(ROOM_MEMBERS as readonly string[]).includes(member))
        throw new MusicError('这间休息室尚未向此身份开放。', 403);
    if (mutation && request.headers.get('x-schicksal-member') !== member)
        throw new MusicError('登录身份已改变，请重新打开乐谱册。', 409);
    const owner = member === 'zxy' || member === 'amberina';
    const grant = owner ? null : await env.DB.prepare('SELECT citizen_id FROM emerald_music_editors WHERE citizen_id=?').bind(member).first();
    return { member, canEdit: owner || !!grant, canManage: owner || !!grant, canAuthorize: owner };
}
export async function readBytes(request: Request, max: number) {
    if (Number(request.headers.get('content-length')) > max)
        throw new MusicError('文件或内容超出本次大小限制。', 413);
    const reader = request.body?.getReader();
    if (!reader)
        throw new MusicError('缺少内容。');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
        const { value, done } = await reader.read();
        if (done)
            break;
        size += value.length;
        if (size > max) {
            await reader.cancel();
            throw new MusicError('文件或内容超出本次大小限制。', 413);
        }
        chunks.push(value);
    }
    const result = new Uint8Array(size);
    let p = 0;
    for (const c of chunks) {
        result.set(c, p);
        p += c.length;
    }
    return result;
}
export async function readJson(request: Request) { try {
    return JSON.parse(new TextDecoder().decode(await readBytes(request, 30000)));
}
catch (e) {
    if (e instanceof MusicError)
        throw e;
    throw new MusicError('内容格式不正确。');
} }
export function failure(error: unknown) { return error instanceof MusicError ? reply({ error: error.message }, error.status) : reply({ error: '音乐收藏暂时无法连接，请保留编辑内容后重试。' }, 503); }
export function revision(value: unknown) { if (!Number.isSafeInteger(value) || Number(value) < 1)
    throw new MusicError('缺少有效的乐谱版本。'); return Number(value); }
export function recordId(value: unknown): string { if (typeof value !== 'string' || !/^[a-f0-9-]{36}$/i.test(value))
    throw new MusicError('记录编号无效。'); return value; }
export async function scoreExists(id: string) { return env.DB.prepare('SELECT id,revision FROM emerald_music_scores WHERE id=? AND deleted_at IS NULL').bind(id).first<{
    id: string;
    revision: number;
}>(); }
export function conflict() { throw new MusicError('另一台设备已更新这份乐谱。请保留本页内容，重新读取后再编辑。', 409); }
