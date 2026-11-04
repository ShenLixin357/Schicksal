"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

type TeaPhase = "resting" | "floating" | "pouring" | "served";

// The choreography's deliberate tuning surface. Landing coordinates are the
// three tabletop places directly in front of the illustrated chairs.
const TEA_CHOREOGRAPHY = {
  ritualMs: 12600,
  resting: {
    pot: { x: "45.2%", y: "53.6%" },
    cups: [
      { x: "40.8%", y: "60.0%" },
      { x: "50.1%", y: "58.9%" },
      { x: "59.4%", y: "60.0%" },
    ],
  },
  cascade: {
    pot: { x: "46.1%", y: "28.6%" },
    cups: [
      { x: "48.8%", y: "40.7%" },
      { x: "50.2%", y: "47.8%" },
      { x: "49.0%", y: "54.9%" },
    ],
  },
} as const;

const teaLayoutVariables = {
  "--tea-ritual-duration": `${TEA_CHOREOGRAPHY.ritualMs}ms`,
  "--tea-pot-rest-x": TEA_CHOREOGRAPHY.resting.pot.x,
  "--tea-pot-rest-y": TEA_CHOREOGRAPHY.resting.pot.y,
  "--tea-pot-float-x": TEA_CHOREOGRAPHY.cascade.pot.x,
  "--tea-pot-float-y": TEA_CHOREOGRAPHY.cascade.pot.y,
  ...Object.fromEntries(TEA_CHOREOGRAPHY.resting.cups.flatMap((cup, index) => [
    [`--tea-cup-${index + 1}-land-x`, cup.x],
    [`--tea-cup-${index + 1}-land-y`, cup.y],
  ])),
  ...Object.fromEntries(TEA_CHOREOGRAPHY.cascade.cups.flatMap((cup, index) => [
    [`--tea-cup-${index + 1}-float-x`, cup.x],
    [`--tea-cup-${index + 1}-float-y`, cup.y],
  ])),
} as CSSProperties;

export function LoungeTable({ onInteract }: { onInteract: () => void }) {
  const tableRef = useRef<HTMLButtonElement>(null);

  const followPointer = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const table = tableRef.current;
    if (!table) return;
    const bounds = table.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    table.style.setProperty("--table-sheen-x", `${24 + x * 52}%`);
    table.style.setProperty("--table-sheen-y", `${18 + y * 34}%`);
    table.style.setProperty("--table-yaw", `${(x - .5) * 1.8}deg`);
    table.style.setProperty("--table-pitch", `${-.7 - (1 - y) * 1.2}deg`);
    table.style.setProperty("--table-lift", `${-.8 - (1 - y) * 1.4}px`);
    table.style.setProperty("--table-parallax-x", `${(x - .5) * 1.8}px`);
  };

  const resetPointer = () => {
    const table = tableRef.current;
    if (!table) return;
    table.style.removeProperty("--table-sheen-x");
    table.style.removeProperty("--table-sheen-y");
    table.style.removeProperty("--table-yaw");
    table.style.removeProperty("--table-pitch");
    table.style.removeProperty("--table-lift");
    table.style.removeProperty("--table-parallax-x");
  };

  return <button
    className="lounge-table-3d"
    ref={tableRef}
    type="button"
    aria-label="触碰委员会 Lounge 的立体圆桌"
    onPointerMove={followPointer}
    onPointerLeave={resetPointer}
    onClick={onInteract}
  >
    <span className="lounge-table-shadow" aria-hidden="true" />
    <span className="lounge-table-layer lounge-table-body" aria-hidden="true"><Image src="/committee-lounge-table-original-v2.png" alt="" fill sizes="35vw" unoptimized /></span>
    <span className="lounge-table-layer lounge-table-top-layer" aria-hidden="true"><Image src="/committee-lounge-table-original-v2.png" alt="" fill sizes="35vw" unoptimized /></span>
    <span className="lounge-table-sheen" aria-hidden="true" />
  </button>;
}

export function LoungeTeaRitual({ onWhisper }: { onWhisper: (message: string) => void }) {
  const [phase, setPhase] = useState<TeaPhase>("resting");
  const finishTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (finishTimer.current !== null) window.clearTimeout(finishTimer.current);
  }, []);

  const touchTeapot = () => {
    if (phase === "pouring") return;
    if (finishTimer.current !== null) window.clearTimeout(finishTimer.current);
    if (phase === "resting" || phase === "served") {
      setPhase("floating");
      onWhisper("大茶壶带着三只小杯离开桌面。再触碰一次，它就会开始倒茶。");
      return;
    }
    setPhase("pouring");
    onWhisper("茶壶先倾向第一只杯；随后第一、第二只杯会依次侧身，把连续的茶流斟进下一只杯子。");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    finishTimer.current = window.setTimeout(() => {
      setPhase("served");
      onWhisper("三只杯子都已斟满，分别落在三张椅子前；茶壶回到了桌面。");
      finishTimer.current = null;
    }, reduced ? 900 : TEA_CHOREOGRAPHY.ritualMs);
  };

  const instruction = phase === "floating" ? "再次触碰，开始倒茶" : phase === "pouring" ? "茶正在依次斟入三只杯子" : phase === "served" ? "再次召起茶具" : "触碰大茶壶";

  return <div className={`lounge-tea-service tea-${phase}`} style={teaLayoutVariables}>
    <button className="lounge-teapot" type="button" onClick={touchTeapot} disabled={phase === "pouring"} aria-label={instruction}>
      <Image src="/committee-lounge-teapot.png" width={640} height={640} alt="黑蓝与古金色的欧洲古典大茶壶" unoptimized />
      <span>{instruction}</span>
    </button>
    {[1, 2, 3].map((number) => <div className={`lounge-teacup tea-cup-${number}`} data-seat={number} key={number} aria-hidden="true">
      <Image src="/committee-lounge-teacup.png" width={480} height={480} alt="" unoptimized />
      <i className="tea-surface" />
    </div>)}
    <svg className="tea-stream stream-pot-one" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M90 2 C 82 31 63 70 16 98" /><path pathLength="1" className="tea-stream-highlight" d="M90 2 C 82 31 63 70 16 98" /></svg>
    <svg className="tea-stream stream-one-two" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M82 2 C 72 30 58 69 30 98" /><path pathLength="1" className="tea-stream-highlight" d="M82 2 C 72 30 58 69 30 98" /></svg>
    <svg className="tea-stream stream-two-three" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M18 2 C 23 31 35 70 65 98" /><path pathLength="1" className="tea-stream-highlight" d="M18 2 C 23 31 35 70 65 98" /></svg>
  </div>;
}
