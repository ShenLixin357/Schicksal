"use client";

import {
  PROFILE_CRYSTAL_RATIO, profileCrystalCoordinates, profileCrystalPath,
} from "../emblem/crystal-geometry";
import "./profile-crystal.css";

// A single independent member crystal, NOT the shared eight-ray emblem.
// Its source of colour is the official public member representative colour.
// Outer/inner ratio and shoulder are inherited from the audited geometry.
const coordinates = profileCrystalCoordinates(34, 0);
const kite = profileCrystalPath(coordinates);

export function ProfileCrystalEmblem({ color }: { color: string }) {
  return (
    <svg className="profile-crystal-emblem" viewBox="0 0 80 182"
      role="img" aria-label="单片细长菱形晶棱，长宽比 4.236 比 1，最宽处距外端 61.8%"
      data-crystal-count="1"
      data-crystal-length-to-width={PROFILE_CRYSTAL_RATIO.lengthToMaxWidth}
      data-crystal-widest-position={PROFILE_CRYSTAL_RATIO.maxWidthFromOuter}>
      <g transform="translate(40 160)">
        <path className="profile-crystal-kite" d={kite}
          fill={color} stroke={color} strokeWidth=".65" />
        <path className="profile-crystal-upper-facet"
          d={`M 0 ${coordinates.outerY} L ${coordinates.rightX} ${coordinates.shoulderY} L 0 ${coordinates.shoulderY} Z`} />
        <path className="profile-crystal-inner-facet"
          d={`M 0 ${coordinates.shoulderY} L ${coordinates.rightX} ${coordinates.shoulderY} L 0 ${coordinates.innerY} Z`} />
        <path className="profile-crystal-ridge"
          d={`M 0 ${coordinates.outerY} V ${coordinates.innerY}`} />
      </g>
    </svg>
  );
}
