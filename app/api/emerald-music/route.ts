import { env } from 'cloudflare:workers';
import { access, reply, failure, readJson, MusicError, revision, recordId, conflict } from '../../club/cello/music-server';
import { cleanText, validNotes, validTempo } from '../../club/cello/music-model';
import type { Melody, Score, MusicAsset } from '../../club/cello/music-model';
type ScoreRow = {
    id: string;
    title: string;
    composer: string;
    content: string;
    privateNote: string;
    revision: number;
    updatedAt: string;
};
type MelodyRow = {
    id: string;
    creatorId: string;
    notesJson: string;
    tempo: number;
    message: string;
    createdAt: string;
};
const melody = (r: MelodyRow): Melody => ({ ...r, notes: JSON.parse(r.notesJson), notesJson: undefined } as unknown as Melody);
function scoreInput(b: Record<string, unknown>) { if (!cleanText(b.title, 160, true) || !cleanText(b.composer, 160) || !cleanText(b.content, 12000) || !cleanText(b.privateNote, 6000))
    throw new MusicError('请检查标题、作曲家、乐谱正文和私人备注的长度。'); return [b.title.trim(), b.composer.trim(), b.content, b.privateNote]; }
export async function GET(request: Request) {
    try {
        const a = await access(request);
        const url = new URL(request.url);
        const cursor = url.searchParams.get('before');
        let before: {
            at: string;
            id: string;
        } | null = null;
        if (cursor) {
            try {
                before = JSON.parse(cursor);
            }
            catch {
                throw new MusicError('翻页标记无效。');
            }
            if (!before || !/^\d{4}-\d\d-\d\dT/.test(before.at))
                throw new MusicError('翻页标记无效。');
            recordId(before.id);
        }
        const scores = (await env.DB.prepare('SELECT id,title,composer,content,private_note AS privateNote,revision,updated_at AS updatedAt FROM emerald_music_scores WHERE deleted_at IS NULL ORDER BY created_at,id LIMIT 100').all<ScoreRow>()).results;
        const assets = (await env.DB.prepare('SELECT a.id,a.score_id AS scoreId,a.kind,a.original_name AS name,a.mime,a.size,a.created_at AS createdAt FROM emerald_music_assets a JOIN emerald_music_scores s ON s.id=a.score_id WHERE a.deleted_at IS NULL AND s.deleted_at IS NULL ORDER BY a.created_at,a.id').all<MusicAsset & {
            scoreId: string;
        }>()).results;
        const stmt = before ? env.DB.prepare('SELECT id,creator_id AS creatorId,notes_json AS notesJson,tempo,message,created_at AS createdAt FROM emerald_music_melodies WHERE created_at<? OR (created_at=? AND id<?) ORDER BY created_at DESC,id DESC LIMIT 21').bind(before.at, before.at, before.id) : env.DB.prepare('SELECT id,creator_id AS creatorId,notes_json AS notesJson,tempo,message,created_at AS createdAt FROM emerald_music_melodies ORDER BY created_at DESC,id DESC LIMIT 21');
        const rows = (await stmt.all<MelodyRow>()).results, page = rows.slice(0, 20), last = page.at(-1);
        const editors = a.canAuthorize ? (await env.DB.prepare('SELECT citizen_id AS id FROM emerald_music_editors').all<{
            id: string;
        }>()).results.map((r: {
            id: string;
        }) => r.id) : [];
        return reply({ ...a, editors, scores: scores.map((s: ScoreRow) => { const result: Score = { ...s, assets: assets.filter((f: MusicAsset & {
                    scoreId: string;
                }) => f.scoreId === s.id).map(({ scoreId: _, ...asset }: MusicAsset & {
                    scoreId: string;
                }) => asset) }; if (!a.canEdit)
                delete result.privateNote; return result; }), melodies: page.map(melody), nextCursor: rows.length > 20 && last ? JSON.stringify({ at: last.createdAt, id: last.id }) : null });
    }
    catch (e) {
        return failure(e);
    }
}
export async function POST(request: Request) {
    try {
        const a = await access(request, true), b = await readJson(request);
        if (!b || typeof b !== 'object')
            throw new MusicError('缺少音乐内容。');
        const now = new Date().toISOString();
        if (b.action === 'melody') {
            if (!validNotes(b.notes) || !b.notes.some((n: {
                midi: number | null;
            }) => n.midi !== null) || !validTempo(b.tempo) || !cleanText(b.message, 280))
                throw new MusicError('旋律需包含 1–32 个音符，速度 50–160；留言不超过 280 字。');
            const clientId = recordId(b.clientId), notes = JSON.stringify(b.notes), message = b.message.trim();
            const id = crypto.randomUUID();
            await env.DB.prepare('INSERT INTO emerald_music_melodies(id,creator_id,client_id,notes_json,tempo,message,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(creator_id,client_id) DO NOTHING').bind(id, a.member, clientId, notes, b.tempo, message, now).run();
            const row = await env.DB.prepare('SELECT id,creator_id AS creatorId,notes_json AS notesJson,tempo,message,created_at AS createdAt FROM emerald_music_melodies WHERE creator_id=? AND client_id=?').bind(a.member, clientId).first<MelodyRow>();
            if (!row || row.notesJson !== notes || row.tempo !== b.tempo || row.message !== message)
                throw new MusicError('这次提交编号已用于另一段旋律，请重新提交。', 409);
            return reply({ melody: melody(row) }, row.id === id ? 201 : 200);
        }
        if (b.action === 'score') {
            if (!a.canEdit)
                throw new MusicError('只有主人或授权成员可以增订乐谱。', 403);
            const fields = scoreInput(b), id = recordId(b.clientId);
            const prior = await env.DB.prepare('SELECT id,title,composer,content,private_note AS privateNote,revision,created_by AS creatorId,deleted_at AS deletedAt FROM emerald_music_scores WHERE id=?').bind(id).first<ScoreRow & {
                creatorId: string;
                deletedAt: string | null;
            }>();
            if (prior) {
                if (prior.creatorId !== a.member || prior.deletedAt || JSON.stringify([prior.title, prior.composer, prior.content, prior.privateNote]) !== JSON.stringify(fields))
                    throw new MusicError('这份新谱已保存或发生变化，请重新读取收藏。', 409);
                return reply({ id, revision: prior.revision });
            }
            const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM emerald_music_scores WHERE deleted_at IS NULL').first<{
                n: number;
            }>();
            if ((count?.n || 0) >= 100)
                throw new MusicError('当前收藏最多 100 份，请先整理旧谱。');
            const created = await env.DB.prepare('INSERT INTO emerald_music_scores(id,title,composer,content,private_note,write_token,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id, ...fields, crypto.randomUUID(), a.member, now, now).run();
            const stored = await env.DB.prepare('SELECT title,composer,content,private_note AS privateNote,created_by AS creatorId,revision,deleted_at AS deletedAt FROM emerald_music_scores WHERE id=?').bind(id).first<ScoreRow & {
                creatorId: string;
                deletedAt: string | null;
            }>();
            if (!stored || stored.deletedAt || stored.creatorId !== a.member || JSON.stringify([stored.title, stored.composer, stored.content, stored.privateNote]) !== JSON.stringify(fields))
                throw new MusicError('这份新谱已保存或发生变化，请重新读取收藏。', 409);
            return reply({ id, revision: stored.revision }, created.meta.changes ? 201 : 200);
        }
        throw new MusicError('未知操作。');
    }
    catch (e) {
        return failure(e);
    }
}
export async function PUT(request: Request) {
    try {
        const a = await access(request, true), b = await readJson(request);
        if (!b || typeof b !== 'object')
            throw new MusicError('缺少内容。');
        if (b.action === 'authorize') {
            if (!a.canAuthorize)
                throw new MusicError('只有休息室主人或站点主人可以授权。', 403);
            if (b.member !== 'truth' || typeof b.enabled !== 'boolean')
                throw new MusicError('授权成员无效。');
            if (b.enabled)
                await env.DB.prepare('INSERT INTO emerald_music_editors(citizen_id,granted_by,updated_at) VALUES(?,?,?) ON CONFLICT(citizen_id) DO UPDATE SET granted_by=excluded.granted_by,updated_at=excluded.updated_at').bind(b.member, a.member, new Date().toISOString()).run();
            else
                await env.DB.prepare('DELETE FROM emerald_music_editors WHERE citizen_id=?').bind(b.member).run();
            return reply({ ok: true });
        }
        if (!a.canEdit)
            throw new MusicError('此身份仅可浏览乐谱。', 403);
        const fields = scoreInput(b), rev = revision(b.revision), id = recordId(b.id);
        const r = await env.DB.prepare('UPDATE emerald_music_scores SET title=?,composer=?,content=?,private_note=?,revision=revision+1,write_token=?,updated_at=? WHERE id=? AND revision=? AND deleted_at IS NULL').bind(...fields, crypto.randomUUID(), new Date().toISOString(), id, rev).run();
        if (!r.meta.changes)
            conflict();
        return reply({ id, revision: rev + 1 });
    }
    catch (e) {
        return failure(e);
    }
}
export async function DELETE(request: Request) {
    try {
        const a = await access(request, true), b = await readJson(request);
        const id = recordId(b?.id);
        if (b.action === 'melody') {
            const r = await env.DB.prepare('DELETE FROM emerald_music_melodies WHERE id=? AND (creator_id=? OR ?=1)').bind(id, a.member, a.canManage ? 1 : 0).run();
            if (!r.meta.changes)
                throw new MusicError('此旋律不存在或无权移除。', 403);
            return reply({ ok: true });
        }
        if (b.action === 'score') {
            if (!a.canEdit)
                throw new MusicError('此身份无权整理乐谱。', 403);
            const r = await env.DB.prepare('UPDATE emerald_music_scores SET deleted_at=?,revision=revision+1 WHERE id=? AND revision=? AND deleted_at IS NULL').bind(new Date().toISOString(), id, revision(b.revision)).run();
            if (!r.meta.changes)
                conflict();
            // Tombstones make all media immediately inaccessible; cleanup retries on the next media mutation.
            const { cleanup } = await import('./media/route.ts');
            await cleanup();
            return reply({ ok: true });
        }
        throw new MusicError('未知操作。');
    }
    catch (e) {
        return failure(e);
    }
}
