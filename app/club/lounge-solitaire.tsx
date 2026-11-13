"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type MouseEvent as ReactMouseEvent } from "react";
import { useGameRecords } from "./minigames/use-game-records";
import { LoungeLeaderboard } from "./minigames/lounge-leaderboard";
import {
  applyMove,
  cardForMove,
  cloneGame,
  createVerifiedGame,
  findHint,
  hashState,
  isValidRun,
  moveKey,
  rankLabel,
  sameSource,
  selectedCards,
  SUIT_ORDER,
  SUITS,
  tryMove,
  type Card,
  type GameMove,
  type GameState,
  type Source,
  type Target,
} from "./solitaire-engine";

type EmblemBlade = { index: number; color: string };

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function FateEmblem({ blades, small = false }: { blades: readonly EmblemBlade[]; small?: boolean }) {
  return <span className={`fate-emblem ${small ? "small" : ""}`} aria-hidden="true">
    {blades.map((blade) => <i key={blade.index} style={{ "--blade-index": blade.index, "--blade-color": blade.color } as CSSProperties} />)}
    <b>S</b>
  </span>;
}

function CardBack({ blades }: { blades: readonly EmblemBlade[] }) {
  return <span className="fate-card-back"><i /><FateEmblem blades={blades} /><small>THE FIRST EMPIRE</small></span>;
}

type FateCardProps = {
  card: Card;
  blades: readonly EmblemBlade[];
  selected?: boolean;
  hinted?: boolean;
  dealOrder?: number;
  className?: string;
  draggable?: boolean;
  onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onDoubleClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void;
};

function FateCard({ card, blades, selected, hinted, dealOrder = 0, className = "", draggable = false, onClick, onDoubleClick, onDragStart }: FateCardProps) {
  const suit = SUITS[card.suit];
  return <button
    type="button"
    className={`fate-card ${card.faceUp ? `face-up suit-${card.suit} family-${suit.family}` : "face-down"} ${selected ? "selected" : ""} ${hinted ? "hinted" : ""} ${className}`}
    style={{ "--deal-order": dealOrder } as CSSProperties}
    aria-label={card.faceUp ? `${suit.name} ${rankLabel(card.rank)}` : "天命牌背"}
    draggable={draggable}
    onClick={onClick}
    onDoubleClick={onDoubleClick}
    onDragStart={onDragStart}
  >
    {card.faceUp ? <>
      <span className="fate-card-corner"><strong>{rankLabel(card.rank)}</strong><i>{suit.symbol}</i></span>
      <span className="fate-card-center"><b>{suit.symbol}</b><small>{card.rank > 10 ? ["HERALD", "ORACLE", "SOVEREIGN"][card.rank - 11] : suit.shortName}</small></span>
      <span className="fate-card-corner mirrored"><strong>{rankLabel(card.rank)}</strong><i>{suit.symbol}</i></span>
    </> : <CardBack blades={blades} />}
  </button>;
}

export function LoungeSolitaireDeckFigure({ blades }: { blades: readonly EmblemBlade[] }) {
  return <span className="club-solitaire-stack" aria-hidden="true"><i /><i /><span><CardBack blades={blades} /></span></span>;
}

export function LoungeSolitaireDeck({ blades, onOpen }: { blades: readonly EmblemBlade[]; onOpen: () => void }) {
  return <button className="club-solitaire-deck" type="button" onClick={onOpen} aria-label="拿起桌上的天命纸牌，开始 Lounge Solitaire">
    <LoungeSolitaireDeckFigure blades={blades} />
    <span className="club-solitaire-deck-label">LOUNGE SOLITAIRE</span>
  </button>;
}

export function LoungeSolitaire({ blades, onClose, citizenId, backLabel = "返回 Lounge" }: { blades: readonly EmblemBlade[]; onClose: () => void; citizenId: string; backLabel?: string }) {
  const [game, setGame] = useState<GameState>(() => createVerifiedGame(0));
  const [history, setHistory] = useState<GameState[]>([]);
  const [selected, setSelected] = useState<Source | null>(null);
  const [dragSource, setDragSource] = useState<Source | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState("月光已经洗好牌。暖色与冷色交替，A 至 K 归入四座命运塔。");
  const [hintCard, setHintCard] = useState<string | null>(null);
  const [hintTarget, setHintTarget] = useState<string | null>(null);
  const [hintBusy, setHintBusy] = useState(false);
  const [positionVerdict, setPositionVerdict] = useState<"verified" | "unknown" | "unsolved" | "limit">("verified");
  const [lastHintReason, setLastHintReason] = useState<string | null>(null);
  const [solverDiagnostic, setSolverDiagnostic] = useState<{ status: string; nodesSearched: number; pathLength: number } | null>(null);
  const [burst, setBurst] = useState<{ id: number; x: number; y: number } | null>(null);
  const [sound, setSound] = useState(true);
  const [rankingsOpen, setRankingsOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const hintTimerRef = useRef<number | null>(null);
  const burstIdRef = useRef(0);
  const dealIndexRef = useRef(0);
  const hintRequestRef = useRef(0);
  const recentHintsRef = useRef<Array<{ move: string; resultHash: string }>>([]);
  const knownSolvableRef = useRef(new Set([hashState(game)]));
  const totalFoundation = useMemo(() => SUIT_ORDER.reduce((sum, suit) => sum + game.foundations[suit].length, 0), [game.foundations]);
  const won = totalFoundation === 52;
  const records = useGameRecords("solitaire", citizenId, rankingsOpen || hidden || won);
  const closeRankings = useCallback(() => setRankingsOpen(false), []);
  useEffect(() => { records.onSnapshot(game); }, [game, records.onSnapshot]);
  useEffect(() => {
    const update = () => setHidden(document.hidden); document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    if (won || rankingsOpen || hidden) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [game.seed, hidden, rankingsOpen, won]);

  useEffect(() => () => {
    hintRequestRef.current += 1;
    if (hintTimerRef.current !== null) window.clearTimeout(hintTimerRef.current);
    if (audioRef.current) void audioRef.current.close();
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as typeof window & { __SCHICKSAL_SOLITAIRE_DEBUG__?: unknown }).__SCHICKSAL_SOLITAIRE_DEBUG__ = {
      dealSeed: game.seed,
      solverVerified: game.deal.solverVerified,
      solutionLength: game.deal.solutionLength,
      dealNodesSearched: game.deal.nodesSearched,
      currentStateSolvable: positionVerdict,
      hintReason: lastHintReason,
      hintSolver: solverDiagnostic,
      stateHash: hashState(game),
      stockPasses: game.stockPasses,
    };
  }, [game, lastHintReason, positionVerdict, solverDiagnostic]);

  const playTone = (kind: "draw" | "move" | "foundation" | "invalid" | "win") => {
    if (!sound) return;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = audioRef.current ?? new AudioContextClass();
    audioRef.current = context;
    const now = context.currentTime;
    const frequencies = kind === "win" ? [523.25, 659.25, 783.99, 1046.5] : kind === "foundation" ? [493.88, 739.99] : kind === "invalid" ? [164.81] : kind === "draw" ? [293.66] : [392, 587.33];
    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = kind === "invalid" ? "sine" : index % 2 ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      const start = now + index * .075;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(kind === "invalid" ? .025 : .035, start + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, start + (kind === "win" ? .42 : .2));
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + (kind === "win" ? .45 : .23));
    });
  };

  const castBurst = (event?: { clientX: number; clientY: number }) => {
    burstIdRef.current += 1;
    setBurst({ id: burstIdRef.current, x: event?.clientX ?? window.innerWidth / 2, y: event?.clientY ?? window.innerHeight / 2 });
  };

  const commit = (next: GameState, message: string, tone: "draw" | "move" | "foundation", event?: { clientX: number; clientY: number }) => {
    if (rankingsOpen || hidden || won) return;
    const completesGame = SUIT_ORDER.every((suit) => next.foundations[suit].length === 13);
    hintRequestRef.current += 1;
    setHistory((current) => [...current.slice(-39), game]);
    setGame(next);
    setPositionVerdict(knownSolvableRef.current.has(hashState(next)) ? "verified" : "unknown");
    setHintBusy(false);
    setSelected(null);
    setHintCard(null);
    setHintTarget(null);
    setStatus(completesGame ? "四座命运塔已经完整。今晚，天命站在你这一边。" : message);
    playTone(completesGame ? "win" : tone);
    castBurst(event);
  };

  const reject = (message = "这两张牌的命运暂时不能相接。") => {
    setStatus(message);
    playTone("invalid");
  };

  const moveTo = (target: Target, event?: { clientX: number; clientY: number }, source = selected) => {
    if (!source) return false;
    const next = tryMove(game, source, target);
    if (!next) { reject(); return false; }
    const message = target.zone === "foundation" ? `${SUITS[target.suit].name}命运塔接纳了一张牌。` : `牌阵重新排列，新的路径已经显现。`;
    commit(next, message, target.zone === "foundation" ? "foundation" : "move", event);
    return true;
  };

  const chooseSource = (source: Source, event?: ReactMouseEvent<HTMLButtonElement>) => {
    if (selected && !sameSource(selected, source)) {
      const target: Target | null = source.zone === "tableau" ? { zone: "tableau", column: source.column } : source.zone === "foundation" ? { zone: "foundation", suit: source.suit } : null;
      if (target && moveTo(target, event)) return;
    }
    if (sameSource(selected, source)) {
      setSelected(null);
      setStatus("选择已经收回。");
      return;
    }
    const cards = selectedCards(game, source);
    if (!cards.length || !isValidRun(cards)) { reject("这组牌还没有形成可以移动的命运序列。"); return; }
    setSelected(source);
    setStatus(cards.length > 1 ? `已选中 ${cards.length} 张连续牌。请选择新的落点。` : `已选中 ${SUITS[cards[0].suit].name} ${rankLabel(cards[0].rank)}。`);
  };

  const autoFoundation = (source: Source, event?: ReactMouseEvent<HTMLButtonElement>) => {
    const cards = selectedCards(game, source);
    if (cards.length !== 1) return reject("只有单张牌可以进入命运塔。");
    const next = tryMove(game, source, { zone: "foundation", suit: cards[0].suit });
    if (!next) return reject("命运塔正在等待更低一级的同元素牌。");
    commit(next, `${SUITS[cards[0].suit].name} ${rankLabel(cards[0].rank)} 自动归位。`, "foundation", event);
  };

  const drawStock = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (!game.stock.length && !game.waste.length) return reject("牌库已经空了，所有可见路径都在桌面上。");
    const next = applyMove(game, { type: "draw" });
    if (!next) return reject();
    commit(next, next.waste.length ? "牌库翻开一张新的天命牌。" : "弃牌堆沿月相回到了牌库。", "draw", event);
  };

  const flipExposed = (column: number, event: ReactMouseEvent<HTMLButtonElement>) => {
    const pile = game.tableau[column];
    const top = pile.at(-1);
    if (!top || top.faceUp) return;
    const next = cloneGame(game);
    next.tableau[column][next.tableau[column].length - 1].faceUp = true;
    next.moves += 1;
    next.action += 1;
    commit(next, "月光翻开了被遮住的牌。", "move", event);
  };

  const dropOn = (target: Target, event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    if (dragSource) moveTo(target, event, dragSource);
    setDragSource(null);
  };

  const beginDrag = (source: Source, event: DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", "schicksal-fate-card");
    setDragSource(source);
  };

  const rememberWinningPath = (start: GameState, path: readonly GameMove[]) => {
    let cursor = cloneGame(start);
    knownSolvableRef.current.add(hashState(cursor));
    path.forEach((move) => {
      const next = applyMove(cursor, move);
      if (!next) return;
      cursor = next;
      knownSolvableRef.current.add(hashState(cursor));
    });
  };

  const showHint = async () => {
    if (hintBusy) return;
    if (hintTimerRef.current !== null) window.clearTimeout(hintTimerRef.current);
    const request = ++hintRequestRef.current;
    const stateAtRequest = game;
    const historyHashes = [...history.slice(-14).map(hashState), hashState(game)];
    setHintBusy(true);
    setStatus("水晶正在推演不会回环的可胜路径……");
    const hint = await findHint(stateAtRequest, {
      recentStateHashes: historyHashes,
      recentHintMoveKeys: recentHintsRef.current.map((entry) => entry.move),
      recentHintResultHashes: recentHintsRef.current.map((entry) => entry.resultHash),
      shallowDepth: 3,
      solverMaxNodes: 180000,
      solverMaxMs: 4500,
      requireSolvableContinuation: positionVerdict === "unknown",
    });
    if (request !== hintRequestRef.current) return;
    setHintBusy(false);
    setLastHintReason(hint.reason);
    if (hint.solver) {
      setSolverDiagnostic({ status: hint.solver.status, nodesSearched: hint.solver.nodesSearched, pathLength: hint.solver.path.length });
      if (hint.solver.status === "solved") {
        rememberWinningPath(stateAtRequest, hint.solver.path);
        setPositionVerdict("verified");
      }
    }
    if (hint.status !== "move") {
      setStatus(hint.reason);
      setHintCard(null);
      setHintTarget(null);
      if (hint.status === "unsolved" || hint.status === "limit") setPositionVerdict(hint.status);
      return;
    }
    const movingCard = cardForMove(stateAtRequest, hint.move);
    setStatus(hint.reason);
    setHintCard(hint.move.type === "draw" ? null : movingCard?.id ?? null);
    setHintTarget(hint.move.type === "draw" ? "stock" : hint.move.target.zone === "foundation" ? `foundation-${hint.move.target.suit}` : `tableau-${hint.move.target.column}`);
    recentHintsRef.current = [...recentHintsRef.current.slice(-7), { move: moveKey(hint.move), resultHash: hint.resultHash }];
    hintTimerRef.current = window.setTimeout(() => { setHintCard(null); setHintTarget(null); }, 2400);
  };

  const undo = () => {
    if (!history.length) return reject("时间卷轴里还没有可以撤回的动作。");
    let targetIndex = history.length - 1;
    if (positionVerdict === "unsolved" || positionVerdict === "limit") {
      for (let index = history.length - 1; index >= 0; index -= 1) {
        if (knownSolvableRef.current.has(hashState(history[index]))) {
          targetIndex = index;
          break;
        }
      }
    }
    const previous = history[targetIndex];
    hintRequestRef.current += 1;
    setGame(previous);
    setHistory((current) => current.slice(0, targetIndex));
    setPositionVerdict(knownSolvableRef.current.has(hashState(previous)) ? "verified" : "unknown");
    setHintBusy(false);
    setSelected(null);
    setHintCard(null);
    setHintTarget(null);
    setStatus(targetIndex === history.length - 1 ? "时间卷轴倒转了一步。" : "时间卷轴已回到最近的可解状态。");
    playTone("move");
  };

  const newGame = () => {
    records.beginRun();
    dealIndexRef.current += 1;
    const next = createVerifiedGame(dealIndexRef.current);
    hintRequestRef.current += 1;
    knownSolvableRef.current = new Set([hashState(next)]);
    recentHintsRef.current = [];
    setGame(next);
    setHistory([]);
    setSelected(null);
    setHintBusy(false);
    setHintCard(null);
    setHintTarget(null);
    setPositionVerdict("verified");
    setLastHintReason(null);
    setSolverDiagnostic(null);
    setSeconds(0);
    setStatus("新的可解牌阵已经由月光验证并洗好。");
    playTone("draw");
  };

  const waste = game.waste.at(-1);

  return <section className="lounge-solitaire" aria-label="Lounge Solitaire 天命纸牌">
    <div className="solitaire-room-veil" aria-hidden="true" />
    <header className="solitaire-header">
      <button type="button" className="solitaire-back" onClick={onClose}>{backLabel}</button>
      <div className="solitaire-title"><FateEmblem blades={blades} small /><span><small>THE COMMITTEE’S PRIVATE PATIENCE</small><h1>LOUNGE SOLITAIRE</h1><p>天命纸牌</p></span></div>
      <div className="solitaire-stats"><span><small>TIME</small><strong>{formatTime(seconds)}</strong></span><span><small>MOVES</small><strong>{records.totalMoves}</strong></span><span><small>FATE</small><strong>{totalFoundation}/52</strong></span></div>
      <nav className="solitaire-actions" aria-label="纸牌控制">
        <button type="button" onClick={() => { void records.flush(); setRankingsOpen(true); }}>排行榜</button>
        <button type="button" onClick={() => void showHint()} disabled={hintBusy}>{hintBusy ? "推演中…" : "月相提示"}</button>
        <button type="button" onClick={undo} disabled={!history.length}>撤回</button>
        <button type="button" onClick={() => setSound((value) => !value)} aria-pressed={sound}>{sound ? "声音开" : "声音关"}</button>
        <button type="button" onClick={newGame}>新牌局</button>
      </nav>
    </header>
    <p className="game-records-status" role="status">{records.syncStatus}<button type="button" onClick={() => void records.flush()}>同步纪录</button></p>

    <div className="solitaire-scroll">
      <main className="solitaire-table">
        <div className="solitaire-status" role="status" aria-live="polite"><i />{status}</div>
        <section className="solitaire-upper" aria-label="牌库与命运塔">
          <div className="solitaire-draw-zone">
            <div className="solitaire-pile-wrap"><small>牌库</small>{game.stock.length ? <FateCard card={game.stock.at(-1)!} blades={blades} hinted={hintTarget === "stock"} className="stock-card" onClick={drawStock} /> : <button className={`fate-placeholder recycle ${hintTarget === "stock" ? "hinted" : ""}`} type="button" onClick={drawStock} aria-label="把弃牌重新放回牌库">↻<small>MOON CYCLE</small></button>}</div>
            <div className="solitaire-pile-wrap"><small>翻牌</small>{waste ? <FateCard card={waste} blades={blades} selected={sameSource(selected, { zone: "waste" })} hinted={hintCard === waste.id} draggable onClick={(event) => chooseSource({ zone: "waste" }, event)} onDoubleClick={(event) => autoFoundation({ zone: "waste" }, event)} onDragStart={(event) => beginDrag({ zone: "waste" }, event)} /> : <div className="fate-placeholder" aria-hidden="true">☾</div>}</div>
          </div>
          <div className="solitaire-foundations">
            {SUIT_ORDER.map((suit) => {
              const pile = game.foundations[suit];
              const card = pile.at(-1);
              const targetKey = `foundation-${suit}`;
              return <div className={`solitaire-pile-wrap foundation suit-${suit} ${hintTarget === targetKey ? "hinted-target" : ""}`} key={suit} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropOn({ zone: "foundation", suit }, event)}>
                <small>{SUITS[suit].name}</small>
                {card ? <FateCard card={card} blades={blades} selected={sameSource(selected, { zone: "foundation", suit })} hinted={hintCard === card.id} draggable onClick={(event) => chooseSource({ zone: "foundation", suit }, event)} onDragStart={(event) => beginDrag({ zone: "foundation", suit }, event)} /> : <button type="button" className="fate-placeholder foundation-empty" onClick={(event) => moveTo({ zone: "foundation", suit }, event)} aria-label={`把 A 放入${SUITS[suit].name}命运塔`}><b>{SUITS[suit].symbol}</b><span>A → K</span></button>}
              </div>;
            })}
          </div>
        </section>

        <section className="solitaire-tableau" aria-label="七列牌阵">
          {game.tableau.map((pile, column) => {
            let top = 0;
            const positions = pile.map((card) => {
              const position = top;
              top += card.faceUp ? 31 : 16;
              return position;
            });
            const targetKey = `tableau-${column}`;
            return <div className={`solitaire-column ${hintTarget === targetKey ? "hinted-target" : ""}`} key={column} style={{ "--column-height": `${Math.max(132, top + 112)}px` } as CSSProperties} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropOn({ zone: "tableau", column }, event)} onClick={(event) => { if (event.currentTarget === event.target && selected) moveTo({ zone: "tableau", column }, event); }}>
              {!pile.length && <button type="button" className="fate-placeholder tableau-empty" onClick={(event) => { event.stopPropagation(); moveTo({ zone: "tableau", column }, event); }} aria-label={`把 K 放到第 ${column + 1} 列`}><FateEmblem blades={blades} small /><span>KING’S SEAT</span></button>}
              {pile.map((card, cardIndex) => {
                const source: Source = { zone: "tableau", column, cardIndex };
                const isTopHidden = !card.faceUp && cardIndex === pile.length - 1;
                return <div className="solitaire-card-position" key={card.id} style={{ top: positions[cardIndex], zIndex: cardIndex + 1 }}>
                  <FateCard
                    card={card}
                    blades={blades}
                    dealOrder={column * 2 + cardIndex}
                    selected={card.faceUp && selected?.zone === "tableau" && selected.column === column && cardIndex >= selected.cardIndex}
                    hinted={hintCard === card.id}
                    draggable={card.faceUp}
                    onClick={(event) => { event.stopPropagation(); if (isTopHidden) flipExposed(column, event); else if (card.faceUp) chooseSource(source, event); }}
                    onDoubleClick={(event) => { event.stopPropagation(); if (card.faceUp) autoFoundation(source, event); }}
                    onDragStart={(event) => beginDrag(source, event)}
                  />
                </div>;
              })}
            </div>;
          })}
        </section>
        <footer className="solitaire-rules"><span>暖色 / 冷色交替</span><i /><span>K 进入空列</span><i /><span>双击自动归塔</span><i /><span>拖动或点击均可</span></footer>
      </main>
    </div>

    {burst && <div className="solitaire-spell-burst" key={burst.id} style={{ left: burst.x, top: burst.y }} aria-hidden="true">{blades.map((blade) => <i key={blade.index} style={{ "--burst-index": blade.index, "--burst-color": blade.color } as CSSProperties} />)}</div>}
    {won && !rankingsOpen && <div className="solitaire-victory" role="dialog" aria-modal="true" aria-label="纸牌胜利">
      <div><FateEmblem blades={blades} /><small>THE FATES ALIGN</small><h2>今晚，天命属于你</h2><p>{game.moves} 步 · {formatTime(seconds)}</p><button type="button" onClick={newGame}>再开一局</button><button type="button" onClick={() => { void records.flush(); setRankingsOpen(true); }}>查看排行榜</button><button type="button" onClick={onClose}>回到 Lounge</button></div>
    </div>}
    {rankingsOpen && <LoungeLeaderboard citizenId={citizenId} initialGame="solitaire" onClose={closeRankings} />}
  </section>;
}

