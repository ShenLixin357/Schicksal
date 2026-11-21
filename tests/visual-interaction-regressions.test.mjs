import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isCurrentPresident, withOfficeHolders, ATLAS_OFFICES } from "../app/identity/office-registry.ts";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("elected President dots are globally loaded and no longer trapped in lazy Lounge CSS", () => {
  const root=read("app/layout.tsx");
  const shared=read("app/identity/office-insignia.css");
  const lounge=read("app/club/lounge-scenes.css");
  const mark=read("app/identity/public-mark.tsx");

  assert.match(root,/import "\.\/identity\/office-insignia\.css";/);
  assert.match(shared,/\.citizen-mark\.leader\s*\{/);
  assert.match(shared,/\.citizen-mark\.leader::after\s*\{/);
  assert.match(shared,/repeating-conic-gradient\(from 0deg,var\(--mark\) 0 2deg,transparent 2deg 30deg\)/);
  assert.match(shared,/inset: -7px/);
  assert.match(shared,/opacity: \.62/);
  assert.doesNotMatch(lounge,/\.citizen-mark\.leader\s*\{|\.citizen-mark\.leader::after/);
  assert.match(mark,/isCurrentPresident\(citizen\.id\)/);
  assert.match(mark,/personal-simple\$\{leaderClass\}/);
  assert.match(mark,/style=\{\{ "--mark": markColor \}/);
  assert.ok(isCurrentPresident("amberina"));
  assert.ok(!isCurrentPresident("zxy"));
  const draft=withOfficeHolders(ATLAS_OFFICES,"president",["zxy"]);
  assert.ok(isCurrentPresident("zxy",draft));
  assert.ok(!isCurrentPresident("amberina",draft));
});

test("Atlas stays in collection as a placeholder, with unapproved visual assets excluded", () => {
  const nav=read("app/shell/navigation.ts");
  const placeholder=read("app/shell/placeholder.tsx");
  const page=read("app/page.tsx");
  assert.match(nav,/ATLAS_VISUAL_APPROVED = false/);
  assert.match(nav,/\{ id: "atlas", label: "天命图谱" \}/);
  assert.match(placeholder,/kind: "library" \| "messenger" \| "atlas"/);
  assert.match(placeholder,/美术设计中 · 暂未开放/);
  assert.match(page,/<ShellPlaceholder kind="atlas" \/>/);
  assert.match(page,/ATLAS_VISUAL_APPROVED \? <FeatureSuspense/);
});

test("clickable vase hotspot covers the illustrated vase, not just a 48px dot", () => {
  const c=read("app/club/vase/vase-experience.css");
  const scene=read("app/club/lounge-scenes.css");
  const t=read("app/club/vase/vase-experience.tsx");
  // Position and width are shared with the original approved room-scene art.
  assert.match(scene,/\.club-room-stage \.club-vase-display\s*\{[^}]*left: 63\.4%;[^}]*top: 59%;[^}]*width: 12\.8%;[^}]*aspect-ratio: 1;/s);
  assert.match(c,/\.club-room-stage > \.club-hotspot\.vase-experience-hotspot\s*\{[^}]*left: 63\.4%;[^}]*top: 59%;[^}]*width: 12\.8%;[^}]*aspect-ratio: 1;/s);
  assert.match(c,/z-index: 19/);
  assert.match(c,/pointer-events: auto/);
  assert.match(c,/transform: translate\(-50%, -100%\)/);
  assert.match(c,/min-width: 44px/);
  assert.match(t,/createPortal\(<button ref=\{hotspot\}/);
  assert.match(t,/onClick=\{shortClick\}/);
  assert.match(t,/aria-label="更换桌上花瓶陈设；长按查看往事"/);
  assert.match(t,/setPane\(value => value === "menu" \? null : "menu"\)/);
  assert.match(t,/try \{ event\.currentTarget\.setPointerCapture\(event\.pointerId\); \}/);
  assert.match(t,/onPointerCancel=/);
  assert.match(t,/onPointerDown=\{pointerDown\}/);
  assert.match(t,/onPointerUp=\{cancelPress\}/);
  assert.match(t,/onKeyDown=\{event =>/);
  assert.match(t,/onClick=\{\(\) => void select\(item\.id\)\}/);
  assert.match(t,/onClick=\{\(\) => void guess\(\)\}/);
  assert.match(t,/onClick=\{showHistory\}/);
  // Keep all persistent save and rollback semantics unchanged.
  assert.match(t,/fetch\("\/api\/committee-club"/);
  assert.match(t,/onRoomChange\(result\.room\)/);
});
