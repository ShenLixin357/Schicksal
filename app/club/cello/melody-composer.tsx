'use client';
import { useEffect, useState } from 'react';
import { COMPOSER_PITCHES, MAX_NOTES, noteName, validNotes, validTempo, type MusicNote, type Melody } from './music-model';
import { MusicStaff } from './music-staff';
import { musicRequest } from './music-client';
export function MelodyComposer({ member, active, play, stop, onSaved }: {
    member: string;
    active: number;
    play: (n: MusicNote[], t: number) => void;
    stop: () => void;
    onSaved: (melody: Melody) => void;
}) {
    const key = `schicksal:cello:draft:${member}`;
    const [notes, setNotes] = useState<MusicNote[]>([]), [tempo, setTempo] = useState(84), [beats, setBeats] = useState<.5 | 1 | 2>(1), [selected, setSelected] = useState(-1), [message, setMessage] = useState(''), [clientId, setClientId] = useState(() => crypto.randomUUID()), [ready, setReady] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState('');
    useEffect(() => { try {
        const d = JSON.parse(localStorage.getItem(key) || 'null');
        if (d && validNotes(d.notes) && validTempo(d.tempo) && typeof d.message === 'string' && d.message.length <= 280) {
            setNotes(d.notes);
            setTempo(d.tempo);
            setMessage(d.message);
            if (typeof d.clientId === 'string' && /^[a-f0-9-]{36}$/i.test(d.clientId))
                setClientId(d.clientId);
        }
    }
    catch { } setReady(true); }, [key]);
    useEffect(() => { if (ready)
        try {
            localStorage.setItem(key, JSON.stringify({ notes, tempo, message, clientId }));
        }
        catch { } }, [notes, tempo, message, clientId, key, ready]);
    useEffect(() => () => stop(), [stop]);
    function edit(next: MusicNote[]) { stop(); setNotes(next); setClientId(crypto.randomUUID()); setError(''); }
    function add(midi: number | null) { if (saving)
        return; if (selected >= 0) {
        edit(notes.map((n, i) => i === selected ? { midi, beats } : n));
        setSelected(-1);
    }
    else if (notes.length < MAX_NOTES)
        edit([...notes, { midi, beats }]); }
    async function submit() { if (saving)
        return; stop(); setSaving(true); setError(''); try {
        const r = await musicRequest<{
            melody: Melody;
        }>(member, '', 'POST', { action: 'melody', clientId, notes, tempo, message });
        try {
            localStorage.removeItem(key);
        }
        catch { }
        onSaved(r.melody);
    }
    catch (e) {
        setError(e instanceof Error ? e.message : '保存失败，请保留草稿重试。');
    }
    finally {
        setSaving(false);
    } }
    return <section className="cello-composer cello-paper" aria-label="创作音乐留言"><header className="cello-page-heading"><small>A MELODY LEFT BETWEEN THE PAGES</small><h2>留下一段旋律</h2><p>八个音阶，几拍心意。音符从左往右，依次奏响。</p></header>
 <MusicStaff notes={notes} active={active >= 0 ? active : selected} onSelect={i => { stop(); setSelected(i); setBeats(notes[i].beats); }}/>
 <div className="cello-note-sequence" aria-label="已写下的音符">{notes.map((n, i) => <button key={i} disabled={saving} className={selected === i ? 'selected' : ''} aria-pressed={selected === i} onClick={() => { stop(); setSelected(i); setBeats(n.beats); }}>{i + 1}. {noteName(n.midi)} <small>{n.beats}拍</small></button>)}</div>
 <fieldset disabled={saving}><legend>{selected >= 0 ? `修改第 ${selected + 1} 个音符` : '写下下一个音符'} <span>{notes.length}/{MAX_NOTES}</span></legend><div className="cello-pitch-keys">{COMPOSER_PITCHES.map(m => <button key={m} type="button" onClick={() => add(m)} disabled={selected < 0 && notes.length >= MAX_NOTES}>{noteName(m)}<small>{['do', 're', 'mi', 'fa', 'sol', 'la', 'si', 'do'][COMPOSER_PITCHES.indexOf(m)]}</small></button>)}<button type="button" onClick={() => add(null)} disabled={selected < 0 && notes.length >= MAX_NOTES}>休止<small>rest</small></button></div>
 <div className="cello-editor-line"><label>时值 <select value={beats} onChange={e => { const v = Number(e.target.value) as .5 | 1 | 2; setBeats(v); if (selected >= 0)
        edit(notes.map((n, i) => i === selected ? { ...n, beats: v } : n)); }}><option value="0.5">八分 · ½拍</option><option value="1">四分 · 1拍</option><option value="2">二分 · 2拍</option></select></label><label>速度 <input type="number" min="50" max="160" value={tempo} onChange={e => { stop(); setTempo(Number(e.target.value)); setClientId(crypto.randomUUID()); }}/> BPM</label>{selected >= 0 && <button type="button" onClick={() => setSelected(-1)}>继续追加</button>}<button type="button" disabled={!notes.length} onClick={() => { edit(notes.filter((_, i) => i !== (selected >= 0 ? selected : notes.length - 1))); setSelected(-1); }}>移除{selected >= 0 ? '此音符' : '末音'}</button><button type="button" disabled={!notes.length} onClick={() => { edit([]); setSelected(-1); }}>重新开始</button></div>
 <label className="cello-message-label">附上一句话 <textarea maxLength={280} value={message} placeholder="让这页乐谱替你问候主人…" onChange={e => { setMessage(e.target.value); setClientId(crypto.randomUUID()); }}/></label></fieldset>
 <footer className="cello-compose-footer"><span>未提交的草稿仅留在本机；提交成功后存入音乐留言册。</span><div><button disabled={!notes.length || !validTempo(tempo) || saving} onClick={() => play(notes, tempo)}>试听旋律</button><button onClick={stop}>停止</button><button className="cello-primary" disabled={saving || !notes.some(n => n.midi !== null) || !validTempo(tempo)} onClick={() => void submit()}>{saving ? '正在收进留言册…' : '确认留下旋律'}</button></div></footer>{error && <p className="cello-status error" role="alert">{error}</p>}
 </section>;
}
