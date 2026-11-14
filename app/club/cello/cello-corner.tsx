'use client';
import { Component, Suspense, lazy, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CELLO_SCENE as config } from './scene-config';
import './cello.css';
const MusicDialog = lazy(() => import('./music-dialog'));
class CornerBoundary extends Component<{
    children: ReactNode;
    onClose: () => void;
}, {
    failed: boolean;
}> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() { return this.state.failed ? <div className="cello-recovery" role="alert"><p>这一页暂时无法展开，休息室仍可使用。</p><button onClick={this.props.onClose}>返回休息室</button></div> : this.props.children; }
}
export function CelloCorner({ citizenId, soundEnabled }: {
    citizenId: string;
    soundEnabled: boolean;
}) {
    const [mode, setMode] = useState<'trial' | 'book' | null>(null), [origin, setOrigin] = useState<DOMRect | null>(null);
    const art = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement | null>(null);
    function open(next: 'trial' | 'book', button: HTMLButtonElement) { trigger.current = button; setOrigin(art.current?.getBoundingClientRect() || null); setMode(next); }
    function close() { setMode(null); requestAnimationFrame(() => trigger.current?.focus()); }
    const region = (v: {
        left: number;
        top: number;
        width: number;
        height: number;
    }) => ({ left: `${v.left}%`, top: `${v.top}%`, width: `${v.width}%`, height: `${v.height}%` });
    return <><div className="cello-corner-scene" ref={art} style={{ left: `${config.placement.left}%`, bottom: `${config.placement.bottom}%`, width: `${config.placement.width}%`, '--cello-rotation': `${config.placement.rotate}deg` } as CSSProperties}>
  <img src={config.asset} width="1024" height="1536" alt="椅子前的地毯上，琥珀木色四弦大提琴立在弧形胡桃木展示架中，琴弓和小型琴谱架陈列在两旁" draggable={false}/>
  <button className="cello-scene-hit" style={region(config.instrument)} aria-label="轻触大提琴，进入四弦试奏" onClick={e => open('trial', e.currentTarget)}/>
  <button className="cello-scene-hit" style={region(config.manuscript)} aria-label="翻开琴谱架上的私人乐谱收藏" onClick={e => open('book', e.currentTarget)}/>
 </div>{mode && typeof document !== 'undefined' && createPortal(<CornerBoundary key={citizenId} onClose={close}><Suspense fallback={<div className="cello-recovery" role="status"><p>正在展开乐谱…</p><button onClick={close}>返回休息室</button></div>}><MusicDialog member={citizenId} initialMode={mode} origin={origin} roomSound={soundEnabled} onClose={close}/></Suspense></CornerBoundary>, document.body)}</>;
}
