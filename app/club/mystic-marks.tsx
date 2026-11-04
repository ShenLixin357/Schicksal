"use client";

import { useId } from "react";

const MOON_OUTER = [[45, 6], [31, 8], [19, 14], [11, 25], [10, 39], [18, 50], [31, 58], [45, 56]];
const MOON_INNER = [[45, 6], [36, 11], [28, 19], [25, 29], [28, 39], [33, 47], [40, 53], [45, 56]];
const ICE_COLORS = ["#e4fbff", "#77c9f3", "#bceeff", "#398bd0", "#89d9ff", "#c8f6ff", "#4ca7e9"];

export function MysticSigil({ memberId }: { memberId: string }) {
  const id = useId().replace(/:/g, "");
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
  if (memberId === "zxy") return <span className="club-mystic-mark mystic-ember-flame" role="img" aria-label="从阴燃中突然燃起的绿色魔法火焰">
    <svg className="mystic-sigil-svg" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={`ember-outer-${id}`} x1="0" y1="1" x2=".4" y2="0"><stop stopColor="#255e41" /><stop offset=".45" stopColor="#37d174" /><stop offset="1" stopColor="#c5ff82" /></linearGradient>
        <linearGradient id={`ember-heart-${id}`} x1="0" y1="1" x2=".5" y2="0"><stop stopColor="#deffb2" /><stop offset=".6" stopColor="#9bfd86" /><stop offset="1" stopColor="#49cf85" /></linearGradient>
      </defs>
      <ellipse className="green-smolder-seed" cx="32" cy="54" rx="4" ry="2" fill="#ccff85" />
      <g className="green-flame-ignition">
        <g className="green-flame-flicker">
          <path d="M 32 57 C 14 57 10 46 17 35 C 23 25 25 25 24 13 C 31 16 30 24 34 25 C 36 13 43 10 41 4 C 56 18 42 25 49 35 C 60 50 48 57 32 57 Z" fill={`url(#ember-outer-${id})`} />
          <path className="green-flame-heart" d="M 32 54 C 21 54 20 44 26 37 C 29 33 28 28 29 24 C 36 30 32 34 37 37 C 38 32 41 29 40 24 C 48 37 47 47 41 51 C 38 54 35 55 32 54 Z" fill={`url(#ember-heart-${id})`} />
          <path d="M 30 52 Q 25 43 32 39 Q 31 44 36 46 Q 40 52 30 52 Z" fill="#e4ffbd" opacity=".8" />
        </g>
      </g>
      <circle className="green-ignition-flash" cx="32" cy="48" r="10" fill="#d0ffbb" />
    </svg>
    <i /><i /><em />
  </span>;
  return <span className="club-mystic-mark mystic-field" role="img" aria-label="磁场"><i /><i /><i /><b>•</b></span>;
}
