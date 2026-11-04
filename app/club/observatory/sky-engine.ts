// HYG J2000 directions + catalogue space motion, IAU 1976 precession,
// USNO mean sidereal time, and a geometric topocentric horizontal frame.
// UTC approximates UT1. No weather, aberration, nutation or atmospheric refraction.
export type Vec3 = readonly [number, number, number];
export type Observer = { latitude: number; longitude: number; label: string };
export type StarName = { name: string; designation: string; constellation: string };
export type CatalogMetadata = {
  starCount: number; catalogue: string; names: Record<string, StarName>;
};
export type StarCatalog = { data: Float32Array; count: number; metadata: CatalogMetadata; byHip: Map<number, number> };
export type LocalBasis = { east: Vec3; north: Vec3; up: Vec3 };
export type CameraBasis = { forward: Vec3; right: Vec3; up: Vec3 };
export const STRIDE = 10;
export const POLARIS_HIP = 11767;
export const DEG = Math.PI / 180;
export const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
export const wrap = (value: number, period: number) => ((value % period) + period) % period;
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export function normalize(vector: Vec3): Vec3 {
  const length = Math.hypot(...vector);
  if (!Number.isFinite(length) || length < 1e-12) throw new Error("Invalid sky direction");
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}
export const julianDate = (timestamp: number) => timestamp / 86400000 + 2440587.5;

export function meanSiderealDegrees(timestamp: number, longitude = 0) {
  // https://aa.usno.navy.mil/faq/GAST -- split Julian day at UTC midnight.
  const jd = julianDate(timestamp);
  const midnight = Math.floor(jd - .5) + .5;
  const hours = (jd - midnight) * 24;
  const days = midnight - 2451545;
  const centuries = (jd - 2451545) / 36525;
  const gmst = 6.697375 + .065709824279 * days + 1.0027379 * hours + .0000258 * centuries ** 2;
  return wrap(gmst * 15 + longitude, 360);
}

export function precessionAngles(timestamp: number) {
  const t = (julianDate(timestamp) - 2451545) / 36525;
  const arcsec = DEG / 3600;
  return {
    zeta: (2306.2181 * t + .30188 * t ** 2 + .017998 * t ** 3) * arcsec,
    z: (2306.2181 * t + 1.09468 * t ** 2 + .018203 * t ** 3) * arcsec,
    theta: (2004.3109 * t - .42665 * t ** 2 - .041833 * t ** 3) * arcsec,
  };
}

export function precess(vector: Vec3, angles: ReturnType<typeof precessionAngles>): Vec3 {
  const a = Math.cos(angles.zeta) * vector[0] - Math.sin(angles.zeta) * vector[1];
  const b = Math.sin(angles.zeta) * vector[0] + Math.cos(angles.zeta) * vector[1];
  const c = Math.cos(angles.theta) * a - Math.sin(angles.theta) * vector[2];
  const d = Math.sin(angles.theta) * a + Math.cos(angles.theta) * vector[2];
  return [Math.cos(angles.z) * c - Math.sin(angles.z) * b, Math.sin(angles.z) * c + Math.cos(angles.z) * b, d];
}

export function parseCatalog(buffer: ArrayBuffer, metadata: CatalogMetadata): StarCatalog {
  if (buffer.byteLength < 16) throw new Error("Incomplete star catalogue");
  const header = new DataView(buffer);
  const magic = String.fromCharCode(...new Uint8Array(buffer, 0, 4));
  const count = header.getUint32(8, true);
  if (magic !== "MSKY" || header.getUint32(4, true) !== 1 || header.getUint32(12, true) !== STRIDE || count !== metadata.starCount || count < 1 || buffer.byteLength !== 16 + count * STRIDE * 4) {
    throw new Error("Invalid star catalogue format");
  }
  const data = new Float32Array(count * STRIDE);
  const byHip = new Map<number, number>();
  for (let i = 0; i < data.length; i++) {
    const value = header.getFloat32(16 + i * 4, true);
    if (!Number.isFinite(value)) throw new Error("Invalid star catalogue value");
    data[i] = value;
  }
  for (let i = 0; i < count; i++) {
    const hip = data[i * STRIDE + 1];
    if (hip > 0 && !byHip.has(hip)) byHip.set(hip, i);
  }
  if (!byHip.has(POLARIS_HIP)) throw new Error("Catalogue does not contain Polaris");
  return { data, count, metadata, byHip };
}

export function prepareDirections(catalog: StarCatalog, timestamp: number): Float32Array {
  const years = (julianDate(timestamp) - 2451545) / 365.25;
  const angles = precessionAngles(timestamp);
  const columns = [precess([1, 0, 0], angles), precess([0, 1, 0], angles), precess([0, 0, 1], angles)];
  const output = new Float32Array(catalog.count * 3);
  const data = catalog.data;
  for (let i = 0; i < catalog.count; i++) {
    const p = i * STRIDE;
    const x = data[p + 2] + years * data[p + 5], y = data[p + 3] + years * data[p + 6], z = data[p + 4] + years * data[p + 7];
    const length = Math.hypot(x, y, z);
    for (let axis = 0; axis < 3; axis++) output[i * 3 + axis] = (x * columns[0][axis] + y * columns[1][axis] + z * columns[2][axis]) / length;
  }
  return output;
}

export function directionAt(directions: Float32Array, index: number): Vec3 {
  return [directions[index * 3], directions[index * 3 + 1], directions[index * 3 + 2]];
}

export function localBasis(timestamp: number, observer: Observer): LocalBasis {
  const sidereal = meanSiderealDegrees(timestamp, observer.longitude) * DEG;
  const latitude = observer.latitude * DEG;
  const s = Math.sin(sidereal), c = Math.cos(sidereal);
  const sl = Math.sin(latitude), cl = Math.cos(latitude);
  return { east: [-s, c, 0], north: [-sl * c, -sl * s, cl], up: [cl * c, cl * s, sl] };
}

export const toHorizontal = (vector: Vec3, basis: LocalBasis): Vec3 => [dot(vector, basis.east), dot(vector, basis.north), dot(vector, basis.up)];
export function toEquatorial(vector: Vec3, basis: LocalBasis): Vec3 {
  return [0, 1, 2].map((i) => vector[0] * basis.east[i] + vector[1] * basis.north[i] + vector[2] * basis.up[i]) as unknown as Vec3;
}

export function horizontalCoordinates(vector: Vec3) {
  return { altitude: Math.asin(clamp(vector[2], -1, 1)) / DEG, azimuth: wrap(Math.atan2(vector[0], vector[1]) / DEG, 360) };
}

export function equatorialCoordinates(vector: Vec3) {
  return { ra: wrap(Math.atan2(vector[1], vector[0]) / DEG / 15, 24), dec: Math.asin(clamp(vector[2], -1, 1)) / DEG };
}

export function cameraBasis(forward: Vec3): CameraBasis {
  const horizontal = Math.hypot(forward[0], forward[1]);
  const right: Vec3 = horizontal < 1e-7 ? [1, 0, 0] : [forward[1] / horizontal, -forward[0] / horizontal, 0];
  const up: Vec3 = [right[1] * forward[2], -right[0] * forward[2], right[0] * forward[1] - right[1] * forward[0]];
  return { forward, right, up };
}

export function equatorialCamera(camera: CameraBasis, basis: LocalBasis): CameraBasis {
  return { forward: toEquatorial(camera.forward, basis), right: toEquatorial(camera.right, basis), up: toEquatorial(camera.up, basis) };
}

export function project(vector: Vec3, camera: CameraBasis, size: number, fieldOfView: number) {
  const depth = dot(vector, camera.forward);
  if (depth <= 1e-6) return null;
  const focal = (size / 2 - 10) / Math.tan(fieldOfView * DEG / 2);
  return { x: size / 2 + dot(vector, camera.right) * focal / depth, y: size / 2 - dot(vector, camera.up) * focal / depth };
}

export function panCamera(forward: Vec3, dx: number, dy: number, size: number, fieldOfView: number): Vec3 {
  const camera = cameraBasis(forward);
  const focal = (size / 2 - 10) / Math.tan(fieldOfView * DEG / 2);
  return normalize([0, 1, 2].map((i) => forward[i] - camera.right[i] * dx / focal + camera.up[i] * dy / focal) as unknown as Vec3);
}

export const equatorialVector = (raHours: number, decDegrees: number): Vec3 => {
  const ra = raHours * 15 * DEG, dec = decDegrees * DEG;
  return [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
};

export const magnitudeLimit = (fieldOfView: number) => clamp(10.8 - 1.65 * Math.log10(fieldOfView), 5.8, 9.5);
export const starColour = (colorIndex: number) => colorIndex < -.05 ? "#b6d5ff" : colorIndex < .35 ? "#eef2ff" : colorIndex < .9 ? "#fff2df" : colorIndex < 1.4 ? "#ffd3a2" : "#ffc08d";

// Self-authored conventional northern asterism polylines, keyed to actual HIP
// catalogue stars. Connections are optional guides, not invented sky objects.
export const ASTERISMS = [
  { name: "小熊座", hips: [11767, 85822, 82080, 77055, 72607, 75097, 79822, 77055] },
  { name: "北斗七星", hips: [54061, 53910, 58001, 59774, 54061] },
  { name: "北斗斗柄", hips: [59774, 62956, 65378, 67301] },
  { name: "仙后座", hips: [746, 3179, 4427, 6686, 8886] },
];

