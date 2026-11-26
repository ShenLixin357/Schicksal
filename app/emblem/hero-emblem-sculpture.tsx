"use client";

import { useEffect, useRef, type CSSProperties } from "react";

export type EmblemBladeSpec = {
  index: number;
  citizenId: string;
  color: string;
  angle: number;
};

// One cycle is a two-leg helix: one full turn while rising, then another
// full turn in the same angular direction while descending.
const MOTION = {
  cycleMs: 9600,
  turnsPerCycle: 2,
  orbitRadiusPx: 28,
  orbitDepthPx: 42,
  verticalRangePx: 30,
  twistDeg: 4,
  tiltXDeg: 7,
  tiltYDeg: 12,
  scaleAmount: 0.04,
};

const TAU = Math.PI * 2;
const wrap01 = (value: number) => ((value % 1) + 1) % 1;
const smoothStep = (value: number) => value * value * (3 - 2 * value);

export function HeroEmblemSculpture({ blades }: { blades: readonly EmblemBladeSpec[] }) {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const bladeNodes = Array.from(scene.querySelectorAll<HTMLElement>("[data-emblem-blade]"));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let startedAt = performance.now();
    let pausedAt: number | null = null;
    let inViewport = true;
    let disposed = false;

    const renderFrame = (now: number) => {
      const u = ((now - startedAt) % MOTION.cycleMs) / MOTION.cycleMs;
      const warpedU = u - 0.045 * Math.sin(TAU * u) + 0.015 * Math.sin(TAU * 2 * u);
      const theta = warpedU * TAU;
      const sharedAzimuth = theta * MOTION.turnsPerCycle;

      scene.style.setProperty("--artifact-bank", `${2.2 * Math.sin(theta - 0.35)}deg`);
      scene.style.setProperty("--artifact-yaw", `${-4 + 2.4 * Math.cos(theta + 0.2)}deg`);
      scene.style.setProperty("--shadow-shift", `${3.5 * Math.sin(sharedAzimuth)}px`);
      scene.style.setProperty("--light-pulse", `${0.74 + 0.1 * Math.cos(theta)}`);

      bladeNodes.forEach((blade, index) => {
        // The vertical phase is staggered, but every blade shares the same
        // continuously increasing azimuth. That keeps the canonical colour
        // adjacency intact while each blade follows its own helical path.
        const travelPhase = wrap01(warpedU - index / blades.length);
        const ascending = travelPhase < 0.5;
        const legProgress = ascending ? travelPhase * 2 : (travelPhase - 0.5) * 2;
        const rawHeight = ascending ? legProgress : 1 - legProgress;
        const height = smoothStep(rawHeight);
        const sourceAngle = ((blades[index]?.angle ?? index * 45) * Math.PI) / 180;
        const azimuth = sharedAzimuth + sourceAngle;
        const side = Math.sin(azimuth);
        const front = Math.cos(azimuth);
        const x = MOTION.orbitRadiusPx * side;
        const y = (0.5 - height) * MOTION.verticalRangePx * 2;
        const z = MOTION.orbitDepthPx * front;

        blade.style.setProperty("--helix-x", `${x}px`);
        blade.style.setProperty("--helix-y", `${y}px`);
        blade.style.setProperty("--helix-z", `${z}px`);
        blade.style.setProperty("--blade-twist", `${MOTION.twistDeg * side}deg`);
        blade.style.setProperty("--blade-tilt-x", `${MOTION.tiltXDeg * front}deg`);
        blade.style.setProperty("--blade-tilt-y", `${MOTION.tiltYDeg * side}deg`);
        blade.style.setProperty("--blade-scale", `${1 + MOTION.scaleAmount * front}`);
        blade.style.setProperty("--blade-light", `${0.8 + 0.2 * ((front + 1) / 2)}`);
        blade.style.setProperty(
          "--blade-layer",
          `${20 + Math.round((z + MOTION.orbitDepthPx) / 2)}`,
        );
      });

    };

    // The identical renderFrame mathematics is used when the sculpture is
    // visible. Stopping its RAF while hidden or scrolled out of view reduces
    // CPU/GPU demand without reducing model geometry, texture or frame quality.
    // Resume at the same animation phase instead of fast-forwarding through
    // an unseen segment or resetting the user-approved helical choreography.
    const tick = (now: number) => {
      animationFrame = 0;
      renderFrame(now);
      if (!disposed && inViewport && document.visibilityState === "visible" && !reduceMotion.matches) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };
    const syncPlayback = () => {
      if (animationFrame !== 0) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
      const now = performance.now();
      if (disposed || !inViewport || document.visibilityState !== "visible") {
        if (pausedAt === null) pausedAt = now;
        return;
      }
      if (pausedAt !== null) {
        startedAt += now - pausedAt;
        pausedAt = null;
      }
      if (reduceMotion.matches) {
        // Preserve the existing deterministic still frame for motion-sensitive users.
        renderFrame(startedAt + MOTION.cycleMs * 0.18);
      } else {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };
    const onVisibilityChange = () => syncPlayback();
    const onMotionChange = () => syncPlayback();
    const observer = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(entries => {
          inViewport = entries.some(entry => entry.isIntersecting);
          syncPlayback();
        }, { rootMargin: "32px 0px" })
      : null;

    observer?.observe(scene);
    document.addEventListener("visibilitychange", onVisibilityChange);
    reduceMotion.addEventListener("change", onMotionChange);
    syncPlayback();

    return () => {
      disposed = true;
      if (animationFrame !== 0) window.cancelAnimationFrame(animationFrame);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reduceMotion.removeEventListener("change", onMotionChange);
    };
  }, [blades]);

  return (
    <div
      className="hero-emblem-sculpture"
      ref={sceneRef}
      role="img"
      aria-label="天命第一帝国八棱主标志的立体展示摆件；八片棱保持原有颜色与相邻顺序，并沿核心连续螺旋升降"
      data-blade-order={blades.map((blade) => `${blade.citizenId}:${blade.color}`).join("|")}
    >
      <div className="ceramic-tabletop" aria-hidden="true"><i /><b /></div>
      <span className="artifact-light-pool" aria-hidden="true" />
      <span className="artifact-cast-shadow" aria-hidden="true" />
      <span className="artifact-plinth" aria-hidden="true"><i /></span>

      <div className="emblem-3d-camera" aria-hidden="true">
        <div className="emblem-3d-global">
          <div className="emblem-3d-anchor">
            <span className="emblem-3d-orbit outer" />
            <span className="emblem-3d-orbit inner" />
            {blades.map((blade) => (
              <span
                className="emblem-3d-blade-axis"
                data-emblem-blade
                data-citizen={blade.citizenId}
                data-source-color={blade.color}
                key={blade.citizenId}
                style={{
                  "--blade-angle": `${blade.angle}deg`,
                  "--blade-color": blade.color,
                  "--blade-index": blade.index,
                } as CSSProperties}
              >
                <i className="emblem-3d-blade">
                  <span className="blade-facet blade-facet-left" />
                  <span className="blade-facet blade-facet-right" />
                  <span className="blade-ridge" />
                </i>
              </span>
            ))}
            <span className="emblem-3d-hub-ring" />
            <span className="emblem-3d-core"><i /><b /><em /></span>
          </div>
        </div>
      </div>
    </div>
  );
}
