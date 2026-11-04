"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  MERGE_TIERS,
  nextMergeTier,
  radiusForTier,
  stepMergePhysics,
  updateDangerTimer,
  type MergeBody,
} from "./merge-game-engine";
import type { EmblemBlade, MiniGameComponentProps, MiniGameController } from "./mini-game-types";

const WORLD_WIDTH = 460;
const WORLD_HEIGHT = 620;
const DANGER_LINE_Y = 104;
const DANGER_GRACE_MS = 1800;
const DROP_COOLDOWN_MS = 520;

type MergeSnapshot = {
  version: 1;
  bodies: MergeBody[];
  score: number;
  nextTier: number;
  rngSeed: number;
  nextId: number;
  gameOver: boolean;
};

type Spark = {
  x: number;
  y: number;
  bornAt: number;
  color: string;
  angle: number;
};

function isMergeBody(value: unknown): value is MergeBody {
  if (!value || typeof value !== "object") return false;
  const body = value as Partial<MergeBody>;
  return [body.id, body.tier, body.x, body.y, body.vx, body.vy, body.bornAt, body.popUntil].every((item) => typeof item === "number" && Number.isFinite(item));
}

function restoreMergeSnapshot(value: unknown): MergeSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as Partial<MergeSnapshot>;
  if (snapshot.version !== 1 || !Array.isArray(snapshot.bodies) || !snapshot.bodies.every(isMergeBody)) return null;
  if (![snapshot.score, snapshot.nextTier, snapshot.rngSeed, snapshot.nextId].every((item) => typeof item === "number" && Number.isFinite(item))) return null;
  return {
    version: 1,
    bodies: snapshot.bodies.map((body) => ({ ...body, tier: Math.max(0, Math.min(MERGE_TIERS.length - 1, Math.floor(body.tier))) })),
    score: snapshot.score!,
    nextTier: Math.max(0, Math.min(2, Math.floor(snapshot.nextTier!))),
    rngSeed: snapshot.rngSeed! >>> 0,
    nextId: Math.max(1, Math.floor(snapshot.nextId!)),
    gameOver: Boolean(snapshot.gameOver),
  };
}

function drawEightBladeCore(context: CanvasRenderingContext2D, radius: number, blades: readonly EmblemBlade[]) {
  const ordered = [...blades].sort((left, right) => left.index - right.index).slice(0, 8);
  context.save();
  context.rotate(-Math.PI / 2);
  ordered.forEach((blade, index) => {
    context.save();
    context.rotate(index * Math.PI / 4);
    const gradient = context.createLinearGradient(radius * .12, 0, radius * .92, 0);
    gradient.addColorStop(0, "rgba(245,235,213,.84)");
    gradient.addColorStop(.25, blade.color);
    gradient.addColorStop(1, blade.color);
    context.fillStyle = gradient;
    context.strokeStyle = "rgba(255,244,217,.72)";
    context.lineWidth = Math.max(1, radius * .022);
    context.beginPath();
    context.moveTo(radius * .08, 0);
    context.bezierCurveTo(radius * .28, -radius * .24, radius * .72, -radius * .22, radius * .92, 0);
    context.bezierCurveTo(radius * .72, radius * .22, radius * .28, radius * .24, radius * .08, 0);
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
  });
  context.fillStyle = "#efe2bd";
  context.strokeStyle = "rgba(67,43,79,.8)";
  context.lineWidth = Math.max(1, radius * .04);
  context.beginPath();
  context.arc(0, 0, radius * .18, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

function drawRelic(context: CanvasRenderingContext2D, body: MergeBody, now: number, blades: readonly EmblemBlade[]) {
  const tier = MERGE_TIERS[body.tier];
  const radius = radiusForTier(body.tier, WORLD_WIDTH);
  const pop = body.popUntil > now ? 1 + .14 * Math.sin((body.popUntil - now) / 280 * Math.PI) : 1;
  context.save();
  context.translate(body.x, body.y);
  context.scale(pop, pop);

  context.shadowColor = "rgba(8,2,14,.48)";
  context.shadowBlur = Math.max(3, radius * .2);
  context.shadowOffsetY = Math.max(2, radius * .12);
  const gradient = context.createRadialGradient(-radius * .3, -radius * .34, radius * .06, 0, 0, radius);
  gradient.addColorStop(0, "rgba(255,249,229,.98)");
  gradient.addColorStop(.32, tier.colors[0]);
  gradient.addColorStop(1, tier.colors[1]);
  context.fillStyle = gradient;
  context.strokeStyle = "rgba(238,218,176,.72)";
  context.lineWidth = Math.max(1.4, radius * .055);
  context.beginPath();
  context.arc(0, 0, radius * .93, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.shadowColor = "transparent";

  context.strokeStyle = "rgba(255,255,255,.3)";
  context.lineWidth = Math.max(1, radius * .025);
  context.beginPath();
  context.arc(-radius * .16, -radius * .18, radius * .54, Math.PI * 1.02, Math.PI * 1.55);
  context.stroke();

  if (body.tier === MERGE_TIERS.length - 1) {
    drawEightBladeCore(context, radius * .82, blades);
  } else {
    context.fillStyle = body.tier < 2 ? "rgba(255,255,255,.86)" : "rgba(255,240,205,.91)";
    context.font = `${Math.round(radius * 1.02)}px Georgia, serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(tier.glyph, 0, radius * .05);
  }
  context.restore();
}

function drawScene(
  canvas: HTMLCanvasElement,
  bodies: readonly MergeBody[],
  dropX: number,
  nextTier: number,
  dangerProgress: number,
  sparks: readonly Spark[],
  now: number,
  blades: readonly EmblemBlade[],
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const targetWidth = Math.max(1, Math.round(rect.width * ratio));
  const targetHeight = Math.max(1, Math.round(rect.height * ratio));
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }
  context.setTransform(canvas.width / WORLD_WIDTH, 0, 0, canvas.height / WORLD_HEIGHT, 0, 0);
  context.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  const room = context.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
  room.addColorStop(0, "rgba(17,9,28,.36)");
  room.addColorStop(.62, "rgba(12,7,20,.16)");
  room.addColorStop(1, "rgba(45,23,42,.24)");
  context.fillStyle = room;
  context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  context.save();
  context.strokeStyle = `rgba(207,111,119,${.22 + dangerProgress * .58})`;
  context.setLineDash([8, 9]);
  context.lineWidth = 1.4;
  context.beginPath();
  context.moveTo(18, DANGER_LINE_Y);
  context.lineTo(WORLD_WIDTH - 18, DANGER_LINE_Y);
  context.stroke();
  context.restore();

  const previewRadius = radiusForTier(nextTier, WORLD_WIDTH);
  context.save();
  context.globalAlpha = .52;
  context.strokeStyle = "rgba(229,208,167,.74)";
  context.setLineDash([3, 6]);
  context.beginPath();
  context.moveTo(dropX, 14);
  context.lineTo(dropX, 55);
  context.stroke();
  context.restore();
  drawRelic(context, { id: -1, tier: nextTier, x: dropX, y: Math.max(previewRadius + 5, 34), vx: 0, vy: 0, bornAt: 0, popUntil: 0 }, now, blades);

  bodies.forEach((body) => drawRelic(context, body, now, blades));

  sparks.forEach((spark) => {
    const age = (now - spark.bornAt) / 620;
    if (age < 0 || age > 1) return;
    const distance = 16 + age * 42;
    context.save();
    context.globalAlpha = 1 - age;
    context.translate(spark.x + Math.cos(spark.angle) * distance, spark.y + Math.sin(spark.angle) * distance);
    context.rotate(spark.angle + age);
    context.fillStyle = spark.color;
    context.fillRect(-1.5, -5 * (1 - age), 3, 10 * (1 - age));
    context.restore();
  });
}

export const MergeGame = forwardRef<MiniGameController, MiniGameComponentProps>(function MergeGame({
  initialState,
  paused,
  inputLocked,
  emblemBlades,
  onSnapshot,
  onNewRun,
  onScoreChange,
  onUndoAvailabilityChange,
  playSound,
}, ref) {
  const restoredRef = useRef(restoreMergeSnapshot(initialState));
  const restored = restoredRef.current;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bodiesRef = useRef<MergeBody[]>(restored?.bodies.map((body) => ({ ...body })) ?? []);
  const scoreRef = useRef(restored?.score ?? 0);
  const nextTierRef = useRef(restored?.nextTier ?? 0);
  const rngSeedRef = useRef(restored?.rngSeed ?? ((Date.now() ^ 0x51a7c0de) >>> 0));
  const nextIdRef = useRef(restored?.nextId ?? 1);
  const gameOverRef = useRef(restored?.gameOver ?? false);
  const dangerSinceRef = useRef<number | null>(null);
  const dangerProgressRef = useRef(0);
  const dangerUiRef = useRef(0);
  const dropXRef = useRef(WORLD_WIDTH / 2);
  const cooldownUntilRef = useRef(0);
  const lastFrameRef = useRef(0);
  const lastCollisionSoundRef = useRef(0);
  const sparksRef = useRef<Spark[]>([]);
  const [score, setScore] = useState(scoreRef.current);
  const [nextTier, setNextTier] = useState(nextTierRef.current);
  const [gameOver, setGameOver] = useState(gameOverRef.current);
  const [dangerProgress, setDangerProgress] = useState(0);

  const serializeState = useCallback((): MergeSnapshot => ({
    version: 1,
    bodies: bodiesRef.current.map((body) => ({ ...body })),
    score: scoreRef.current,
    nextTier: nextTierRef.current,
    rngSeed: rngSeedRef.current,
    nextId: nextIdRef.current,
    gameOver: gameOverRef.current,
  }), []);

  const snapshot = useCallback(() => onSnapshot(serializeState()), [onSnapshot, serializeState]);

  const resetGame = useCallback(() => {
    onNewRun();
    bodiesRef.current = [];
    scoreRef.current = 0;
    nextIdRef.current = 1;
    gameOverRef.current = false;
    dangerSinceRef.current = null;
    dangerProgressRef.current = 0;
    dangerUiRef.current = 0;
    sparksRef.current = [];
    const rolled = nextMergeTier((Date.now() ^ 0x3f91ab2d) >>> 0);
    rngSeedRef.current = rolled.seed;
    nextTierRef.current = rolled.tier;
    setScore(0);
    setNextTier(rolled.tier);
    setGameOver(false);
    setDangerProgress(0);
    playSound("select");
    window.setTimeout(snapshot, 0);
  }, [onNewRun, playSound, snapshot]);

  useImperativeHandle(ref, () => ({ serializeState, resetGame }), [resetGame, serializeState]);

  useEffect(() => {
    onScoreChange(score);
  }, [onScoreChange, score]);

  useEffect(() => {
    onUndoAvailabilityChange(false);
  }, [onUndoAvailabilityChange]);

  useEffect(() => {
    let frame = 0;
    const animate = (now: number) => {
      const previous = lastFrameRef.current || now;
      lastFrameRef.current = now;
      if (!paused && !inputLocked && !gameOverRef.current) {
        const elapsed = Math.min(.04, Math.max(0, (now - previous) / 1000));
        const substeps = elapsed > .018 ? 2 : 1;
        let newMerges = 0;
        let collisions = 0;
        for (let step = 0; step < substeps; step += 1) {
          const result = stepMergePhysics(bodiesRef.current, {
            width: WORLD_WIDTH,
            height: WORLD_HEIGHT,
            dt: elapsed / substeps,
            now,
            nextId: nextIdRef.current,
          });
          bodiesRef.current = result.bodies;
          nextIdRef.current = result.nextId;
          collisions += result.collisionCount;
          if (result.merges.length) {
            const gained = result.merges.reduce((total, merge) => total + merge.points, 0);
            scoreRef.current += gained;
            newMerges += result.merges.length;
            result.merges.forEach((merge) => {
              const color = MERGE_TIERS[merge.body.tier].colors[0];
              for (let ray = 0; ray < 9; ray += 1) sparksRef.current.push({ x: merge.body.x, y: merge.body.y, bornAt: now, color, angle: ray / 9 * Math.PI * 2 });
            });
          }
        }
        if (newMerges) {
          setScore(scoreRef.current);
          playSound("merge");
          snapshot();
        } else if (collisions && now - lastCollisionSoundRef.current > 460) {
          lastCollisionSoundRef.current = now;
          playSound("collision");
        }
        sparksRef.current = sparksRef.current.filter((spark) => now - spark.bornAt < 650);
        const danger = updateDangerTimer(bodiesRef.current, {
          width: WORLD_WIDTH,
          lineY: DANGER_LINE_Y,
          now,
          previousSince: dangerSinceRef.current,
          graceMs: DANGER_GRACE_MS,
        });
        dangerSinceRef.current = danger.since;
        dangerProgressRef.current = danger.progress;
        if (Math.abs(danger.progress - dangerUiRef.current) > .035
          || danger.progress === 0 && dangerUiRef.current !== 0
          || danger.progress === 1 && dangerUiRef.current !== 1) {
          dangerUiRef.current = danger.progress;
          setDangerProgress(danger.progress);
        }
        if (danger.gameOver) {
          gameOverRef.current = true;
          setGameOver(true);
          playSound("invalid");
          snapshot();
        }
      }
      const canvas = canvasRef.current;
      if (canvas) drawScene(canvas, bodiesRef.current, dropXRef.current, nextTierRef.current, dangerProgressRef.current, sparksRef.current, now, emblemBlades);
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [emblemBlades, inputLocked, paused, playSound, snapshot]);

  const moveGuide = (clientX: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const radius = radiusForTier(nextTierRef.current, WORLD_WIDTH);
    dropXRef.current = Math.max(radius + 3, Math.min(WORLD_WIDTH - radius - 3, (clientX - rect.left) / rect.width * WORLD_WIDTH));
  };

  const drop = () => {
    const now = performance.now();
    if (paused || inputLocked || gameOverRef.current || now < cooldownUntilRef.current) return;
    const tier = nextTierRef.current;
    const radius = radiusForTier(tier, WORLD_WIDTH);
    const x = Math.max(radius + 3, Math.min(WORLD_WIDTH - radius - 3, dropXRef.current));
    const blocked = bodiesRef.current.some((body) => Math.hypot(body.x - x, body.y - radius - 8) < radiusForTier(body.tier, WORLD_WIDTH) + radius - 3);
    if (blocked) {
      playSound("invalid");
      return;
    }
    bodiesRef.current.push({ id: nextIdRef.current++, tier, x, y: radius + 8, vx: 0, vy: 10, bornAt: now, popUntil: now + 180 });
    const rolled = nextMergeTier(rngSeedRef.current);
    rngSeedRef.current = rolled.seed;
    nextTierRef.current = rolled.tier;
    cooldownUntilRef.current = now + DROP_COOLDOWN_MS;
    setNextTier(rolled.tier);
    playSound("drop");
    snapshot();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => moveGuide(event.clientX);
  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    moveGuide(event.clientX);
    drop();
  };

  return <div className="merge-game">
    <div className="merge-game-copy">
      <div><small>THE CABINET OF CONVERGENCE</small><h2>让同阶遗物彼此相认</h2></div>
      <div className="merge-next" aria-label={`下一件遗物：${MERGE_TIERS[nextTier].name}`}><span>下一件</span><b>{MERGE_TIERS[nextTier].glyph}</b><strong>{MERGE_TIERS[nextTier].name}</strong></div>
    </div>
    <div className="merge-cabinet">
      <canvas
        ref={canvasRef}
        className="merge-canvas"
        role="application"
        aria-label="天命遗物合成游戏，移动指针选择落点，点击放下遗物"
        tabIndex={0}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            dropXRef.current = Math.max(20, Math.min(WORLD_WIDTH - 20, dropXRef.current + (event.key === "ArrowLeft" ? -24 : 24)));
          }
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            drop();
          }
        }}
      />
      <div className={`merge-danger ${dangerProgress > 0 ? "active" : ""}`} aria-live="polite"><i style={{ transform: `scaleX(${dangerProgress})` }} /><span>{dangerProgress > 0 ? "边界正在失稳…" : "越过红线后有短暂回旋余地"}</span></div>
      {gameOver && <div className="merge-game-over" role="status"><small>THE CABINET IS FULL</small><strong>遗物越过了封印线</strong><p>本局得分 {score}</p><button type="button" onClick={resetGame}>重新开启</button></div>}
    </div>
    <footer className="merge-game-note">移动指针选择落点 · 点击或按空格投下 · 同阶遗物接触后只合成一次</footer>
  </div>;
});
