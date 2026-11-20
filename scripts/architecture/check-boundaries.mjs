#!/usr/bin/env node
/**
 * Schicksal 2.0 architecture boundaries. Node stdlib only, runs in npm test.
 * Keep selectors and business behavior unchanged while breaking page.tsx apart.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, relative, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const appRoot = join(root, "app");
const read = path => readFileSync(join(root, path), "utf8");
const featureRoots = ["home", "photos", "archives", "shell", "emblem", "parliament", "club"];
const violations = [];
const fail = message => { violations.push(message); };

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
const moduleFiles = featureRoots.flatMap(feature => walk(join(appRoot, feature)))
  .filter(path => /\.(ts|tsx)$/.test(path));

for (const file of moduleFiles) {
  const source = readFileSync(file, "utf8");
  const relativeFile = relative(root, file).replaceAll("\\", "/");
  const imports = [...source.matchAll(/(?:import|export)\s+(?:[^;]*?\s+from\s+)?["']([^"']+)["']/g)]
    .map(match => match[1]);
  for (const spec of imports) {
    if (!spec.startsWith(".")) continue;
    const target = resolve(dirname(file), spec);
    const relativeTarget = relative(appRoot, target).replaceAll("\\", "/");
    if (relativeTarget === "page" || relativeTarget === "page.tsx")
      fail(`${relativeFile}: a feature must never import the page coordinator`);
    if (relativeTarget.startsWith("api/"))
      fail(`${relativeFile}: feature UI must use fetch/API, not import a route handler`);
    // New small feature modules should not import large art/game/parliament trees.
    if (["home", "photos", "archives", "shell"].includes(relative(appRoot, file).split(/[\\/]/)[0])
      && /^(club|parliament|speaker-management|member-session)(\/|$)/.test(relativeTarget))
      fail(`${relativeFile}: forbidden direct coupling to ${relativeTarget}`);
  }
}

const page = read("app/page.tsx");
const css = read("app/globals.css");
for (const [source, name] of [
  [page, "page.tsx"], [css, "globals.css"],
]) {
  if (source.includes("SCHICKSAL_MEMBER_PASSWORDS") || source.includes("SCHICKSAL_PREVIEW_PASSWORDS"))
    fail(`${name} must not embed secrets`);
}
const mainLineBudget = 650;
const globalLineBudget = 1200;
if (page.split("\n").length > mainLineBudget)
  fail(`page.tsx has regrown above ${mainLineBudget} lines; extract a feature instead`);
if (css.split("\n").length > globalLineBudget)
  fail(`globals.css has regrown above ${globalLineBudget} lines; move styles into their owner`);

for (const spec of ['@import "./home/home.css";', '@import "./photos/photo-archive.css";'])
  if (!css.includes(spec)) fail(`globals.css missing module style: ${spec}`);
if (!read("app/layout.tsx").includes('import "./club/lounge-scenes.css";'))
  fail("layout.tsx must load migrated private-scene styles after globals.css");
for (const legacy of ["function PersistentParliamentSection(", "function CommitteeLounge(", "function ClubMysticMark("])
  if (page.includes(legacy)) fail(`page.tsx still owns a heavy feature: ${legacy}`);
for (const feature of ["./parliament/parliament-section", "./club/committee-lounge"])
  if (!page.includes(`lazy(() => import("${feature}")`))
    fail(`page.tsx missing a lazy-loaded feature: ${feature}`);

for (const [file, expected] of [
  ["app/home/home-section.tsx", "export function HomeSection"],
  ["app/photos/photo-archive.tsx", "export function PhotoArchiveSection"],
  ["app/archives/archive-section.tsx", "export function ArchivesSection"],
  ["app/emblem/blade-spec.ts", "export const EMBLEM_BLADES"],
  ["app/parliament/parliament-types.ts", "export type ParliamentBoard"],
  ["app/parliament/parliament-section.tsx", "export function PersistentParliamentSection"],
  ["app/club/lounge-access.ts", "export const CLUB_MEMBER_IDS"],
  ["app/club/committee-lounge.tsx", "export function CommitteeLounge"],
]) {
  if (!read(file).includes(expected)) fail(`${file} missing owned export`);
}

if (violations.length) {
  for (const item of violations) process.stderr.write("ARCHITECTURE ERROR: " + item + "\n");
  process.exitCode = 1;
} else {
  process.stdout.write(`Architecture guard passed: ${moduleFiles.length} feature modules; page ${page.split("\n").length} lines; global CSS ${css.split("\n").length} lines.\n`);
}
