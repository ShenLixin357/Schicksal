"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { GAME_CABINET, GAME_ROOM_RETURN_KEY } from "./game-room-catalogue";
import type { MiniGameId } from "./minigames/mini-game-types";

function CabinetMiniature({ kind }: { kind: string }) {
  return <svg className={`cabinet-miniature miniature-${kind}`} viewBox="0 0 150 105" aria-hidden="true">
    <ellipse cx="75" cy="97" rx="49" ry="5" fill="#876b64" opacity=".19" />
    {kind === "solitaire" && <g className="miniature-idle"><rect x="26" y="38" width="96" height="58" rx="10" fill="#b97c98" stroke="#e7c37a" strokeWidth="3" /><rect x="34" y="45" width="80" height="43" rx="5" fill="#745c84" stroke="#e8bd79" /><g transform="rotate(-12 58 50)"><rect x="36" y="8" width="43" height="65" rx="5" fill="#fff6e1" stroke="#cea65f" strokeWidth="2" /><path d="m57 25 11 13-11 14-11-14Z" fill="#cf7296" /><text x="41" y="22" fontSize="10" fill="#bc6a8c">A</text></g><g transform="rotate(13 90 50)"><rect x="73" y="9" width="43" height="65" rx="5" fill="#f4fbff" stroke="#cca761" strokeWidth="2" /><path d="m94 27 4 10 11 1-9 7 3 10-9-6-9 6 3-10-9-7 11-1Z" fill="#86b6d4" /></g></g>}
    {kind === "potion" && <g><path d="M25 93V50m100 43V50M23 67h104M22 93h106" fill="none" stroke="#b78c66" strokeWidth="6" strokeLinecap="round" />{[0,1,2].map((n)=><g key={n} className="miniature-vial" style={{animationDelay:`${n * -.7}s`}} transform={`translate(${37+n*31} 0)`}><path d="M-8 16h16v37l6 21q1 13-14 13t-14-13l6-21Z" fill="#fff9ed" fillOpacity=".7" stroke="#c7b59d" strokeWidth="2" /><path d="M-9 57h18l5 18q0 11-14 11t-14-11Z" fill={["#dda0c0","#a5cbb4","#cab4e6"][n]} /><rect x="-9" y="11" width="18" height="8" rx="2" fill="#c49765" /><circle className="potion-bubble" cx="-4" cy="69" r="2" fill="#fff" /></g>)}</g>}
    {kind === "merge" && <g><ellipse cx="75" cy="89" rx="32" ry="8" fill="#cba66d" /><path d="M47 89v5q27 10 56 0v-5" fill="#bc8d6e" /><g className="miniature-crystal"><path d="m75 7 28 26-8 36-20 15-23-18-6-33Z" fill="#bda9de" stroke="#f2dfed" strokeWidth="2" /><path d="m75 7-12 29 12 48 10-48Zm-29 26 29 7 28-7M52 66l23-26 20 29" fill="none" stroke="#f6efff" strokeWidth="1.5" /><path d="m75 7 10 29 18-3Z" fill="#f3d1e1" /><path d="m52 66 11-30 12 48Z" fill="#9c8ac1" /></g></g>}
    {kind === "sigils" && <g className="miniature-idle"><path d="m31 88 9-64h70l11 64q-45 17-90 0Z" fill="#a5b49c" stroke="#c9b07c" strokeWidth="3" /><g transform="translate(42 28)">{[0,1,2,3].map(n=><g key={n} transform={`translate(${n%2*34} ${Math.floor(n/2)*28})`}><rect width="30" height="25" rx="4" fill="#466e60" stroke="#d0c28b" /><path d={n%2?"M0 13h15v12":"M15 0v13h15"} fill="none" stroke="#c7e9a4" strokeWidth="4" /><circle cx="15" cy="13" r="3" fill="#f9df96" /></g>)}</g><circle className="sigil-lamp" cx="75" cy="91" r="3" fill="#dfffaf" /></g>}
    {kind === "echo" && <g className="miniature-idle"><path d="M30 84 41 55h68l12 29v10q-44 13-91 0Z" fill="#c69eb4" stroke="#e7c58b" strokeWidth="2" /><ellipse cx="75" cy="82" rx="43" ry="12" fill="#d8bbda" stroke="#f4d79a" /><g className="miniature-moon"><path d="M87 15a28 28 0 1 0 6 47 25 25 0 0 1-6-47Z" fill="#ffe2a2" stroke="#d6b578" /><path d="m100 21 3 8 8 1-6 5 1 8-7-4-7 4 2-8-6-5 8-1Z" fill="#e0caed" /></g><path d="M63 82h24" stroke="#edcf91" strokeWidth="4" /></g>}
    {kind === "ice-fire" && <g><ellipse cx="75" cy="92" rx="54" ry="7" fill="#d0b3a4" /><g className="miniature-fire"><path d="M22 49Q22 31 40 12q-2 14 10 18 8 9 8 23 0 26-18 27-23-4-18-31Z" fill="#ee9b79" stroke="#c97761" strokeWidth="2" /><path d="M35 59q-5-13 5-24 1 8 7 11 8 15-3 24Z" fill="#ffd99b" /><circle cx="32" cy="49" r="2.5" fill="#644a56" /><circle cx="49" cy="49" r="2.5" fill="#644a56" /><path d="M31 78v11m17-11v11" stroke="#c87962" strokeWidth="5" strokeLinecap="round" /></g><g className="miniature-water"><path d="M91 14Q73 38 74 55q-1 26 22 27 24-3 24-23 0-20-29-45Z" fill="#a6cee5" stroke="#7caecb" strokeWidth="2" /><path d="M88 29q-12 20-7 30" fill="none" stroke="#e3f6ff" strokeWidth="4" strokeLinecap="round" /><circle cx="87" cy="54" r="2.5" fill="#576681" /><circle cx="106" cy="54" r="2.5" fill="#576681" /><path d="M87 80v10m18-10v10" stroke="#7caecb" strokeWidth="5" strokeLinecap="round" /></g></g>}
    {kind === "aquarium" && <g><rect x="18" y="17" width="115" height="77" rx="10" fill="#e7f7fa" fillOpacity=".5" stroke="#b4d3cf" strokeWidth="3" /><path d="M21 40q28-6 55 0t54 0v43q0 8-8 8H29q-8 0-8-8Z" fill="#b4e3df" fillOpacity=".72" /><path d="M24 86q51-7 103 0v5H24Z" fill="#dac49d" /><path d="M34 86q-12-20 3-30m4 31q15-19 3-26M116 86q12-24-3-35" fill="none" stroke="#8eb99d" strokeWidth="5" strokeLinecap="round" /><g className="miniature-fish"><path d="m59 59-14-10v21l14-8q18 18 32-2-17-19-32-1Z" fill="#f3af89" stroke="#d68e74" /><circle cx="81" cy="58" r="2" fill="#695966" /></g><g className="aquarium-bubbles" fill="none" stroke="#f8ffff" strokeWidth="2"><circle cx="100" cy="69" r="3" /><circle cx="108" cy="50" r="2" /><circle cx="98" cy="31" r="3" /></g><path d="M23 22h104" stroke="#fff" strokeWidth="2" opacity=".8" /></g>}
  </svg>;
}

export function GameRoom({ onBack, onLaunch, onRankings }: { onBack: () => void; onLaunch: (id: MiniGameId) => void; onRankings: () => void }) {
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [softLight, setSoftLight] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const consoleTrigger = useRef<HTMLButtonElement>(null);
  const catalogueTrigger = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!consoleOpen && !catalogueOpen) return;
    closeRef.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setConsoleOpen(false); setCatalogueOpen(false); (consoleOpen ? consoleTrigger : catalogueTrigger).current?.focus(); }
      if (event.key === "Tab") {
        const controls = dialogRef.current?.querySelectorAll<HTMLElement>("button, a[href]");
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [consoleOpen, catalogueOpen]);
  const rememberReturn = () => { try { window.sessionStorage.setItem(GAME_ROOM_RETURN_KEY, "game-room"); } catch { /* Direct return link remains available. */ } };
  const launch = (id: MiniGameId) => { setCatalogueOpen(false); onLaunch(id); };
  const closeDialog = () => { setConsoleOpen(false); setCatalogueOpen(false); (consoleOpen ? consoleTrigger : catalogueTrigger).current?.focus(); };
  return <section className={`lounge-game-room ${softLight ? "game-room-soft-light" : ""}`} aria-label="温暖明亮的天命游戏室">
    <header className="game-room-toolbar"><button type="button" onClick={onBack}>← 返回 Lounge</button><div><small>THE SUNNY SIDE OF SCHICKSAL</small><h1>八音盒里的游艺室</h1></div><button ref={catalogueTrigger} type="button" onClick={() => setCatalogueOpen(true)}>游戏目录</button><button type="button" onClick={onRankings}>成绩簿</button><button type="button" aria-pressed={softLight} onClick={() => setSoftLight(v=>!v)}>{softLight ? "午后阳光" : "柔和灯光"}</button></header>
    <div className="game-room-stage">
      <Image className="game-room-art" src="/lounge-game-room-v1.webp" alt="奶油、薄荷绿与蜜桃色的温馨游戏室，大沙发上铺着淡紫针织毯，花朵灯和蘑菇灯照亮游戏机、双手柄与玻璃陈列柜" fill sizes="(max-width: 760px) 100vw, calc(100vw - 64px)" priority unoptimized />
      <div className="game-room-sunbeam" aria-hidden="true" />
      <nav className="game-cabinet" aria-label="玻璃陈列柜中的游戏摆件">{GAME_CABINET.map((game,index) => {
        const style={"--prop-x":`${game.x}%`,"--prop-base":`${game.baseY}%`,"--prop-delay":`${index*-.4}s`} as CSSProperties;
        const content=<><CabinetMiniature kind={game.id} /><span className="cabinet-game-name"><strong>{game.name}</strong><small>{game.object}</small></span></>;
        return game.kind === "route" ? <a className={`cabinet-game game-${game.id}`} key={game.id} href={game.href} style={style} onClick={rememberReturn} aria-label={`${game.object}：打开${game.name}`}>{content}</a> : <button className={`cabinet-game game-${game.id}`} key={game.id} type="button" style={style} onClick={() => launch(game.gameId)} aria-label={`${game.object}：打开${game.name}`}>{content}</button>;
      })}<div className="cabinet-empty-place" aria-label="留给未来收藏的空柜位"><span>✧</span></div></nav>
      <button ref={consoleTrigger} className="game-room-console" type="button" onClick={() => setConsoleOpen(true)} aria-label="查看游戏机与双人手柄"><span>游戏机 · 双人游戏角</span></button>
      <button className="game-room-door" type="button" onClick={onBack} aria-label="从门口返回主 Lounge"><span>返回 Lounge</span></button>
      <button className="game-room-lamp" type="button" onClick={() => setSoftLight(v=>!v)} aria-label="切换花朵灯的柔和灯光" aria-pressed={softLight}><span>把灯调柔一点</span></button>
    </div>
    <footer className="game-room-caption"><span>✦</span><p>柜子里每一件小收藏，都藏着一场游戏。</p><button type="button" onClick={() => setCatalogueOpen(true)}>选一件，开始玩 →</button></footer>
    {(catalogueOpen || consoleOpen) && <div className="game-room-dialog-layer"><button className="game-room-dialog-scrim" type="button" onClick={closeDialog} aria-label="关闭游戏室说明" /><section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="game-room-dialog-title" className="game-room-dialog"><button ref={closeRef} className="game-room-dialog-close" type="button" onClick={closeDialog} aria-label="关闭">×</button><small>{catalogueOpen ? "THE LITTLE COLLECTION" : "A PLACE FOR TWO"}</small><h2 id="game-room-dialog-title">{catalogueOpen ? "今天想玩哪一件？" : "给两个人留的游戏角"}</h2>{catalogueOpen ? <div className="game-room-game-list">{GAME_CABINET.map(game=>game.kind === "route" ? <a key={game.id} href={game.href} onClick={rememberReturn}><CabinetMiniature kind={game.id} /><span>{game.name}<small>{game.object}</small></span><b>↗</b></a> : <button key={game.id} type="button" onClick={()=>launch(game.gameId)}><CabinetMiniature kind={game.id} /><span>{game.name}<small>{game.object}</small></span><b>→</b></button>)}</div> : <><div className="game-room-controller" aria-hidden="true">✚ <i>● ●</i></div><p>游戏机和两只手柄已经有了自己的位置。将来可以从这里打开《双人成行》等双人游戏的启动或邀请入口。</p><p>目前还没有连接电脑上的游戏或串流服务，所以这里暂时不能直接启动《双人成行》。陈列柜里的小游戏现在就能玩。</p><button type="button" className="game-room-primary" onClick={()=>{setConsoleOpen(false);setCatalogueOpen(true)}}>先去陈列柜挑一个</button></>}</section></div>}
  </section>;
}
