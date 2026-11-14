import { env } from 'cloudflare:workers';
import { getPhotoStorage } from '../../../photo-storage';
import { access, reply, failure, readBytes, readJson, MusicError, revision, recordId, scoreExists, conflict, PRIVATE_HEADERS } from '../../../club/cello/music-server';
type AssetRow = {
    id: string;
    objectKey: string;
    mime: string;
    size: number;
    name: string;
    scoreId: string;
};
const columns = 'a.id,a.object_key AS objectKey,a.mime,a.size,a.original_name AS name,a.score_id AS scoreId';
/** Retain failed deletions as inaccessible tombstones, retry at the next media edit. */
export async function cleanup() { try {
    const rows = (await env.DB.prepare(`SELECT ${columns} FROM emerald_music_assets a JOIN emerald_music_scores s ON a.score_id=s.id WHERE a.deleted_at IS NOT NULL OR s.deleted_at IS NOT NULL LIMIT 8`).all<AssetRow>()).results;
    if (!rows.length)
        return;
    const storage = getPhotoStorage(env);
    for (const row of rows) {
        try {
            await storage.delete(row.objectKey);
            await env.DB.prepare('DELETE FROM emerald_music_assets WHERE id=?').bind(row.id).run();
        }
        catch { /* Tombstone retains the key for a later safe retry. */ }
    }
}
catch { /* A cleanup outage must never expose deleted assets. */ } }
function sniff(bytes: Uint8Array) {
    const s = new TextDecoder('latin1').decode(bytes.slice(0, 16));
    if (bytes[0] === 137 && s.slice(1, 4) === 'PNG' && bytes[4] === 13 && bytes[5] === 10)
        return 'image/png';
    if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
        return 'image/jpeg';
    if (s.startsWith('RIFF') && s.slice(8, 12) === 'WEBP')
        return 'image/webp';
    if (s.startsWith('RIFF') && s.slice(8, 12) === 'WAVE')
        return 'audio/wav';
    if (s.startsWith('ID3') || (bytes[0] === 255 && (bytes[1] & 224) === 224))
        return 'audio/mpeg';
    if (s.startsWith('OggS'))
        return 'audio/ogg';
    if (s.slice(4, 8) === 'ftyp')
        return 'audio/mp4';
    return null;
}
export async function GET(request: Request) {
    try {
        await access(request);
        const id = recordId(new URL(request.url).searchParams.get('id'));
        const row = await env.DB.prepare(`SELECT ${columns} FROM emerald_music_assets a JOIN emerald_music_scores s ON s.id=a.score_id WHERE a.id=? AND a.deleted_at IS NULL AND s.deleted_at IS NULL`).bind(id).first<AssetRow>();
        if (!row)
            throw new MusicError('这页乐谱或录音已移除。', 404);
        const object = await getPhotoStorage(env).get(row.objectKey);
        if (!object)
            throw new MusicError('文件暂时无法读取。', 404);
        const headers = { ...PRIVATE_HEADERS, 'Content-Type': row.mime, 'Content-Disposition': 'inline', 'Accept-Ranges': 'bytes' };
        const range = request.headers.get('range');
        if (!range)
            return new Response(object.body, { headers: { ...headers, 'Content-Length': String(row.size) } });
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match || (!match[1] && !match[2]))
            return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${row.size}` } });
        const start = match[1] ? Number(match[1]) : Math.max(0, row.size - Number(match[2]));
        const end = match[1] ? (match[2] ? Math.min(row.size - 1, Number(match[2])) : row.size - 1) : row.size - 1;
        if (start > end || start >= row.size)
            return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${row.size}` } });
        const bytes = await new Response(object.body).arrayBuffer();
        return new Response(bytes.slice(start, end + 1), { status: 206, headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${row.size}`, 'Content-Length': String(end - start + 1) } });
    }
    catch (e) {
        return failure(e);
    }
}
export async function POST(request: Request) {
    let newKey: string | null = null;
    try {
        const a = await access(request, true);
        if (!a.canEdit)
            throw new MusicError('此身份无权上传乐谱或录音。', 403);
        const raw = await readBytes(request, 8 * 1024 * 1024 + 32000);
        let form: FormData;
        try {
            form = await new Response(raw, { headers: { 'content-type': request.headers.get('content-type') || '' } }).formData();
        }
        catch {
            throw new MusicError('请选择有效文件。');
        }
        const scoreId = recordId(form.get('scoreId')), rev = revision(Number(form.get('revision'))), file = form.get('file');
        if (!(file instanceof File) || file.size < 16)
            throw new MusicError('请选择非空的乐谱图片或录音文件。');
        const bytes = new Uint8Array(await file.arrayBuffer()), mime = sniff(bytes);
        if (!mime)
            throw new MusicError('支持 PNG、JPEG、WebP 乐谱和 MP3、WAV、OGG、M4A 音频。');
        const kind = mime.startsWith('image/') ? 'image' : 'audio';
        if (file.size > (kind === 'image' ? 4 : 8) * 1024 * 1024)
            throw new MusicError(kind === 'image' ? '单页乐谱不超过 4 MB。' : '单份录音不超过 8 MB。', 413);
        const row = await scoreExists(scoreId);
        if (!row || row.revision !== rev)
            conflict();
        const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM emerald_music_assets WHERE score_id=? AND kind=? AND deleted_at IS NULL').bind(scoreId, kind).first<{
            n: number;
        }>();
        if ((n?.n || 0) >= (kind === 'image' ? 6 : 1))
            throw new MusicError(kind === 'image' ? '每份乐谱最多六页图片。' : '请先移除已有录音，再上传新录音。');
        const id = crypto.randomUUID(), token = crypto.randomUUID(), now = new Date().toISOString(), name = file.name.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 180) || '乐谱文件';
        newKey = `cello/zxy/${scoreId}/${id}`;
        const storage = getPhotoStorage(env);
        await storage.put(newKey, bytes, mime, name);
        const result = await env.DB.batch([
            env.DB.prepare('UPDATE emerald_music_scores SET revision=revision+1,write_token=?,updated_at=? WHERE id=? AND revision=? AND deleted_at IS NULL AND (SELECT COUNT(*) FROM emerald_music_assets WHERE score_id=? AND kind=? AND deleted_at IS NULL)<?').bind(token, now, scoreId, rev, scoreId, kind, kind === 'image' ? 6 : 1),
            env.DB.prepare('INSERT INTO emerald_music_assets(id,score_id,kind,object_key,original_name,mime,size,created_at) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM emerald_music_scores WHERE id=? AND revision=? AND write_token=? AND deleted_at IS NULL)').bind(id, scoreId, kind, newKey, name, mime, file.size, now, scoreId, rev + 1, token)
        ]);
        if (!result[0].meta.changes) {
            await storage.delete(newKey);
            newKey = null;
            conflict();
        }
        newKey = null;
        await cleanup();
        return reply({ id, revision: rev + 1 }, 201);
    }
    catch (e) {
        if (newKey) {
            try {
                const committed = await env.DB.prepare('SELECT id FROM emerald_music_assets WHERE object_key=?').bind(newKey).first();
                if (!committed)
                    await getPhotoStorage(env).delete(newKey);
            }
            catch { /* Preserve bytes on an ambiguous database response; never delete a possibly committed attachment. */ }
        }
        return failure(e);
    }
}
export async function DELETE(request: Request) {
    try {
        const a = await access(request, true);
        if (!a.canEdit)
            throw new MusicError('此身份无权整理文件。', 403);
        const b = await readJson(request), id = recordId(b?.id), rev = revision(b?.revision);
        const row = await env.DB.prepare(`SELECT ${columns} FROM emerald_music_assets a JOIN emerald_music_scores s ON s.id=a.score_id WHERE a.id=? AND a.deleted_at IS NULL AND s.deleted_at IS NULL`).bind(id).first<AssetRow>();
        if (!row)
            throw new MusicError('文件已移除。', 404);
        const token = crypto.randomUUID(), now = new Date().toISOString();
        const result = await env.DB.batch([
            env.DB.prepare('UPDATE emerald_music_scores SET revision=revision+1,write_token=?,updated_at=? WHERE id=? AND revision=? AND deleted_at IS NULL').bind(token, now, row.scoreId, rev),
            env.DB.prepare('UPDATE emerald_music_assets SET deleted_at=? WHERE id=? AND EXISTS(SELECT 1 FROM emerald_music_scores WHERE id=? AND revision=? AND write_token=?)').bind(now, id, row.scoreId, rev + 1, token)
        ]);
        if (!result[0].meta.changes)
            conflict();
        await cleanup();
        return reply({ revision: rev + 1 });
    }
    catch (e) {
        return failure(e);
    }
}
