import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ASTERISMS, POLARIS_HIP, STRIDE, cameraBasis, directionAt, equatorialCamera, equatorialCoordinates, equatorialVector, horizontalCoordinates, julianDate, localBasis, meanSiderealDegrees, panCamera, parseCatalog, precess, precessionAngles, prepareDirections, project, toEquatorial, toHorizontal, type Vec3 } from "../app/club/observatory/sky-engine.ts";

const raw = readFileSync(new URL("../public/data/mafraer-hyg-v41.bin", import.meta.url));
const buffer = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer;
const metadata = JSON.parse(readFileSync(new URL("../public/data/mafraer-hyg-v41.json", import.meta.url), "utf8"));
const catalog = parseCatalog(buffer, metadata);
const near = (actual: number, expected: number, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);
const epoch = Date.UTC(2000, 0, 1, 12);

test("Julian epoch and USNO sidereal reference have correct time and east-longitude signs", () => {
  near(julianDate(epoch), 2451545);
  near(meanSiderealDegrees(epoch), 280.46062332, .00001);
  near(meanSiderealDegrees(epoch, 90), (meanSiderealDegrees(epoch) + 90) % 360);
  const lst = meanSiderealDegrees(epoch) / 15;
  const local = localBasis(epoch, { latitude: 0, longitude: 0, label: "Equator" });
  const rising = horizontalCoordinates(toHorizontal(equatorialVector(lst + 6, 0), local));
  const setting = horizontalCoordinates(toHorizontal(equatorialVector(lst - 6, 0), local));
  near(rising.altitude, 0); near(rising.azimuth, 90);
  near(setting.altitude, 0); near(setting.azimuth, 270);
});

test("precession matches all nine independent ERFA/SOFA pmat76 reference values", () => {
  // Numeric reference: official liberfa/erfa src/t_erfa_c.c, t_pmat76.
  // https://github.com/liberfa/erfa/blob/master/src/t_erfa_c.c
  const timestamp = (2400000.5 + 50123.9999 - 2440587.5) * 86400000;
  const expected = [
    [.9999995504328350733, .0008696632209480960785, .0003779153474959888345],
    [-.0008696632209485112192, .9999996218428560614, -.0000001643284776111886407],
    [-.0003779153474950335077, -.0000001643306746147366896, .9999999285899790119],
  ];
  for (let column = 0; column < 3; column++) {
    const unit = [0, 0, 0]; unit[column] = 1;
    const actual = precess(unit as unknown as Vec3, precessionAngles(timestamp));
    for (let row = 0; row < 3; row++) near(actual[row], expected[row][column], 1e-12);
  }
});

test("catalogue is genuine, complete at the declared limit, and includes the default and guide targets", () => {
  assert.equal(catalog.count, 99049);
  assert.equal(metadata.names["11734"].name, "Polaris");
  assert.equal(catalog.data[catalog.byHip.get(POLARIS_HIP)! * STRIDE], 11734);
  for (const hip of [11767, 54061, 3179, 91262, 32349, ...ASTERISMS.flatMap((group) => group.hips)]) assert.ok(catalog.byHip.has(hip), `Missing target HIP ${hip}`);
  for (let i = 0; i < catalog.count; i++) {
    const p = i * STRIDE;
    assert.ok(catalog.data[p] > 0, "No synthetic Sun record");
    assert.ok(catalog.data[p + 8] <= 9.5);
    near(Math.hypot(catalog.data[p + 2], catalog.data[p + 3], catalog.data[p + 4]), 1, 1e-6);
  }
  assert.throws(() => parseCatalog(buffer.slice(0, buffer.byteLength - 4), metadata), /Invalid star catalogue/);
});

test("geometric pole altitude follows latitude and horizontal transforms survive both hemispheres", () => {
  const dates = [epoch, Date.UTC(2026, 9, 11, 14), Date.UTC(2050, 5, 1)];
  for (const latitude of [-70, -33.9, 0, 1.35, 35.4, 89]) for (const longitude of [-120, 0, 103.82]) for (const date of dates) {
    const local = localBasis(date, { latitude, longitude, label: "Test" });
    near(horizontalCoordinates(toHorizontal([0, 0, 1], local)).altitude, latitude);
    for (const direction of [equatorialVector(0, 0), equatorialVector(23.9, -80), equatorialVector(2.5, 89.2)]) {
      const actual = toEquatorial(toHorizontal(direction, local), local);
      for (let axis = 0; axis < 3; axis++) near(actual[axis], direction[axis]);
    }
  }
});

test("Polaris stays centred while current dates and observing locations change", () => {
  const index = catalog.byHip.get(POLARIS_HIP)!;
  for (const timestamp of [Date.UTC(2026, 9, 11), Date.UTC(2026, 9, 11, 12), Date.UTC(2030, 0, 1)]) {
    const directions = prepareDirections(catalog, timestamp), polaris = directionAt(directions, index);
    const eq = equatorialCoordinates(polaris);
    assert.ok(eq.dec > 89.3 && eq.dec < 89.5, "Current Polaris uses epoch precession");
    for (const latitude of [1.35, 35.4, -33.9]) {
      const local = localBasis(timestamp, { latitude, longitude: 103.82, label: "Test" });
      const horizontal = toHorizontal(polaris, local);
      const image = project(polaris, equatorialCamera(cameraBasis(horizontal), local), 500, 14)!;
      near(image.x, 250, .0001); near(image.y, 250, .0001);
      assert.equal(horizontalCoordinates(horizontal).altitude > 0, latitude > 0);
    }
  }
});

test("projection avoids rear-sphere stars and dragging remains finite at the zenith and pole", () => {
  const camera = cameraBasis([0, 1, 0]);
  assert.equal(project([0, -1, 0], camera, 500, 14), null);
  near(project([0, 1, 0], camera, 500, 14)!.x, 250);
  for (const start of [[0, 0, 1], [0, 0, -1], [0, 1, 0]] as Vec3[]) {
    const end = panCamera(start, 80, -60, 500, 4);
    assert.ok(end.every(Number.isFinite)); near(Math.hypot(...end), 1);
  }
});

