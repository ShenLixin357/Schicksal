export type MergeBody = {
  id: number;
  tier: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  bornAt: number;
  popUntil: number;
};

export type MergeEvent = {
  sourceIds: [number, number];
  body: MergeBody;
  points: number;
};

export type MergeStepResult = {
  bodies: MergeBody[];
  merges: MergeEvent[];
  collisionCount: number;
  nextId: number;
};

export const MERGE_TIERS = [
  { name: "月珠", glyph: "●", colors: ["#e6dfd2", "#8e7b9e"] },
  { name: "小晶石", glyph: "◆", colors: ["#94c8d9", "#456e91"] },
  { name: "纹章宝石", glyph: "✦", colors: ["#b184cf", "#694688"] },
  { name: "袖珍茶杯", glyph: "♨", colors: ["#e2c8a2", "#8e6546"] },
  { name: "香氛瓶", glyph: "⚗", colors: ["#d1839e", "#74425f"] },
  { name: "玫瑰饰章", glyph: "❈", colors: ["#c65e79", "#722f4e"] },
  { name: "小王冠", glyph: "♛", colors: ["#d8ae59", "#76542b"] },
  { name: "水晶圣遗物", glyph: "◈", colors: ["#72b4ba", "#345a77"] },
  { name: "八棱天命核心", glyph: "S", colors: ["#efe5cb", "#6a5181"] },
] as const;

const BASE_RADII = [15, 19, 24, 29, 35, 42, 50, 59, 70] as const;

export function radiusForTier(tier: number, width = 460) {
  return BASE_RADII[Math.min(tier, BASE_RADII.length - 1)] * width / 460;
}

export function scoreForTier(tier: number) {
  return 10 * 2 ** Math.max(0, tier);
}

function resolveContact(a: MergeBody, b: MergeBody, radiusA: number, radiusB: number) {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let distance = Math.hypot(dx, dy);
  const minimum = radiusA + radiusB;
  if (distance >= minimum) return false;
  if (distance < .001) {
    dx = .01;
    dy = 0;
    distance = .01;
  }
  const nx = dx / distance;
  const ny = dy / distance;
  const overlap = minimum - distance;
  const massA = radiusA * radiusA;
  const massB = radiusB * radiusB;
  const total = massA + massB;
  a.x -= nx * overlap * massB / total;
  a.y -= ny * overlap * massB / total;
  b.x += nx * overlap * massA / total;
  b.y += ny * overlap * massA / total;

  const relativeX = b.vx - a.vx;
  const relativeY = b.vy - a.vy;
  const separatingVelocity = relativeX * nx + relativeY * ny;
  if (separatingVelocity < 0) {
    const impulse = -(1.08 * separatingVelocity) / (1 / massA + 1 / massB);
    a.vx -= impulse * nx / massA;
    a.vy -= impulse * ny / massA;
    b.vx += impulse * nx / massB;
    b.vy += impulse * ny / massB;
  }
  const tangentX = -ny;
  const tangentY = nx;
  const tangentVelocity = relativeX * tangentX + relativeY * tangentY;
  const friction = tangentVelocity * .018;
  a.vx += friction * tangentX;
  a.vy += friction * tangentY;
  b.vx -= friction * tangentX;
  b.vy -= friction * tangentY;
  return true;
}

export function stepMergePhysics(
  input: readonly MergeBody[],
  options: { width: number; height: number; dt: number; now: number; nextId: number; gravity?: number },
): MergeStepResult {
  const { width, height, now } = options;
  const dt = Math.min(.025, Math.max(0, options.dt));
  const gravity = options.gravity ?? 720;
  const bodies = input.map((body) => ({ ...body }));

  bodies.forEach((body) => {
    const radius = radiusForTier(body.tier, width);
    body.vy += gravity * dt;
    body.vx *= .999;
    body.x += body.vx * dt;
    body.y += body.vy * dt;
    if (body.x - radius < 0) {
      body.x = radius;
      body.vx = Math.abs(body.vx) * .22;
    } else if (body.x + radius > width) {
      body.x = width - radius;
      body.vx = -Math.abs(body.vx) * .22;
    }
    if (body.y + radius > height) {
      body.y = height - radius;
      body.vy = -Math.abs(body.vy) * .12;
      body.vx *= .975;
      if (Math.abs(body.vy) < 9) body.vy = 0;
    }
  });

  const claimed = new Set<number>();
  const pairs: Array<[MergeBody, MergeBody]> = [];
  let collisionCount = 0;
  for (let left = 0; left < bodies.length; left += 1) {
    for (let right = left + 1; right < bodies.length; right += 1) {
      const a = bodies[left];
      const b = bodies[right];
      const touched = resolveContact(a, b, radiusForTier(a.tier, width), radiusForTier(b.tier, width));
      if (!touched) continue;
      collisionCount += 1;
      if (a.tier !== b.tier || a.tier >= MERGE_TIERS.length - 1 || claimed.has(a.id) || claimed.has(b.id)) continue;
      if (now - a.bornAt < 120 || now - b.bornAt < 120) continue;
      claimed.add(a.id);
      claimed.add(b.id);
      pairs.push([a, b]);
    }
  }

  let nextId = options.nextId;
  const merges: MergeEvent[] = [];
  const survivors = bodies.filter((body) => !claimed.has(body.id));
  pairs.forEach(([a, b]) => {
    const tier = a.tier + 1;
    const body: MergeBody = {
      id: nextId++,
      tier,
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      vx: (a.vx + b.vx) * .34,
      vy: Math.min(20, (a.vy + b.vy) * .22),
      bornAt: now,
      popUntil: now + 280,
    };
    const radius = radiusForTier(tier, width);
    body.x = Math.max(radius, Math.min(width - radius, body.x));
    body.y = Math.min(height - radius, body.y);
    survivors.push(body);
    merges.push({ sourceIds: [a.id, b.id], body, points: scoreForTier(tier) });
  });

  return { bodies: survivors, merges, collisionCount, nextId };
}

export function updateDangerTimer(
  bodies: readonly MergeBody[],
  options: { width: number; lineY: number; now: number; previousSince: number | null; graceMs?: number },
) {
  const graceMs = options.graceMs ?? 1800;
  const above = bodies.some((body) => options.now - body.bornAt > 900 && body.y - radiusForTier(body.tier, options.width) < options.lineY);
  const since = above ? options.previousSince ?? options.now : null;
  return { above, since, gameOver: since !== null && options.now - since >= graceMs, progress: since === null ? 0 : Math.min(1, (options.now - since) / graceMs) };
}

export function nextMergeTier(seed: number) {
  const nextSeed = (Math.imul(seed ^ seed >>> 15, 2246822519) + 3266489917) >>> 0;
  const roll = nextSeed / 4294967296;
  return { seed: nextSeed, tier: roll < .62 ? 0 : roll < .91 ? 1 : 2 };
}
