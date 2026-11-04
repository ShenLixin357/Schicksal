// The wrist and the folding mechanism have separate, deliberately asymmetric tracks.
// Velocities are tangents per cycle, not a shared sine or constant angular speed.
export const FAN_CYCLE_MS = 5200;
export const FAN_TILT_DEG = 28;
export const FAN_RIB_COUNT = 17;
export const FAN_RADIUS = 224;
export const FAN_MIN_SPREAD_DEG = 4;
export const FAN_MAX_SPREAD_DEG = 156;

type MotionKey = { at: number; value: number; velocity: number };

const WRIST_TRACK: MotionKey[] = [
  { at: 0, value: 0, velocity: 135 },
  { at: .16, value: 55, velocity: 380 },
  { at: .32, value: 105, velocity: 240 },
  { at: .50, value: 150, velocity: 320 },
  { at: .545, value: 170, velocity: 700 },
  { at: .568, value: 185, velocity: 850 },
  { at: .60, value: 215, velocity: 720 },
  { at: .75, value: 270, velocity: 340 },
  { at: .90, value: 325, velocity: 570 },
  { at: .95, value: 349, velocity: 375 },
  { at: .98, value: 357, velocity: 170 },
  { at: 1, value: 360, velocity: 135 },
];

const FOLD_TRACK: MotionKey[] = [
  { at: 0, value: 1, velocity: 0 },
  { at: .11, value: .94, velocity: -1.3 },
  { at: .19, value: .80, velocity: -1.85 },
  { at: .34, value: .52, velocity: -1.95 },
  { at: .485, value: .17, velocity: -3.3 },
  { at: .55, value: .012, velocity: 0 },
  { at: .575, value: .025, velocity: 1.2 },
  { at: .64, value: .28, velocity: 4.2 },
  { at: .73, value: .55, velocity: 2 },
  { at: .79, value: .70, velocity: 2.8 },
  { at: .87, value: .90, velocity: 1.8 },
  { at: .94, value: .981, velocity: .7 },
  { at: .98, value: .999, velocity: .08 },
  { at: 1, value: 1, velocity: 0 },
];

function sampleTrack(track: MotionKey[], phase: number) {
  const index = track.findIndex((key) => key.at > phase);
  if (index < 0) return track[track.length - 1].value;
  const a = track[Math.max(0, index - 1)];
  const b = track[index];
  const span = b.at - a.at;
  if (!span) return a.value;
  const u = (phase - a.at) / span;
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * a.value
    + (u3 - 2 * u2 + u) * span * a.velocity
    + (-2 * u3 + 3 * u2) * b.value
    + (u3 - u2) * span * b.velocity;
}

export function fanSpread(openProgress: number) {
  return FAN_MIN_SPREAD_DEG + Math.max(0, Math.min(1, openProgress)) * (FAN_MAX_SPREAD_DEG - FAN_MIN_SPREAD_DEG);
}

export function sampleFanMotion(elapsedMs: number) {
  const phase = ((elapsedMs % FAN_CYCLE_MS) + FAN_CYCLE_MS) % FAN_CYCLE_MS / FAN_CYCLE_MS;
  return {
    phase,
    azimuth: sampleTrack(WRIST_TRACK, phase),
    openProgress: Math.max(0, Math.min(1, sampleTrack(FOLD_TRACK, phase))),
    tilt: FAN_TILT_DEG,
  };
}

export function ribAngle(index: number, openProgress: number) {
  return (index / (FAN_RIB_COUNT - 1) - .5) * fanSpread(openProgress);
}

function polar(radius: number, angle: number) {
  const radians = angle * Math.PI / 180;
  return [radius * Math.sin(radians), -radius * Math.cos(radians)];
}

function point(radius: number, angle: number) {
  return polar(radius, angle).map((value) => value.toFixed(2)).join(" ");
}

// Each leaf is a real wedge between adjacent moving ribs. Every lace vertex is
// recomputed in polar coordinates as the ribs gather; no sprite is squeezed.
export function lacePanelGeometry(openProgress: number) {
  const half = fanSpread(openProgress) / (FAN_RIB_COUNT - 1) / 2;
  const at = (r: number, fraction: number) => point(r, (fraction * 2 - 1) * half);
  const leaf = `M ${at(86, 0)} L ${at(216, 0)} Q ${at(231, .25)} ${at(224, .5)} Q ${at(231, .75)} ${at(216, 1)} L ${at(86, 1)} A 86 86 0 0 0 ${at(86, 0)} Z`;
  const hem = `M ${at(213, 0)} Q ${at(227, .25)} ${at(220, .5)} Q ${at(227, .75)} ${at(213, 1)} M ${at(102, 0)} A 102 102 0 0 1 ${at(102, 1)}`;
  const mesh: string[] = [];
  for (let r = 106; r < 210; r += 10) {
    for (let col = 0; col < 4; col++) {
      const f = col / 4;
      mesh.push(`M ${at(r, f)} L ${at(r + 5, f + .125)} L ${at(r + 10, f)} M ${at(r, f + .25)} L ${at(r + 5, f + .125)} L ${at(r + 10, f + .25)}`);
    }
  }
  // Woven fleur-de-lis, mirrored scrolls and a pearl-edged scalloped hem.
  const embroidery: string[] = [];
  for (const r of [128, 165, 199]) {
    embroidery.push(`M ${at(r - 13, .5)} C ${at(r - 4, .13)} ${at(r + 7, .08)} ${at(r + 9, .25)} C ${at(r + 12, .41)} ${at(r + 4, .48)} ${at(r, .5)} C ${at(r + 4, .52)} ${at(r + 12, .59)} ${at(r + 9, .75)} C ${at(r + 7, .92)} ${at(r - 4, .87)} ${at(r - 13, .5)} M ${at(r - 7, .5)} Q ${at(r + 2, .32)} ${at(r + 14, .5)} Q ${at(r + 2, .68)} ${at(r - 7, .5)}`);
  }
  return { leaf, mesh: mesh.join(" "), embroidery: embroidery.join(" "), hem };
}

// Matches CSS rotateY(azimuth) rotateX(tilt), useful for frozen-frame checks.
export function orientFanPoint(x: number, y: number, azimuth: number, tilt = FAN_TILT_DEG) {
  const a = azimuth * Math.PI / 180;
  const b = tilt * Math.PI / 180;
  const tiltedY = y * Math.cos(b);
  const tiltedZ = y * Math.sin(b);
  return { x: x * Math.cos(a) + tiltedZ * Math.sin(a), y: tiltedY, z: -x * Math.sin(a) + tiltedZ * Math.cos(a) };
}
