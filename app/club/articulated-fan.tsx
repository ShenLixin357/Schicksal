"use client";

import { useEffect, useId, useRef, type CSSProperties, type RefObject } from "react";
import { FAN_RIB_COUNT, lacePanelGeometry, ribAngle, sampleFanMotion } from "./fan-motion";

const RIBS = Array.from({ length: FAN_RIB_COUNT }, (_, index) => index);
const PANELS = RIBS.slice(0, -1);

export function LaceFanDrawing({ openProgress = 1, svgRef, framing = "open" }: { openProgress?: number; svgRef?: RefObject<SVGSVGElement | null>; framing?: "open" | "closed" }) {
  const id = useId().replace(/:/g, "");
  const pearl = `fan-pearl-${id}`;
  const silk = `fan-silk-${id}`;
  const lace = lacePanelGeometry(openProgress);
  return <svg className={`fan-drawing ${framing === "closed" ? "fan-drawing-closed" : ""}`} ref={svgRef} viewBox={framing === "closed" ? "-27 -232 54 284" : "-250 -250 500 300"} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs>
      <linearGradient id={pearl} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#668cab" /><stop offset=".3" stopColor="#e1f0f2" /><stop offset=".55" stopColor="#fff6df" /><stop offset=".8" stopColor="#becfd8" /><stop offset="1" stopColor="#6b89a1" /></linearGradient>
      <radialGradient id={silk} cx=".5" cy="1" r="1"><stop stopColor="#9ac7e6" stopOpacity=".28" /><stop offset=".62" stopColor="#c9e7f9" stopOpacity=".09" /><stop offset="1" stopColor="#edf7ff" stopOpacity=".24" /></radialGradient>
    </defs>
    <g className="fan-lace-segments">
      {PANELS.map((index) => <g key={index} data-fan-panel={index} transform={`rotate(${(ribAngle(index, openProgress) + ribAngle(index + 1, openProgress)) / 2})`}>
        <path data-lace="leaf" d={lace.leaf} fill={`url(#${silk})`} stroke="#c4dce6" strokeWidth=".45" />
        <path className="fan-lace-mesh" data-lace="mesh" d={lace.mesh} fill="none" stroke="#d9edf6" strokeWidth=".48" strokeOpacity=".72" />
        <path className="fan-embroidery" data-lace="embroidery" d={lace.embroidery} fill="none" stroke="#f5f5df" strokeWidth="1.15" />
        <path data-lace="hem" d={lace.hem} fill="none" stroke="#e5f3fc" strokeWidth="1.6" strokeDasharray="1.1 2" strokeLinecap="round" />
      </g>)}
    </g>
    <g className="fan-individual-ribs">
      {RIBS.map((index) => {
        const guard = index === 0 || index === FAN_RIB_COUNT - 1;
        return <g key={index} data-fan-rib={index} transform={`rotate(${ribAngle(index, openProgress)})`}>
          <path d={guard ? "M -3 2 Q -7 -38 -6 -84 L -5 -216 Q 0 -230 5 -216 L 6 -84 Q 7 -38 3 2 Z" : "M -1.8 2 L -3.7 -78 L -1.65 -219 Q 0 -225 1.65 -219 L 3.7 -78 L 1.8 2 Z"} fill={`url(#${pearl})`} stroke="#dee9e4" strokeWidth=".6" />
          <path d="M 0 -9 L 0 -77 M 0 -104 L 0 -215" stroke="#faf3da" strokeWidth=".8" />
          <path d="M 0 -20 C -6 -29 -4 -40 0 -43 C 4 -47 4 -56 0 -64 C -3 -59 -4 -52 0 -48 M 0 -43 C 5 -39 5 -32 0 -29 M 0 -71 L -2 -78 L 0 -84 L 2 -78 Z" fill="none" stroke="#819aaf" strokeWidth=".7" />
          {guard && <path d="M 0 -91 C -5 -100 -5 -113 0 -118 C 5 -123 5 -134 0 -140 C -5 -146 -5 -157 0 -163 C 5 -169 5 -181 0 -188 M 0 -111 Q -8 -121 -3 -129 M 0 -140 Q 8 -151 3 -159 M 0 -173 Q -8 -183 -3 -191 M 0 -196 L -2 -207 L 0 -215 L 2 -207 Z" fill="none" stroke="#7a99b0" strokeWidth=".85" />}
          <circle cx="0" cy="-218" r={guard ? 2.8 : 1.55} fill="#fff6df" stroke="#a1c2d6" strokeWidth=".7" />
        </g>;
      })}
    </g>
    <g className="fan-rivet">
      <circle r="9.5" fill="#dae3de" stroke="#fbefcd" strokeWidth="1.8" />
      <circle r="5.6" fill="#88b6d2" stroke="#e3f4ff" strokeWidth="1.2" />
      <path d="M -2 -3 L 2 -3 L 4 0 L 0 4 L -4 0 Z" fill="#d3efff" />
      <path d="M 0 10 Q 7 16 0 23 Q -6 29 0 35" fill="none" stroke="#dfe7dc" strokeWidth="1.3" />
      <path d="M 0 29 L 5 37 L 0 47 L -5 37 Z" fill="#a2c7e9" stroke="#e8f6ff" strokeWidth=".9" />
    </g>
  </svg>;
}

// Frozen timestamps render the very same geometry as the live animation, so a
// frame inspection can independently verify opening, viewing angle and rivet.
export function ArticulatedFan({ frozenAtMs }: { frozenAtMs?: number }) {
  const orbitRef = useRef<HTMLDivElement>(null);
  const fanRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const initial = sampleFanMotion(frozenAtMs ?? 0);

  useEffect(() => {
    if (frozenAtMs !== undefined) return;
    const orbit = orbitRef.current;
    const fan = fanRef.current;
    const svg = svgRef.current;
    if (!orbit || !fan || !svg) return;
    const ribs = Array.from(svg.querySelectorAll<SVGGElement>("[data-fan-rib]"));
    const panels = Array.from(svg.querySelectorAll<SVGGElement>("[data-fan-panel]")).map((group) => ({
      group,
      leaf: group.querySelector<SVGPathElement>('[data-lace="leaf"]')!,
      mesh: group.querySelector<SVGPathElement>('[data-lace="mesh"]')!,
      embroidery: group.querySelector<SVGPathElement>('[data-lace="embroidery"]')!,
      hem: group.querySelector<SVGPathElement>('[data-lace="hem"]')!,
    }));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let activeMs = 0;
    let previous = performance.now();

    const paint = (elapsed: number, still = false) => {
      const motion = still ? { ...sampleFanMotion(0), azimuth: 24 } : sampleFanMotion(elapsed);
      // orbitRig only owns 3D orientation. Its origin is the stationary rivet.
      orbit.style.transform = `rotateY(${motion.azimuth.toFixed(3)}deg) rotateX(${motion.tilt}deg)`;
      orbit.dataset.azimuth = motion.azimuth.toFixed(3);
      orbit.style.setProperty("--fan-luminance", (1 + .12 * Math.cos(motion.azimuth * Math.PI / 180)).toFixed(3));
      // fanRig only owns the articulated spread; all ribs rotate at (0, 0).
      fan.dataset.openProgress = motion.openProgress.toFixed(4);
      ribs.forEach((rib, index) => rib.setAttribute("transform", `rotate(${ribAngle(index, motion.openProgress).toFixed(3)})`));
      const geometry = lacePanelGeometry(motion.openProgress);
      panels.forEach((panel, index) => {
        panel.group.setAttribute("transform", `rotate(${((ribAngle(index, motion.openProgress) + ribAngle(index + 1, motion.openProgress)) / 2).toFixed(3)})`);
        panel.leaf.setAttribute("d", geometry.leaf);
        panel.mesh.setAttribute("d", geometry.mesh);
        panel.embroidery.setAttribute("d", geometry.embroidery);
        panel.hem.setAttribute("d", geometry.hem);
      });
    };
    const tick = (now: number) => {
      activeMs += now - previous;
      previous = now;
      paint(activeMs);
      frame = window.requestAnimationFrame(tick);
    };
    const resume = () => {
      window.cancelAnimationFrame(frame);
      paint(activeMs, reducedMotion.matches);
      if (!document.hidden && !reducedMotion.matches) {
        previous = performance.now();
        frame = window.requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", resume);
    reducedMotion.addEventListener("change", resume);
    resume();
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", resume);
      reducedMotion.removeEventListener("change", resume);
    };
  }, [frozenAtMs]);

  return <div className="fan-loading-scene" aria-hidden="true">
    <div className="fan-fixed-pivot" data-fan-pivot="fixed">
      <div className="fan-orbit-rig" ref={orbitRef} data-azimuth={initial.azimuth.toFixed(3)} style={{ transform: `rotateY(${initial.azimuth}deg) rotateX(${initial.tilt}deg)`, "--fan-luminance": 1 + .12 * Math.cos(initial.azimuth * Math.PI / 180) } as CSSProperties}>
        <div className="fan-rig" ref={fanRef} data-open-progress={initial.openProgress.toFixed(4)}><LaceFanDrawing svgRef={svgRef} openProgress={initial.openProgress} /></div>
      </div>
      <i className="fan-pivot-glow" />
    </div>
  </div>;
}
