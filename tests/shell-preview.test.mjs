import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("six main destinations plus self-profile use approved pictograms and preserve independent parliament", () => {
  const nav = read("app/shell/navigation.ts");
  const rows = [...nav.matchAll(/\{ id: "([^"]+)", label: "([^"]+)", en: "([^"]+)", icon: "([^"]+)" \}/g)]
    .map(([, id, label, en, icon]) => [id, label, en, icon]);
  assert.deepEqual(rows, [
    ["home", "首页", "Home", "house"],
    ["briefing", "帝国简报台", "Briefing", "newspaper"],
    ["parliament", "帝国政务", "Government", "landmark"],
    ["collection", "帝国馆藏", "Collection", "library"],
    ["calendar", "国家节日", "Calendar", "celebration"],
    ["honors", "积分", "Honors", "gift"],
    ["profile", "个人页", "Profile", "profile"],
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
  assert.match(sidebar, /COLLECTION_NAV/);
  assert.match(sidebar, /POINTS_NAV/);
  const group = read("app/shell/sidebar-menu-group.tsx");
  assert.match(group, /items\.map/);
  assert.match(group, /<SidebarNavCopy label=\{item.label\} en=\{item.en\}/);
  assert.match(sidebar, /<SidebarNavCopy label=\{item.label\} en=\{item.en\}/);
  assert.match(sidebar, /disabled=\{!canEnterLounge && !loungeOpen\}/);
  assert.match(sidebar, /collapsed/);
  assert.match(sidebar, /onLogo/);
  assert.doesNotMatch(sidebar, /club-portal/);
  assert.doesNotMatch(presence, /long.?press|onPointerDown|onOpenIndex/);
  assert.match(page, /onLogo=\{\(\) => \{ if \(clubOpen\) exitLounge\(\)/);
  assert.doesNotMatch(page, /onLogo=[^\n]*else setSection\("home"\)/);
  assert.match(page, /CLUB_MEMBER_IDS = new Set\(\["amberina", "zxy", "truth"\]\)/);
  assert.match(page, /if \(target === "profile"\) setViewedCitizenId\(citizen.id\)/);
  const styles = read("app/shell/shell.css");
  assert.match(styles, /font:500 \.74rem\/1\.4 var\(--sans\)/);
  assert.match(styles, /color:#738095/);
  assert.match(styles, /font:400 6px\/1\.3 var\(--sans\)/);
  assert.match(styles, /color:#9daab9/);
  assert.match(styles, /\.imperial-nav-copy > small \{ display:none; \}/);
  assert.doesNotMatch(styles, /color:#586777/);
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

test("archive conversion and placeholder styling live outside the page coordinator", () => {
  const page = read("app/page.tsx");
  assert.match(page, /import \{ ArchivesSection \} from "\.\/archives\/archive-section";/);
  const archiveSection = read("app/archives/archive-section.tsx");
  assert.match(archiveSection, /import \{ archiveMarkdownToHtml \} from "\.\/archive-markdown";/);
  assert.doesNotMatch(page, /function archiveInlineMarkdown/);
  const archive = read("app/archives/archive-markdown.ts");
  assert.match(archive, /export function archiveMarkdownToHtml/);
  assert.match(archive, /replaceAll\("<", "&lt;"\)/);
  const layout = read("app/layout.tsx");
  assert.match(layout, /import "\.\/shell\/placeholder\.css";/);
  assert.match(read("app/shell/placeholder.css"), /\.shell-placeholder h1/);
});
