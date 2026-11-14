'use client';
import { useEffect, useRef, useState } from 'react';
import { DEMO_NOTES, MEMBER_NAMES, musicTimestamp, type MusicLibrary, type Score, type MusicNote } from './music-model';
import { MusicStaff } from './music-staff';
import { mediaUrl, musicRequest } from './music-client';
export function ScoreBook({ library, member, active, play, stop, refresh, onCompose, onMessages, muted, volume }: {
    library: MusicLibrary;
    member: string;
    active: number;
    play: (n: MusicNote[], t: number) => void;
    stop: () => void;
    refresh: () => Promise<MusicLibrary>;
    onCompose: () => void;
    onMessages: () => void;
    muted: boolean;
    volume: number;
}) {
    const [index, setIndex] = useState(0), [page, setPage] = useState(0), [editing, setEditing] = useState(false), [adding, setAdding] = useState(false), [busy, setBusy] = useState(false), [status, setStatus] = useState(''), [remove, setRemove] = useState<string | null>(null), [turn, setTurn] = useState(0);
    const recording = useRef<HTMLAudioElement>(null);
    const entries: [
        null,
        ...Score[]
    ] = [null, ...library.scores], score = entries[Math.min(index, entries.length - 1)] || null, images = score?.assets.filter(a => a.kind === 'image') || [], audio = score?.assets.find(a => a.kind === 'audio');
    useEffect(() => { setPage(0); setEditing(false); setAdding(false); setRemove(null); stop(); }, [score?.id, stop]);
    useEffect(() => { if (recording.current) {
        recording.current.volume = volume;
        recording.current.muted = muted;
    } }, [volume, muted, audio?.id]);
    useEffect(() => () => { recording.current?.pause(); stop(); }, [stop]);
    async function operation(action: () => Promise<unknown>, message: string) { setBusy(true); setStatus(''); stop(); recording.current?.pause(); try {
        await action();
        await refresh();
        setStatus(message);
        setRemove(null);
    }
    catch (e) {
        setStatus(e instanceof Error ? e.message : '保存失败，请稍后重试。');
    }
    finally {
        setBusy(false);
    } }
    async function upload(file: File) { if (!score)
        return; const f = new FormData(); f.set('scoreId', score.id); f.set('revision', String(score.revision)); f.set('file', file); await operation(() => musicRequest(member, '/media', 'POST', f), '文件已收入私人收藏。'); }
    function change(next: number) { recording.current?.pause(); stop(); setIndex(next); setPage(0); setTurn(v => v + 1); }
    return <section className="cello-book" aria-label="主人的私人乐谱收藏">
 <header className="cello-book-index"><span className="cello-book-owner">LORD CHRYSER <small>PRIVATE MUSIC LIBRARY</small></span><label className="cello-sr-only" htmlFor="cello-score-index">选择乐谱</label><select id="cello-score-index" value={Math.min(index, entries.length - 1)} onChange={e => change(Number(e.target.value))}><option value="0">四根空弦练习页 · 系统示例</option>{library.scores.map((s, i) => <option key={s.id} value={i + 1}>{s.title}</option>)}</select>{library.canEdit && <button disabled={busy} onClick={() => { stop(); setAdding(true); setEditing(false); }}>添一份新谱</button>}</header>
 {editing || adding ? <ScoreEditor key={adding ? 'new' : score?.id} score={adding ? null : score} member={member} onCancel={() => { setEditing(false); setAdding(false); }} onSaved={async (id) => { const list = await refresh(); setAdding(false); setEditing(false); setStatus('乐谱文字已保存。可继续添加乐谱图片和演奏录音。'); if (id) {
            const i = list.scores.findIndex(s => s.id === id);
            setIndex(i + 1);
        } }}/> : <div className="cello-book-spread" key={`${score?.id || 'demo'}-${turn}`}>
 <article className="cello-paper cello-score-page"><span className="cello-page-number">{String(index + 1).padStart(2, '0')} / {String(entries.length).padStart(2, '0')}</span><header className="cello-page-heading"><small>{score ? 'FROM THE PRIVATE COLLECTION' : 'ORIGINAL SYSTEM STUDY · 示例'}</small><h2>{score?.title || '四根空弦练习页'}</h2><p>{score?.composer || 'Schicksal · 原创空弦练习'}</p></header>
 {images.length ? <><img className="cello-score-scan" src={mediaUrl(images[page]?.id || images[0].id)} alt={`${score?.title}，第 ${page + 1} 页`} onError={() => setStatus('此页图片读取失败，可稍后重试。')}/><nav className="cello-page-navigation" aria-label="乐谱翻页"><button disabled={page <= 0} onClick={() => { setPage(v => v - 1); setTurn(v => v + 1); }}>上一页</button><span>{page + 1} / {images.length}</span><button disabled={page >= images.length - 1} onClick={() => { setPage(v => v + 1); setTurn(v => v + 1); }}>下一页</button></nav></> : score ? <><div className="cello-score-writing">{score.content || '这份乐谱尚未添入正文或图片。'}</div><MusicStaff notes={[]}/></> : <><MusicStaff notes={DEMO_NOTES} active={active}/><p className="cello-score-writing">C2 · G2 · D3 · A3<br />从低音到高音，让四根空弦逐一醒来。每个音符停留两拍。</p><button onClick={() => { recording.current?.pause(); play(DEMO_NOTES, 68); }}>聆听空弦练习</button><p className="cello-fine-print">此页为开发用原创示例，使用真实大提琴拨弦采样；并非主人的演奏或私人记录。</p></>}
 {score?.content && images.length > 0 && <p className="cello-score-writing">{score.content}</p>}
 </article>
 <aside className="cello-paper cello-margin-page"><div className="cello-book-mark" aria-hidden="true"/><small>NOTES IN THE MARGIN</small><h3>{score ? '谱页旁的笔记' : '留在余烬旁的音乐'}</h3>{score ? <><p className="cello-fine-print">收藏更新于<br />{musicTimestamp(score.updatedAt)}</p>{library.canEdit && <div className="cello-handwritten"><span>主人私人备注 · 仅主人及获授权编辑可见</span><p>{score.privateNote || '尚未写下私人备注。'}</p></div>}{audio ? <div className="cello-recording"><small>收藏中的录音</small><audio ref={recording} src={mediaUrl(audio.id)} controls preload="none" onPlay={stop} onError={() => setStatus('此录音读取或解码失败，请检查格式后重试。')}/><span>{audio.name}</span></div> : <p>这份乐谱还没有附演奏录音。</p>}</> : <p>主人的私人收藏尚待亲手写下。你可以先试奏四根空弦，也可以在空白谱页里留下自己的旋律。</p>}
 <div className="cello-book-invitations"><button onClick={onCompose}>留下一段旋律 <span>↗</span></button><button onClick={onMessages}>翻阅音乐留言 <small>{library.melodies.length ? `${library.melodies.length}${library.nextCursor ? '+' : ''} 段旋律` : '静候第一段旋律'}</small></button></div>
 {library.canEdit && score && <div className="cello-collection-tools"><button disabled={busy} onClick={() => setEditing(true)}>修改题名与笔记</button><label className="cello-upload-button">添一页乐谱 <small>PNG / JPEG / WebP · ≤4 MB</small><input disabled={busy || images.length >= 6} type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f)
            void upload(f); }}/></label><label className="cello-upload-button">收入演奏录音 <small>MP3 / WAV / OGG / M4A · ≤8 MB</small><input disabled={busy || !!audio} type="file" accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,.m4a" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f)
            void upload(f); }}/></label><small>仅上传你有权保存和分享的乐谱及录音。</small>{score.assets.map(a => <div className="cello-file-entry" key={a.id}><span>{a.name}</span><button disabled={busy} onClick={() => setRemove(a.id)}>移除</button>{remove === a.id && <button disabled={busy} onClick={() => void operation(() => musicRequest(member, '/media', 'DELETE', { id: a.id, revision: score.revision }), '文件已移除。')}>确认移除此文件</button>}</div>)}<button disabled={busy} onClick={() => setRemove(score.id)}>移除此谱</button>{remove === score.id && <button disabled={busy} onClick={() => void operation(async () => { await musicRequest(member, '', 'DELETE', { action: 'score', id: score.id, revision: score.revision }); setIndex(0); }, '乐谱已移出收藏。')}>确认移除乐谱及附件</button>}</div>}
 {library.canAuthorize && <details className="cello-permissions"><summary>收藏授权</summary><p>Lord Chryser 与 Amberina 可管理本室收藏。</p><label><input type="checkbox" disabled={busy} checked={library.editors.includes('truth')} onChange={e => void operation(() => musicRequest(member, '', 'PUT', { action: 'authorize', member: 'truth', enabled: e.target.checked }), '收藏授权已更新。')}/> 授权 {MEMBER_NAMES.truth} 编辑乐谱、阅读私人备注并整理留言</label></details>}
 </aside></div>}
 <footer className="cello-book-footer"><button disabled={index <= 0 || busy} onClick={() => change(index - 1)}>← 上一份</button><span>{library.canEdit ? '私人收藏 · 可编辑' : '私人收藏 · 只读浏览'}</span><button disabled={index >= entries.length - 1 || busy} onClick={() => change(index + 1)}>下一份 →</button></footer>{(status || busy) && <p className="cello-status" role="status">{busy ? '正在保存，请稍候…' : status}</p>}
 </section>;
}
function ScoreEditor({ score, member, onCancel, onSaved }: {
    score: Score | null;
    member: string;
    onCancel: () => void;
    onSaved: (id: string) => Promise<void>;
}) {
    const [clientId] = useState(() => crypto.randomUUID());
    const [title, setTitle] = useState(score?.title || ''), [composer, setComposer] = useState(score?.composer || ''), [content, setContent] = useState(score?.content || ''), [note, setNote] = useState(score?.privateNote || ''), [busy, setBusy] = useState(false), [error, setError] = useState('');
    async function save() { setBusy(true); setError(''); try {
        const r = await musicRequest<{
            id: string;
        }>(member, '', score ? 'PUT' : 'POST', { action: 'score', clientId, id: score?.id, revision: score?.revision, title, composer, content, privateNote: note });
        await onSaved(r.id);
    }
    catch (e) {
        setError(e instanceof Error ? e.message : '保存失败，编辑内容仍在本页。');
    }
    finally {
        setBusy(false);
    } }
    return <form className="cello-paper cello-score-editor" onSubmit={e => { e.preventDefault(); void save(); }}><header className="cello-page-heading"><small>THE OWNER'S MANUSCRIPT</small><h2>{score ? '增订这一页' : '添一份新谱'}</h2></header><fieldset disabled={busy}><label>曲目名称<input required maxLength={160} value={title} onChange={e => setTitle(e.target.value)}/></label><label>作曲家<input maxLength={160} value={composer} onChange={e => setComposer(e.target.value)}/></label><label>乐谱正文或公开批注<textarea rows={6} maxLength={12000} value={content} onChange={e => setContent(e.target.value)} placeholder="可先写下正文，再从乐谱册中添加谱页图片。"/></label><label>主人私人备注 <small>仅主人及授权编辑可见</small><textarea rows={4} maxLength={6000} value={note} onChange={e => setNote(e.target.value)}/></label></fieldset><footer><button type="button" disabled={busy} onClick={onCancel}>放下笔</button><button className="cello-primary" disabled={busy || !title.trim()}>{busy ? '正在保存…' : '收入收藏'}</button></footer>{error && <p className="cello-status error" role="alert">{error}</p>}</form>;
}
