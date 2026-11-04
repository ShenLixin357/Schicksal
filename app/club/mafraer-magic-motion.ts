// All mechanics use the artwork's coordinates; zoom and device pixels never
// change the flight bounds or the distance between the fabric's control points.
export const PALACE_SIZE = { width: 1672, height: 941 } as const;
export type Point = { x: number; y: number };
export type Weather = "stardust" | "snow" | "mist";
export const MAGIC_TIMING = { holdThreshold: 300, fullCharge: 1500, dragThreshold: 7, recall: 2600, bed: 5600, weather: 4600 } as const;
export const BROOM_HOME: Point = { x: 1284, y: 488 };
export const BROOM_DOCK: Point = { x: 1216, y: 496 };
export const BROOM_WINDOW = { left: 1142, right: 1284, top: 459, bottom: 576 } as const;
export const ORB = { x: 1035, y: 640, diameter: 87 } as const;
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export const smooth = (value: number) => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };
export const easeOut = (value: number) => 1 - (1 - clamp(value, 0, 1)) ** 3;

export type Gesture = {
  id: number; origin: Point; last: Point; started: number; moved: boolean;
};
export function beginGesture(id: number, point: Point, now: number): Gesture {
  return { id, origin: { ...point }, last: { ...point }, started: now, moved: false };
}
export function moveGesture(gesture: Gesture, id: number, point: Point): Gesture {
  if (gesture.id !== id) return gesture;
  return { ...gesture, last: { ...point }, moved: gesture.moved || Math.hypot(point.x - gesture.origin.x, point.y - gesture.origin.y) >= MAGIC_TIMING.dragThreshold };
}
export function chargeAt(gesture: Gesture | null, now: number): number {
  if (!gesture || gesture.moved) return 0;
  return clamp((now - gesture.started - MAGIC_TIMING.holdThreshold) / (MAGIC_TIMING.fullCharge - MAGIC_TIMING.holdThreshold), 0, 1);
}
export function finishGesture(gesture: Gesture | null, id: number, now: number, cancelled = false): "tap" | "weather" | "drag" | "none" {
  if (!gesture || gesture.id !== id || cancelled) return "none";
  if (gesture.moved) return "drag";
  return now - gesture.started >= MAGIC_TIMING.holdThreshold ? "weather" : "tap";
}

export function windowPoint(point: Point): Point {
  return { x: clamp(point.x, BROOM_WINDOW.left, BROOM_WINDOW.right), y: clamp(point.y, BROOM_WINDOW.top, BROOM_WINDOW.bottom) };
}
export type SpringPoint = Point & { vx: number; vy: number };
// Substeps make a dropped frame stable; velocity is retained when a drag becomes
// a docking movement, so releasing the broom doesn't introduce a discontinuity.
export function springStep(state: SpringPoint, target: Point, seconds: number, stiffness = 48, damping = 14): SpringPoint {
  const next = { ...state };
  let remaining = clamp(seconds, 0, .08);
  while (remaining > 0) {
    const dt = Math.min(remaining, 1 / 120);
    next.vx += ((target.x - next.x) * stiffness - next.vx * damping) * dt;
    next.vy += ((target.y - next.y) * stiffness - next.vy * damping) * dt;
    next.x += next.vx * dt; next.y += next.vy * dt;
    remaining -= dt;
  }
  return next;
}
export function settled(state: SpringPoint, target: Point): boolean {
  return Math.hypot(state.x - target.x, state.y - target.y) < .18 && Math.hypot(state.vx, state.vy) < .55;
}
export function recallPose(from: Point, to: Point, progress: number) {
  const t = smooth(progress), inv = 1 - t;
  const direction = to.x < from.x ? -1 : 1;
  const c1 = { x: from.x + direction * 12, y: from.y - 44 };
  const c2 = { x: to.x - direction * 30, y: to.y - 24 };
  return {
    x: inv ** 3 * from.x + 3 * inv * inv * t * c1.x + 3 * inv * t * t * c2.x + t ** 3 * to.x,
    y: inv ** 3 * from.y + 3 * inv * inv * t * c1.y + 3 * inv * t * t * c2.y + t ** 3 * to.y,
    bank: direction * 13 * Math.sin(Math.PI * t) - 7 * t,
    yaw: direction * 38 * Math.sin(Math.PI * t),
  };
}

// Individual corners begin at different times. The bottom edge rises farther
// than the stitched head edge; settling has a small damped fabric rebound.
export function quiltPoint(point: Point, u: number, v: number, seconds: number): Point {
  const delay = .12 + u * .43;
  const lift = smooth((seconds - delay) / 1.08);
  const fall = smooth((seconds - 2.14 - v * .18) / 1.35);
  const envelope = lift * (1 - fall);
  const billow = Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * envelope;
  const reboundTime = seconds - 3.48;
  const rebound = reboundTime > 0 && reboundTime < 1.1 ? Math.sin(reboundTime * 8) * Math.exp(-reboundTime * 5) * 3.4 * v : 0;
  return {
    x: point.x + (u - .5) * 20 * envelope + Math.sin(v * 4 + seconds * 2.3) * billow * 4,
    y: point.y - (19 + 58 * v) * envelope + Math.sin(u * 5.5 - seconds * 3 + v * 4) * billow * 9 + rebound,
  };
}
export function pillowPose(index: number, seconds: number) {
  const local = seconds - .7 - index * .27;
  const lift = smooth(local / .48) * (1 - smooth((local - 1.12) / .9));
  const landing = local - 2.02;
  const bounce = landing > 0 && landing < .55 ? Math.sin(landing * 12) * Math.exp(-landing * 8) * 2 : 0;
  return { x: (index - 1) * 5 * lift, y: -24 * lift + bounce, angle: (index % 2 ? 4 : -5) * lift };
}
export function curtainPoint(point: Point, u: number, v: number, side: "left" | "right", closed: number): Point {
  const travel = smooth((v - .02) / .54) * clamp(closed, 0, 1);
  return { x: point.x + (side === "left" ? 104 : -100) * travel + (u - .5) * -9 * travel, y: point.y - Math.sin(v * Math.PI) * travel * 5 };
}
export function inertiaStep(velocity: number, seconds: number): number {
  const next = velocity * Math.exp(-4.4 * clamp(seconds, 0, .08));
  return Math.abs(next) < .006 ? 0 : next;
}
