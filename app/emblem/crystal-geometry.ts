/**
 * Geometric contract for each profile crystal blade.
 *
 * A kite-shaped (non-symmetric along its length) four-point diamond.
 * From the outward tip towards the hub:
 * - total length / maximum width = 4.236
 * - widest point at 61.8% of the total length
 * - outward/inner segments = 0.618/0.382 ≈ 1.618
 *
 * Keep this unitless: display scale, scene placement, and 3D shading are
 * separate presentation responsibilities. Do not modify approved mark PNGs.
 */
export const PROFILE_CRYSTAL_RATIO = Object.freeze({
  lengthToMaxWidth: 4.236,
  outerToInner: 1.618,
  maxWidthFromOuter: 0.618,
});

export type CrystalBladeCoordinates = {
  outerY: number;
  shoulderY: number;
  innerY: number;
  leftX: number;
  rightX: number;
  totalLength: number;
  maximumWidth: number;
};

/** Vertical SVG coordinates for a blade pointing upward from a circular hub. */
export function profileCrystalCoordinates(
  maximumWidth = 20,
  innerRadius = 20,
): CrystalBladeCoordinates {
  if (!Number.isFinite(maximumWidth) || maximumWidth <= 0
    || !Number.isFinite(innerRadius) || innerRadius < 0)
    throw new RangeError("Crystal blade dimensions must be finite and positive");
  const totalLength = maximumWidth * PROFILE_CRYSTAL_RATIO.lengthToMaxWidth;
  const outerY = -(innerRadius + totalLength);
  return {
    outerY,
    shoulderY: outerY + totalLength * PROFILE_CRYSTAL_RATIO.maxWidthFromOuter,
    innerY: -innerRadius,
    leftX: -maximumWidth / 2,
    rightX: maximumWidth / 2,
    totalLength,
    maximumWidth,
  };
}

export function profileCrystalPath(coordinates: CrystalBladeCoordinates): string {
  const {outerY, shoulderY, innerY, leftX, rightX} = coordinates;
  return `M 0 ${outerY} L ${rightX} ${shoulderY} L 0 ${innerY} L ${leftX} ${shoulderY} Z`;
}
