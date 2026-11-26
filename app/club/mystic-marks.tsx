"use client";

import "./no2-lounge-scythe.css";

const MOON_OUTER = [[45, 6], [31, 8], [19, 14], [11, 25], [10, 39], [18, 50], [31, 58], [45, 56]];
const MOON_INNER = [[45, 6], [36, 11], [28, 19], [25, 29], [28, 39], [33, 47], [40, 53], [45, 56]];
const ICE_COLORS = ["#e4fbff", "#77c9f3", "#bceeff", "#398bd0", "#89d9ff", "#c8f6ff", "#4ca7e9"];

export function MysticSigil({ memberId }: { memberId: string }) {
  if (memberId === "amberina") return <span className="club-mystic-mark mystic-ice-moon" role="img" aria-label="有冰棱切面的蓝色冰晶月牙">
    <svg className="mystic-sigil-svg" viewBox="0 0 64 64" aria-hidden="true">
      <g className="ice-crescent-facets" stroke="#dbf7ff" strokeWidth=".5" strokeLinejoin="miter">
        {MOON_OUTER.slice(0, -1).map((point, index) => <g key={index}>
          <polygon points={[point, MOON_OUTER[index + 1], MOON_INNER[index]].map((p) => p.join(",")).join(" ")} fill={ICE_COLORS[index]} />
          <polygon points={[MOON_OUTER[index + 1], MOON_INNER[index + 1], MOON_INNER[index]].map((p) => p.join(",")).join(" ")} fill={ICE_COLORS[(index + 3) % ICE_COLORS.length]} />
        </g>)}
      </g>
      <path className="ice-ridge-glint" d="M 45 6 L 31 8 L 19 14 L 11 25 L 10 39 L 18 50 L 31 58 L 45 56 M 25 29 L 28 39 L 33 47" fill="none" stroke="#f1ffff" strokeWidth="1.3" />
      <path className="ice-spark" d="M 51 20 L 52.6 24.4 L 57 26 L 52.6 27.6 L 51 32 L 49.4 27.6 L 45 26 L 49.4 24.4 Z" fill="#dcfbff" />
    </svg>
  </span>;
  // Lounge-only identity: the approved black/purple scythe artwork, not the civic garnet skull.
  // The source image stays fixed; CSS animates its violet energy and sparks.
  if (memberId === "zxy") return <span className="club-mystic-mark mystic-shadow-scythe" role="img" aria-label="Lord Chryser 的黑紫幽冥镰刀，紫焰沿刃口流动">
    <span className="no2-scythe-art" aria-hidden="true" />
    <span className="no2-scythe-flame" aria-hidden="true" />
    <span className="no2-scythe-glint" aria-hidden="true" />
    <span className="no2-scythe-ember no2-scythe-ember-one" aria-hidden="true" />
    <span className="no2-scythe-ember no2-scythe-ember-two" aria-hidden="true" />
  </span>;
  return <span className="club-mystic-mark mystic-field" role="img" aria-label="磁场"><i /><i /><i /><b>•</b></span>;
}
