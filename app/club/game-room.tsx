"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { GAME_CABINET } from "./game-room-catalogue";
import { rememberGameRoomReturn } from "./game-room-return";
import { LoungeSolitaireDeckFigure } from "./lounge-solitaire";
import type { EmblemBlade, MiniGameId } from "./minigames/mini-game-types";

const COLLECTIBLE_CELLS: Record<string, [number, number]> = {
  potion: [0, 1], merge: [1, 1], sigils: [2, 1],
  echo: [0, 2], "ice-fire": [1, 2], aquarium: [2, 2],
};

function CabinetMiniature({ kind, emblemBlades }: { kind: string; emblemBlades: readonly EmblemBlade[] }) {
  if (kind === "solitaire") return <span className="cabinet-miniature miniature-solitaire" aria-hidden="true"><span className="cabinet-original-solitaire"><LoungeSolitaireDeckFigure blades={emblemBlades} /></span></span>;
  const [column, row] = COLLECTIBLE_CELLS[kind] ?? [0, 1];
  return <span className={`cabinet-miniature miniature-${kind}`} aria-hidden="true"><span className="sculpture-sprite cabinet-object-sculpture" style={{ "--sprite-x": `${column * 50}%`, "--sprite-y": `${row * 50}%` } as CSSProperties} /></span>;
}

export function GameRoom({ onBack, onLaunch, onRankings, emblemBlades }: { emblemBlades: readonly EmblemBlade[]; onBack: () => void; onLaunch: (id: MiniGameId) => void; onRankings: () => void }) {
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
  const rememberReturn = () => rememberGameRoomReturn(window);
  const launch = (id: MiniGameId) => { setCatalogueOpen(false); onLaunch(id); };
  const closeDialog = () => { setConsoleOpen(false); setCatalogueOpen(false); (consoleOpen ? consoleTrigger : catalogueTrigger).current?.focus(); };
  return <section className={`lounge-game-room ${softLight ? "game-room-soft-light" : ""}`} aria-label="温暖明亮的天命游戏室">
    <header className="game-room-toolbar"><button type="button" onClick={onBack}>← 返回 Lounge</button><div><small>THE SUNNY SIDE OF SCHICKSAL</small><h1>八音盒里的游艺室</h1></div><button ref={catalogueTrigger} type="button" onClick={() => setCatalogueOpen(true)}>游戏目录</button><button type="button" onClick={onRankings}>成绩簿</button><button type="button" aria-pressed={softLight} onClick={() => setSoftLight(v=>!v)}>{softLight ? "午后阳光" : "柔和灯光"}</button></header>
    <div className="game-room-stage">
      <Image className="game-room-art" src="/lounge-game-room-v1.webp" alt="奶油、薄荷绿与蜜桃色的温馨游戏室，大沙发上铺着淡紫针织毯，花朵灯和蘑菇灯照亮游戏机、双手柄与玻璃陈列柜" fill sizes="(max-width: 760px) 100vw, calc(100vw - 64px)" priority unoptimized />
      <div className="game-room-sunbeam" aria-hidden="true" />
      <nav className="game-cabinet" aria-label="玻璃陈列柜中的游戏摆件">{GAME_CABINET.map((game,index) => {
        const style={"--prop-x":`${game.x}%`,"--prop-base":`${game.baseY}%`,"--prop-delay":`${index*-.4}s`} as CSSProperties;
        const content=<><CabinetMiniature kind={game.id} emblemBlades={emblemBlades} /><span className="cabinet-game-name"><strong>{game.name}</strong><small>{game.object}</small></span></>;
        return game.kind === "route" ? <a className={`cabinet-game game-${game.id}`} key={game.id} href={game.href} style={style} onClick={rememberReturn} aria-label={`${game.object}：打开${game.name}`}>{content}</a> : <button className={`cabinet-game game-${game.id}`} key={game.id} type="button" style={style} onClick={() => launch(game.gameId)} aria-label={`${game.object}：打开${game.name}`}>{content}</button>;
      })}<div className="cabinet-empty-place" aria-label="留给未来收藏的空柜位"><span>✧</span></div></nav>
      <button ref={consoleTrigger} className="game-room-console" type="button" onClick={() => setConsoleOpen(true)} aria-label="查看游戏机与双人手柄"><span>游戏机 · 双人游戏角</span></button>
      <button className="game-room-door" type="button" onClick={onBack} aria-label="从门口返回主 Lounge"><span>返回 Lounge</span></button>
      <button className="game-room-lamp" type="button" onClick={() => setSoftLight(v=>!v)} aria-label="切换花朵灯的柔和灯光" aria-pressed={softLight}><span>把灯调柔一点</span></button>
    </div>
    <footer className="game-room-caption"><span>✦</span><p>柜子里每一件小收藏，都藏着一场游戏。</p><button type="button" onClick={() => setCatalogueOpen(true)}>选一件，开始玩 →</button></footer>
    {(catalogueOpen || consoleOpen) && <div className="game-room-dialog-layer"><button className="game-room-dialog-scrim" type="button" onClick={closeDialog} aria-label="关闭游戏室说明" /><section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="game-room-dialog-title" className="game-room-dialog"><button ref={closeRef} className="game-room-dialog-close" type="button" onClick={closeDialog} aria-label="关闭">×</button><small>{catalogueOpen ? "THE LITTLE COLLECTION" : "A PLACE FOR TWO"}</small><h2 id="game-room-dialog-title">{catalogueOpen ? "今天想玩哪一件？" : "给两个人留的游戏角"}</h2>{catalogueOpen ? <div className="game-room-game-list">{GAME_CABINET.map(game=>game.kind === "route" ? <a key={game.id} href={game.href} onClick={rememberReturn}><CabinetMiniature kind={game.id} emblemBlades={emblemBlades} /><span>{game.name}<small>{game.object}</small></span><b>↗</b></a> : <button key={game.id} type="button" onClick={()=>launch(game.gameId)}><CabinetMiniature kind={game.id} emblemBlades={emblemBlades} /><span>{game.name}<small>{game.object}</small></span><b>→</b></button>)}</div> : <><div className="game-room-controller" aria-hidden="true">✚ <i>● ●</i></div><p>游戏机和两只手柄已经有了自己的位置。将来可以从这里打开《双人成行》等双人游戏的启动或邀请入口。</p><p>目前还没有连接电脑上的游戏或串流服务，所以这里暂时不能直接启动《双人成行》。陈列柜里的小游戏现在就能玩。</p><button type="button" className="game-room-primary" onClick={()=>{setConsoleOpen(false);setCatalogueOpen(true)}}>先去陈列柜挑一个</button></>}</section></div>}
  </section>;
}
