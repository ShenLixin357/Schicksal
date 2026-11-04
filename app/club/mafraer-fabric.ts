import { curtainPoint, pillowPose, quiltPoint, type Point } from "./mafraer-magic-motion";

type FabricPart = { x: number; y: number; w: number; h: number; path: string };
// The animation samples the original art, not a replacement bed illustration.
// These traced textile boundaries deliberately exclude the mattress edges,
// ice railings, bed supports and the separate dark under-bed secret curtains.
const PARTS = {
  canopy: { x: 363, y: 244, w: 305, h: 197, path: "M365 438 Q407 407 439 355 Q458 307 484 276 L530 247 Q554 270 589 291 Q613 321 619 360 Q621 391 662 435 L639 439 Q608 417 590 389 Q570 399 548 397 Q494 389 462 410 Q412 429 365 438Z" },
  left: { x: 370, y: 394, w: 104, h: 408, path: "M433 396 Q447 411 444 449 Q437 496 439 547 Q434 590 442 638 Q443 692 452 736 Q454 766 470 781 Q459 798 435 794 L379 791 Q369 786 379 779 Q401 768 406 734 Q413 695 415 651 Q414 596 417 558 Q416 504 420 467 L419 425Z" },
  right: { x: 623, y: 394, w: 91, h: 400, path: "M632 396 Q642 407 641 433 Q652 467 656 519 Q660 559 666 603 Q669 651 675 696 Q678 741 692 764 Q695 776 710 779 L711 790 Q681 794 658 785 Q648 764 647 733 Q645 690 643 652 Q641 601 639 564 Q636 522 635 487 Q633 455 628 427Z" },
  quilt: { x: 445, y: 409, w: 157, h: 269, path: "M451 416 Q480 406 530 413 Q571 413 598 424 L596 475 Q592 528 593 573 L587 620 Q578 646 554 651 L539 665 Q517 681 499 666 Q481 655 470 640 L459 611 Q451 586 448 555 Q451 521 450 485 Q447 453 451 416Z" },
  throw: { x: 595, y: 415, w: 79, h: 217, path: "M596 419 Q623 425 650 434 Q660 439 665 458 L671 542 L671 618 Q661 628 651 628 L647 570 L645 509 L638 464 Q617 441 596 439Z" },
  pillow0: { x: 468, y: 382, w: 63, h: 40, path: "M470 393 L482 383 Q502 386 519 394 L530 410 Q521 419 502 418 L479 411Z" },
  pillow1: { x: 514, y: 390, w: 66, h: 34, path: "M517 393 Q537 390 552 395 L568 399 L578 419 Q548 424 526 418Z" },
  pillow2: { x: 564, y: 391, w: 64, h: 39, path: "M566 397 Q582 390 600 400 L618 402 L626 424 L577 421Z" },
} satisfies Record<string, FabricPart>;
type PartName = keyof typeof PARTS;
type Textures = Record<PartName, HTMLCanvasElement>;
type FabricSet = { art: HTMLImageElement; parts: Textures; holes: Textures };

function maskedTextures(art: HTMLImageElement): Textures {
  return Object.fromEntries(Object.entries(PARTS).map(([name, part]) => {
    const canvas = document.createElement("canvas"); canvas.width = part.w; canvas.height = part.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Fabric canvas unavailable");
    ctx.translate(-part.x, -part.y);
    ctx.clip(new Path2D(part.path));
    ctx.drawImage(art, 0, 0, 1672, 941);
    return [name, canvas];
  })) as Textures;
}

export function extractFabric(art: HTMLImageElement, clean: HTMLImageElement): FabricSet {
  return { art, parts: maskedTextures(art), holes: maskedTextures(clean) };
}

function triangle(ctx: CanvasRenderingContext2D, texture: HTMLCanvasElement, src: Point[], dst: Point[]) {
  const [s0, s1, s2] = src, [d0, d1, d2] = dst;
  const det = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
  if (Math.abs(det) < .001) return;
  const a = (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / det;
  const b = (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / det;
  const c = (d0.x * (s2.x - s1.x) + d1.x * (s0.x - s2.x) + d2.x * (s1.x - s0.x)) / det;
  const d = (d0.y * (s2.x - s1.x) + d1.y * (s0.x - s2.x) + d2.y * (s1.x - s0.x)) / det;
  const e = d0.x - a * s0.x - c * s0.y, f = d0.y - b * s0.x - d * s0.y;
  ctx.save(); ctx.beginPath();
  // A tiny overlap prevents antialiased cracks between neighbouring triangles.
  const centre = { x: (d0.x + d1.x + d2.x) / 3, y: (d0.y + d1.y + d2.y) / 3 };
  dst.forEach((p, i) => {
    const dx = p.x - centre.x, dy = p.y - centre.y, length = Math.hypot(dx, dy) || 1;
    const x = p.x + dx / length * .32, y = p.y + dy / length * .32;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath(); ctx.clip(); ctx.transform(a, b, c, d, e, f); ctx.drawImage(texture, 0, 0); ctx.restore();
}

function mesh(ctx: CanvasRenderingContext2D, texture: HTMLCanvasElement, part: FabricPart, deform: (point: Point, u: number, v: number) => Point) {
  const columns = 8, rows = 13;
  const vertices = Array.from({ length: rows + 1 }, (_, row) => Array.from({ length: columns + 1 }, (_, col) => {
    const u = col / columns, v = row / rows;
    return deform({ x: part.x + u * part.w, y: part.y + v * part.h }, u, v);
  }));
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const x = col / columns * part.w, y = row / rows * part.h, right = (col + 1) / columns * part.w, bottom = (row + 1) / rows * part.h;
    triangle(ctx, texture, [{ x, y }, { x: right, y }, { x, y: bottom }], [vertices[row][col], vertices[row][col + 1], vertices[row + 1][col]]);
    triangle(ctx, texture, [{ x: right, y: bottom }, { x, y: bottom }, { x: right, y }], [vertices[row + 1][col + 1], vertices[row + 1][col], vertices[row][col + 1]]);
  }
}

export function paintFabric(ctx: CanvasRenderingContext2D, fabric: FabricSet, bedSeconds: number | null, closed: number) {
  const textures = fabric.parts;
  // A registered original-art tile retains the fine stationary trim and the
  // exact idle silhouette. Only a moving textile's traced region is replaced
  // by its corresponding clean plate before that textile is deformed.
  ctx.drawImage(fabric.art, 354, 235, 375, 568, 354, 235, 375, 568);
  const reveal = (name: PartName) => ctx.drawImage(fabric.holes[name], PARTS[name].x, PARTS[name].y);
  if (bedSeconds !== null) (["quilt", "throw", "pillow0", "pillow1", "pillow2"] as const).forEach(reveal);
  if (closed > 0) { reveal("left"); reveal("right"); }
  (["pillow0", "pillow1", "pillow2"] as const).forEach((name, index) => {
    if (bedSeconds === null) return;
    const pose = pillowPose(index, bedSeconds), part = PARTS[name];
    ctx.save(); ctx.translate(part.x + part.w / 2 + pose.x, part.y + part.h / 2 + pose.y);
    ctx.rotate(pose.angle * Math.PI / 180); ctx.drawImage(textures[name], -part.w / 2, -part.h / 2); ctx.restore();
  });
  (["quilt", "throw"] as const).forEach((name) => {
    if (bedSeconds !== null) mesh(ctx, textures[name], PARTS[name], (p, u, v) => quiltPoint(p, name === "throw" ? .8 + .2 * u : .8 * u, v, bedSeconds));
  });
  (["left", "right"] as const).forEach((side) => {
    if (closed > 0) mesh(ctx, textures[side], PARTS[side], (p, u, v) => curtainPoint(p, u, v, side, closed));
  });
}
