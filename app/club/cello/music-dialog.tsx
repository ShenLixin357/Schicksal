'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { CELLO_SCENE } from './scene-config';
import { CelloAudio } from './cello-audio';
import { OPEN_STRINGS, MEMBER_NAMES, musicTimestamp, type MusicLibrary, type MusicNote, type Melody } from './music-model';
import { readLibrary, musicRequest } from './music-client';
import { MusicStaff } from './music-staff';
import { ScoreBook } from './score-book';
import { MelodyComposer } from './melody-composer';
type View = 'trial' | 'book' | 'compose' | 'messages';
export default function MusicDialog({ member, initialMode, origin, roomSound, onClose }: {
    member: string;
    initialMode: 'trial' | 'book';
    origin: DOMRect | null;
    roomSound: boolean;
    onClose: () => void;
}) {
    const [view, setView] = useState<View>(initialMode), [library, setLibrary] = useState<MusicLibrary | null>(null), [loading, setLoading] = useState(false), [error, setError] = useState(''), [volume, setVolume] = useState(.65), [muted, setMuted] = useState(!roomSound), [reduce, setReduce] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches), [active, setActive] = useState(-1), [vibration, setVibration] = useState({ midi: 0, token: 0 }), [playing, setPlaying] = useState(false), [notice, setNotice] = useState('');
    const root = useRef<HTMLDivElement>(null), closeButton = useRef<HTMLButtonElement>(null), hero = useRef<HTMLDivElement>(null), animation = useRef<Animation | null>(null), audio = useRef<CelloAudio | null>(null), alive = useRef(true), requestVersion = useRef(0);
    const engine = () => audio.current || (audio.current = new CelloAudio());
    const stop = useCallback(() => { audio.current?.stop(); setActive(-1); setPlaying(false); }, []);
    const refresh = useCallback(async () => { setLoading(true); const version = ++requestVersion.current; try {
        const data = await readLibrary(member);
        if (data.member !== member)
            throw new Error('当前登录身份已变更，请重新打开乐谱册。');
        if (alive.current && version === requestVersion.current) {
            setLibrary(data);
            setError('');
        }
        return data;
    }
    catch (e) {
        if (alive.current && version === requestVersion.current)
            setError(e instanceof Error ? e.message : '乐谱册读取失败，请稍后重试。');
        throw e;
    }
    finally {
        if (alive.current && version === requestVersion.current)
            setLoading(false);
    } }, [member]);
    useEffect(() => { if (view !== 'trial' && !library)
        void refresh().catch(() => { }); }, [view, library, refresh]);
    useEffect(() => { audio.current?.volume(volume, muted || !roomSound); }, [volume, muted, roomSound]);
    useEffect(() => { alive.current = true; const old = document.body.style.overflow; document.body.style.overflow = 'hidden'; closeButton.current?.focus(); const hidden = () => { if (document.hidden) {
        audio.current?.stop();
        root.current?.querySelectorAll('audio').forEach(a => a.pause());
        setActive(-1);
        setPlaying(false);
    } }; document.addEventListener('visibilitychange', hidden); return () => { alive.current = false; requestVersion.current++; document.body.style.overflow = old; document.removeEventListener('visibilitychange', hidden); animation.current?.cancel(); audio.current?.dispose(); }; }, []);
    useLayoutEffect(() => { if (initialMode !== 'trial' || reduce || !origin || !hero.current)
        return; const target = hero.current.getBoundingClientRect(); const dx = origin.left + origin.width / 2 - target.left - target.width / 2, dy = origin.top + origin.height / 2 - target.top - target.height / 2; const a = hero.current.animate([{ transform: `translate(${dx}px,${dy}px) scale(${origin.width / target.width})`, opacity: .55 }, { transform: 'translate(0,0) scale(1)', opacity: 1 }], { duration: 760, easing: 'cubic-bezier(.2,.65,.2,1)' }); animation.current = a; a.onfinish = () => { animation.current = null; }; return () => a.cancel(); }, [initialMode, origin, reduce]);
    useEffect(() => { const skip = () => animation.current?.finish(); window.addEventListener('schicksal:skip-animation', skip); return () => window.removeEventListener('schicksal:skip-animation', skip); }, []);
    function close() { stop(); root.current?.querySelectorAll('audio').forEach(a => a.pause()); if (view === 'trial' && !reduce && origin && hero.current) {
        const target = hero.current.getBoundingClientRect();
        animation.current?.cancel();
        const a = hero.current.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${origin.left + origin.width / 2 - target.left - target.width / 2}px,${origin.top + origin.height / 2 - target.top - target.height / 2}px) scale(${origin.width / target.width})`, opacity: 0 }], { duration: 350, easing: 'ease-in', fill: 'forwards' });
        animation.current = a;
        a.onfinish = onClose;
    }
    else if (!reduce && root.current) {
        animation.current?.cancel();
        const fade = root.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-out', fill: 'forwards' });
        animation.current = fade;
        fade.onfinish = onClose;
    } else onClose(); }
    function navigate(next: View) { stop(); animation.current?.finish(); root.current?.querySelectorAll('audio').forEach(a => a.pause()); setView(next); setNotice(''); }
    async function trial(midi: number) { setError(''); try {
        const a = engine();
        a.volume(volume, muted || !roomSound);
        a.unlock();
        setVibration({ midi, token: Date.now() });
        await a.note(midi);
    }
    catch (e) {
        if (alive.current)
            setError(e instanceof Error ? e.message : '琴音暂时无法播放。');
    } }
    const play = useCallback((notes: MusicNote[], tempo: number) => { setError(''); root.current?.querySelectorAll('audio').forEach(a => a.pause()); const a = engine(); a.volume(volume, muted || !roomSound); try {
        a.unlock();
        setPlaying(true);
        void a.sequence(notes, tempo, i => { if (alive.current) {
            setActive(i);
            if (i >= 0 && notes[i]?.midi !== null)
                setVibration({ midi: notes[i].midi!, token: Date.now() });
            if (i < 0)
                setPlaying(false);
        } }).catch(e => { if (alive.current) {
            setPlaying(false);
            setError(e instanceof Error ? e.message : '旋律试听失败。');
        } });
    }
    catch (e) {
        setPlaying(false);
        setError(e instanceof Error ? e.message : '琴音暂时无法播放。');
    } }, [volume, muted, roomSound]);
    const trialRef = useRef(trial);
    trialRef.current = trial;
    const closeRef = useRef(close);
    closeRef.current = close;
    useEffect(() => {
        function key(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopImmediatePropagation();
                closeRef.current();
                return;
            }
            if (e.key === 'Tab') {
                const nodes = Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]') || []).filter(n => n.getClientRects().length);
                if (!nodes.length)
                    return;
                const first = nodes[0], last = nodes.at(-1)!;
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
                else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
            if (view === 'trial' && !/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement)?.tagName || '')) {
                const s = OPEN_STRINGS.find(s => s.key === e.key);
                if (s && !e.repeat) {
                    e.preventDefault();
                    void trialRef.current(s.midi);
                }
            }
        }
        window.addEventListener('keydown', key, true);
        return () => window.removeEventListener('keydown', key, true);
    }, [view]);
    async function saved(m: Melody) { setNotice('旋律已收进本室音乐留言册。'); setView('messages'); try {
        await refresh();
    }
    catch { /* The POST succeeded; keep its canonical response visible even during a subsequent read outage. */
        setLibrary(prev => prev ? { ...prev, melodies: [m, ...prev.melodies.filter(x => x.id !== m.id)] } : prev);
    } }
    function touchString(e: React.PointerEvent<HTMLButtonElement>) { if (e.button !== 0)
        return; const rect = hero.current!.getBoundingClientRect(), x = (e.clientX - rect.left) / rect.width * 100, y = (e.clientY - rect.top) / rect.height * 100, t = Math.max(0, Math.min(1, (y - CELLO_SCENE.stringTop) / (CELLO_SCENE.stringBottom - CELLO_SCENE.stringTop))); let best = 0, dist = Infinity; CELLO_SCENE.strings.forEach((s, i) => { const d = Math.abs(x - (s.topX + (s.bottomX - s.topX) * t)); if (d < dist) {
        dist = d;
        best = i;
    } }); void trial(OPEN_STRINGS[best].midi); }
    return <div ref={root} role="dialog" aria-modal="true" aria-labelledby="cello-dialog-title" className={`cello-dialog cello-view-${view} ${reduce ? 'cello-reduced' : ''}`} onPointerDown={() => animation.current?.finish()}>
 <header className="cello-dialog-bar"><div><small>THE JADE EMBER · MUSIC CORNER</small><h2 id="cello-dialog-title">{view === 'trial' ? '四弦之间' : view === 'compose' ? '给主人的一段旋律' : view === 'messages' ? '音乐留言收藏' : '私人乐谱收藏'}</h2></div><button ref={closeButton} className="cello-close" onClick={close} aria-label="合上音乐角，返回休息室">×</button></header>
 <nav className="cello-dialog-nav" aria-label="音乐角"><button aria-current={view === 'trial' ? 'page' : undefined} onClick={() => navigate('trial')}>轻触琴弦</button><button aria-current={view === 'book' ? 'page' : undefined} onClick={() => navigate('book')}>私人乐谱</button><button aria-current={view === 'messages' ? 'page' : undefined} onClick={() => navigate('messages')}>音乐留言</button><label><input type="checkbox" checked={reduce} onChange={e => { animation.current?.finish(); setReduce(e.target.checked); }}/> 减少动画</label></nav>
 <main className="cello-dialog-main">
 {view === 'trial' ? <div className="cello-trial"><div className="cello-trial-art" ref={hero}><img src={CELLO_SCENE.asset} width="1024" height="1536" alt="四弦大提琴、古典弧形木质展示架、琴弓和琴谱架的局部特写" draggable={false}/>
 <svg className="cello-string-animation" viewBox="0 0 100 150" aria-hidden="true">{OPEN_STRINGS.map((s, i) => { const p = CELLO_SCENE.strings[i]; return vibration.midi === s.midi ? <path key={`${s.midi}-${vibration.token}`} d={`M${p.topX} ${CELLO_SCENE.stringTop * 1.5} Q${(p.topX + p.bottomX) / 2} ${(CELLO_SCENE.stringTop + CELLO_SCENE.stringBottom) * .75} ${p.bottomX} ${CELLO_SCENE.stringBottom * 1.5}`} className="cello-vibrating-string"/> : null; })}</svg>
 <button className="cello-trial-string-hit" aria-label="按琴弦位置选择试奏，或使用下方四根空弦按钮" onPointerDown={touchString} onClick={e => { if (e.detail === 0)
            void trial(36); }}/><button className="cello-trial-score-hit" aria-label="翻开琴谱架上的乐谱" onClick={() => navigate('book')}/></div>
 <aside className="cello-trial-notes"><small>QUATTRO CORDE</small><h3>轻轻，<br /><em>让木头歌唱。</em></h3><p>触碰琴弦，或选择一根空弦。<br />从深处的 C，到温暖的 A。</p><div className="cello-open-strings">{OPEN_STRINGS.map(s => <button key={s.midi} onClick={() => void trial(s.midi)} className={vibration.midi === s.midi ? 'sounded' : ''}><strong>{s.name}</strong><small>{s.key} · {s.frequency.toFixed(2)} Hz</small></button>)}</div><p className="cello-fine-print">真实大提琴拨弦采样 · 连续点击可试奏<br />键盘 1–4 选弦，Esc 返回房间。</p><button className="cello-manuscript-link" onClick={() => navigate('book')}>翻开主人的乐谱 →</button></aside></div> : <>
 {loading && !library && <p className="cello-loading" role="status">正在取出收藏中的谱页…</p>}
 {library && view === 'book' && <ScoreBook library={library} member={member} active={active} play={play} stop={stop} refresh={refresh} onCompose={() => navigate('compose')} onMessages={() => navigate('messages')} volume={volume} muted={muted || !roomSound}/>}
 {library && view === 'compose' && <MelodyComposer member={member} active={active} play={play} stop={stop} onSaved={m => void saved(m)}/>}
 {library && view === 'messages' && <MelodyCollection library={library} member={member} active={active} play={play} stop={stop} refresh={refresh} onCompose={() => navigate('compose')}/>}
 {!library && !loading && <button onClick={() => void refresh().catch(() => { })}>重新读取乐谱册</button>}
 </>}
 </main>
 <footer className="cello-audio-bar"><button aria-pressed={muted || !roomSound} onClick={() => setMuted(v => !v)} disabled={!roomSound}>{muted || !roomSound ? '已静音' : '琴音开'}</button><label>音量 <input aria-label="大提琴音量" type="range" min="0" max="1" step=".01" value={volume} onChange={e => setVolume(Number(e.target.value))}/></label><button onClick={stop}>{playing ? '停止播放' : '止弦'}</button><span>{!roomSound ? '休息室总声音已关闭' : notice || '琴声只在你轻触之后响起'}</span></footer>
 {error && <div className="cello-global-error" role="alert">{error} {view !== 'trial' && <button onClick={() => void refresh().catch(() => { })}>重试读取</button>}</div>}
 </div>;
}
function MelodyCollection({ library, member, active, play, stop, refresh, onCompose }: {
    library: MusicLibrary;
    member: string;
    active: number;
    play: (n: MusicNote[], tempo: number) => void;
    stop: () => void;
    refresh: () => Promise<MusicLibrary>;
    onCompose: () => void;
}) {
    const [items, setItems] = useState(library.melodies), [cursor, setCursor] = useState(library.nextCursor), [current, setCurrent] = useState<string | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [remove, setRemove] = useState<string | null>(null);
    useEffect(() => { setItems(library.melodies); setCursor(library.nextCursor); }, [library]);
    async function more() { setBusy(true); setError(''); try {
        const r = await readLibrary(member, cursor || undefined);
        setItems(prev => [...prev, ...r.melodies.filter(x => !prev.some(p => p.id === x.id))]);
        setCursor(r.nextCursor);
    }
    catch (e) {
        setError(e instanceof Error ? e.message : '翻页失败。');
    }
    finally {
        setBusy(false);
    } }
    async function erase(id: string) { setBusy(true); setError(''); stop(); try {
        await musicRequest(member, '', 'DELETE', { action: 'melody', id });
        setItems(prev => prev.filter(m => m.id !== id));
        setRemove(null);
        await refresh();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : '移除失败。');
    }
    finally {
        setBusy(false);
    } }
    return <section className="cello-melody-collection"><header className="cello-collection-heading"><div><small>MELODIES FROM OUR VISITORS</small><h2>留在谱页里的来访</h2></div><button className="cello-primary" onClick={onCompose}>留下一段旋律</button></header>{!items.length && <div className="cello-paper cello-empty-melodies"><MusicStaff notes={[]}/><p>这里还没有旋律。空白的谱纸，正等待第一位来访者。</p></div>}<div className="cello-melody-cards">{items.map(m => <article key={m.id} className="cello-paper cello-melody-card"><header><h3>{MEMBER_NAMES[m.creatorId] || m.creatorId}</h3><time dateTime={m.createdAt}>{musicTimestamp(m.createdAt)} · UTC+8</time></header><MusicStaff notes={m.notes} active={current === m.id ? active : -1}/>{m.message && <p className="cello-handwritten">{m.message}</p>}<footer><span>♩ = {m.tempo} · {m.notes.length} 个音符</span><button onClick={() => { setCurrent(m.id); play(m.notes, m.tempo); }}>聆听旋律</button>{(library.canManage || m.creatorId === member) && <button disabled={busy} onClick={() => setRemove(m.id)}>移除</button>}{remove === m.id && <button disabled={busy} onClick={() => void erase(m.id)}>确认移除这段旋律</button>}</footer></article>)}</div>{cursor && <button disabled={busy} className="cello-load-more" onClick={() => void more()}>{busy ? '正在翻页…' : '更早的旋律'}</button>}{error && <p className="cello-status error" role="alert">{error}</p>}</section>;
}
