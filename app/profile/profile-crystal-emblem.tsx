"use client";

import { EMBLEM_BLADES } from "../emblem/blade-spec";
import {
  PROFILE_CRYSTAL_RATIO, profileCrystalCoordinates, profileCrystalPath,
} from "../emblem/crystal-geometry";
import "./profile-crystal.css";

const coordinates = profileCrystalCoordinates(20, 20);
const kite = profileCrystalPath(coordinates);

/**
 * Public personal-page ceremonial diamond.
 *
 * These eight geometrically identical *kites* are the shared public rays,
 * NOT replacements for the owner's approved personal mark. That existing
 * snowflake/flame/etc stays alongside the seal, at its original size.
 * Only this isolated personal-page decorative component uses the new shape.
 */
export function ProfileCrystalEmblem({ citizenId }: { citizenId: string }) {
  return (
    <svg
      className="profile-crystal-emblem"
      viewBox="0 0 240 240"
      role="img"
      aria-label="八片细长非对称菱形晶棱，每片长宽比 4.236 比 1，最宽处距外端 61.8%；当前成员对应的晶棱更明亮"
      data-crystal-length-to-width={PROFILE_CRYSTAL_RATIO.lengthToMaxWidth}
      data-crystal-widest-position={PROFILE_CRYSTAL_RATIO.maxWidthFromOuter}
    >
      <circle cx="120" cy="120" r="113" className="profile-crystal-guide" />
      {EMBLEM_BLADES.map(blade => {
        const highlighted = blade.citizenId === citizenId;
        return <g key={blade.citizenId}
          data-crystal-blade={blade.citizenId}
          data-crystal-selected={highlighted ? "true" : "false"}
          transform={`translate(120 120) rotate(${blade.angle})`}>
          <path className="profile-crystal-kite" d={kite}
            fill={blade.color} fillOpacity={highlighted ? 0.94 : 0.70}
            stroke={blade.color} strokeWidth={highlighted ? 1.35 : 0.9} />
          <path className="profile-crystal-upper-facet"
            d={`M 0 ${coordinates.outerY} L ${coordinates.rightX} ${coordinates.shoulderY} L 0 ${coordinates.shoulderY} Z`} />
          <path className="profile-crystal-inner-facet"
            d={`M 0 ${coordinates.shoulderY} L ${coordinates.rightX} ${coordinates.shoulderY} L 0 ${coordinates.innerY} Z`} />
          <path className="profile-crystal-ridge"
            d={`M 0 ${coordinates.outerY} V ${coordinates.innerY}`} />
        </g>;
      })}
      <circle cx="120" cy="120" r="20" className="profile-crystal-core-ring" />
      <path className="profile-crystal-core" d="M120 105 L135 120 L120 135 L105 120 Z" />
    </svg>
  );
}
