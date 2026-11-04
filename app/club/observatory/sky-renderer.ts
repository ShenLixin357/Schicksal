import { ASTERISMS, DEG, STRIDE, clamp, directionAt, dot, equatorialCamera, equatorialVector, magnitudeLimit, project, starColour, type CameraBasis, type LocalBasis, type StarCatalog } from "./sky-engine";

export type SkyHit = { x: number; y: number; index: number; magnitude: number };
export type SkyOptions = {
  size: number; fieldOfView: number; selected: number; horizon: boolean;
  lines: boolean; grid: boolean; camera: CameraBasis; local: LocalBasis;
};

export function paintSky(context: CanvasRenderingContext2D, catalog: StarCatalog, directions: Float32Array, options: SkyOptions): SkyHit[] {
  const { size, fieldOfView, selected, horizon, lines, grid, camera, local } = options;
  const center = size / 2, radius = center - 10;
  const rig = equatorialCamera(camera, local);
  const background = context.createRadialGradient(center * .85, center * .7, 0, center, center, center);
  background.addColorStop(0, "#10172d"); background.addColorStop(.65, "#080e20"); background.addColorStop(1, "#02050f");
  context.clearRect(0, 0, size, size);
  context.fillStyle = background; context.fillRect(0, 0, size, size);
  context.save();
  context.beginPath(); context.arc(center, center, radius, 0, 2 * Math.PI); context.clip();

  const trace = (vectors: readonly (readonly [number, number, number])[], style: string, dashed = false) => {
    context.beginPath();
    let previous: { x: number; y: number } | null = null;
    for (const vector of vectors) {
      const point = project(vector, rig, size, fieldOfView);
      if (!point || (horizon && dot(vector, local.up) < 0)) { previous = null; continue; }
      if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) > size * .5) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
      previous = point;
    }
    context.strokeStyle = style; context.lineWidth = .7; context.setLineDash(dashed ? [3, 5] : []); context.stroke(); context.setLineDash([]);
  };

  if (grid) {
    for (let dec = -75; dec <= 75; dec += 15) trace(Array.from({ length: 181 }, (_, i) => equatorialVector(i * 24 / 180, dec)), "rgba(130,175,225,.17)", true);
    for (let ra = 0; ra < 24; ra += 2) trace(Array.from({ length: 91 }, (_, i) => equatorialVector(ra, -90 + i * 2)), "rgba(130,175,225,.17)", true);
  }
  if (lines) for (const asterism of ASTERISMS) {
    const vectors = asterism.hips.map((hip) => catalog.byHip.get(hip)).filter((index): index is number => index !== undefined).map((index) => directionAt(directions, index));
    trace(vectors, "rgba(152,203,245,.33)");
  }

  // In a gnomonic eyepiece the geometric horizon is a line. Clip a square to
  // its below-horizon half-plane, then let the circular lens clip that polygon.
  if (horizon) {
    const focal = radius / Math.tan(fieldOfView * DEG / 2);
    const height = (p: { x: number; y: number }) => camera.forward[2] + camera.right[2] * (p.x - center) / focal - camera.up[2] * (p.y - center) / focal;
    const corners = [{ x: 0, y: 0 }, { x: size, y: 0 }, { x: size, y: size }, { x: 0, y: size }];
    const ground = [], crossings = [];
    for (let i = 0; i < corners.length; i++) {
      const a = corners[i], b = corners[(i + 1) % corners.length];
      const ha = height(a), hb = height(b);
      if (ha <= 0) ground.push(a);
      if ((ha < 0) !== (hb < 0)) {
        const t = ha / (ha - hb);
        const intersection = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
        ground.push(intersection); crossings.push(intersection);
      }
    }
    if (ground.length) {
      context.beginPath(); ground.forEach((p, i) => i ? context.lineTo(p.x, p.y) : context.moveTo(p.x, p.y)); context.closePath();
      context.fillStyle = "rgba(19,14,22,.97)"; context.fill();
    }
    if (crossings.length === 2) {
      context.beginPath(); context.moveTo(crossings[0].x, crossings[0].y); context.lineTo(crossings[1].x, crossings[1].y);
      context.strokeStyle = "rgba(185,165,209,.55)"; context.lineWidth = 1; context.stroke();
      const y = (crossings[0].y + crossings[1].y) / 2;
      if (y > 35 && y < size - 35) { context.fillStyle = "#ae9dbc"; context.font = "11px sans-serif"; context.fillText("地平线", center - 22, y + 18); }
    }
  }

  const hits: SkyHit[] = [];
  const limit = magnitudeLimit(fieldOfView), minimumDepth = Math.cos(fieldOfView * DEG / 2);
  let labels = 0;
  for (let index = catalog.count - 1; index >= 0; index--) {
    const p = index * STRIDE, q = index * 3;
    const magnitude = catalog.data[p + 8];
    if (magnitude > limit) continue;
    const x = directions[q], y = directions[q + 1], z = directions[q + 2];
    if (x * rig.forward[0] + y * rig.forward[1] + z * rig.forward[2] < minimumDepth) continue;
    if (horizon && x * local.up[0] + y * local.up[1] + z * local.up[2] < 0) continue;
    const point = project([x, y, z], rig, size, fieldOfView);
    if (!point || Math.hypot(point.x - center, point.y - center) > radius) continue;
    hits.push({ ...point, index, magnitude });
    const colour = starColour(catalog.data[p + 9]);
    const starRadius = clamp(.45 + 1.6 * Math.pow(10, -.18 * (magnitude - 1)), .48, 3.8);
    context.globalAlpha = clamp(.28 + .9 * Math.pow(10, -.1 * (magnitude - 2)), .3, 1);
    if (magnitude < 3.6) {
      const halo = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, starRadius * 8);
      halo.addColorStop(0, colour); halo.addColorStop(.2, colour + "6b"); halo.addColorStop(1, colour + "00");
      context.fillStyle = halo; context.beginPath(); context.arc(point.x, point.y, starRadius * 8, 0, 2 * Math.PI); context.fill();
      context.beginPath(); context.moveTo(point.x - starRadius * 4, point.y); context.lineTo(point.x + starRadius * 4, point.y);
      context.moveTo(point.x, point.y - starRadius * 4); context.lineTo(point.x, point.y + starRadius * 4);
      context.strokeStyle = colour + "70"; context.lineWidth = .6; context.stroke();
    }
    context.fillStyle = colour; context.beginPath(); context.arc(point.x, point.y, starRadius, 0, 2 * Math.PI); context.fill();
    context.globalAlpha = 1;
    const name = catalog.metadata.names[String(catalog.data[p])]?.name;
    if (index === selected) {
      context.beginPath(); context.arc(point.x, point.y, 13, 0, 2 * Math.PI); context.strokeStyle = "rgba(166,217,255,.76)"; context.lineWidth = .8; context.stroke();
      context.fillStyle = "#dbefff"; context.font = "12px sans-serif";
      const label = catalog.data[p + 1] === 11767 ? "北极星 · Polaris" : name || (catalog.data[p + 1] ? `HIP ${catalog.data[p + 1]}` : `HYG ${catalog.data[p]}`);
      context.fillText(label, point.x + 18, point.y - 12);
    } else if (name && magnitude < 3.6 && labels++ < 12) {
      context.fillStyle = "rgba(199,213,234,.69)"; context.font = "10px sans-serif"; context.fillText(name, point.x + 8, point.y - 6);
    }
  }
  context.restore(); context.globalAlpha = 1;
  context.beginPath(); context.arc(center, center, radius, 0, Math.PI * 2);
  context.strokeStyle = "rgba(139,183,219,.28)"; context.lineWidth = 1; context.stroke();
  return hits;
}

