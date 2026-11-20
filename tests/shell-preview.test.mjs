import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("six main destinations plus self-profile use approved pictograms and preserve independent parliament", () => {
  const nav = read("app/shell/navigation.ts");
  const rows = [...nav.matchAll(/\{ id: "([^"]+)", label: "([^"]+)", icon: "([^"]+)" \}/g)]
    .map(([, id, label, icon]) => [id, label, icon]);
  assert.deepEqual(rows, [
    ["home", "首页", "house"],
    ["briefing", "帝国简报台", "newspaper"],
    ["parliament", "帝国政务", "landmark"],
    ["collection", "帝国馆藏", "library"],
    ["calendar", "国家节日", "celebration"],
    ["honors", "积分", "gift"],
    ["profile", "个人页", "profile"],
  ]);
});
test("collection expands into four separate destinations; library and messenger are minimal placeholders", () => {
  const nav = read("app/shell/navigation.ts");
  for (const id of ["library", "atlas", "photos", "archives"]) assert.match(nav, new RegExp('id: "' + id + '"'));
  const placeholder = read("app/shell/placeholder.tsx");
  assert.match(placeholder, /魔法图书馆/);
  assert.match(placeholder, /帝国通讯/);
  assert.match(placeholder, /即将开放/);
  assert.doesNotMatch(placeholder, /fetch\(|iframe|<Image|onClick=/);
  const page = read("app/page.tsx");
  assert.match(page, /case "messenger": content = <ShellPlaceholder/);
  assert.match(page, /case "library": content = <ShellPlaceholder/);
  assert.doesNotMatch(page, /<Messenger selfId=/);
});
test("sidebar icons, single-click members, phone and reversible logo are present", () => {
  const sidebar = read("app/shell/imperial-sidebar.tsx");
  const presence = read("app/briefing/sidebar-presence.tsx");
  const page = read("app/page.tsx");
  assert.match(sidebar, /imperial-phone/);
  assert.match(sidebar, /COLLECTION_NAV\.map/);
  assert.match(sidebar, /POINTS_NAV\.map/);
  assert.match(sidebar, /disabled=\{!canEnterLounge && !loungeOpen\}/);
  assert.match(sidebar, /collapsed/);
  assert.match(sidebar, /onLogo/);
  assert.doesNotMatch(sidebar, /club-portal/);
  assert.doesNotMatch(presence, /long.?press|onPointerDown|onOpenIndex/);
  assert.match(page, /onLogo=\{\(\) => \{ if \(clubOpen\) exitLounge\(\)/);
  assert.doesNotMatch(page, /onLogo=[^\n]*else setSection\("home"\)/);
  assert.match(page, /CLUB_MEMBER_IDS = new Set\(\["amberina", "zxy", "truth"\]\)/);
  assert.match(page, /if \(target === "profile"\) setViewedCitizenId\(citizen.id\)/);
  assert.match(read("app/shell/shell.css"), /font:500 \.74rem\/1\.4 var\(--sans\)/);
  assert.doesNotMatch(page, /SYSTEM ONLINE|IMPERIAL CORE \/|FIRST EMPIRE · 2026/);
});
test("4s entrance veil swaps scenes in darkness and supports one-click skip", () => {
  const transition = read("app/transitions/lounge-passage.tsx");
  const page = read("app/page.tsx");
  assert.match(transition, /ENTER_DURATION = 4000/);
  assert.match(transition, /fBm/);
  assert.match(transition, /SWAP_FRACTION/);
  assert.match(transition, /onClick=\{\(\) => endRef\.current\(\)\}/);
  assert.match(transition, /prefers-reduced-motion/);
  assert.match(page, /<LoungePassage direction=\{portal\}/);
  assert.match(page, /case "honors": content = <HonorsSection/);
  assert.match(page, /case "market": content = <MarketSection/);
});
