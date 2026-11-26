import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("keep the approved icon-based and expandable sidebar, NEVER regress to 01/02 numbered nav", () => {
  const sidebar = read("app/shell/imperial-sidebar.tsx");
  const groups = read("app/shell/sidebar-menu-group.tsx");
  const navigation = read("app/shell/navigation.ts");
  assert.match(sidebar, /<span className="imperial-nav-icon"><NavigationIcon name=\{item\.icon\}\/>/);
  assert.match(groups, /<span className="imperial-nav-icon"><NavigationIcon name=\{item\.icon\}\/>/);
  assert.doesNotMatch(sidebar, /indexLabel|String\(index \+ 1\)\.padStart/);
  assert.doesNotMatch(groups, /indexLabel/);
  assert.match(sidebar, /<SidebarMenuGroup key=\{item\.id\}/);
  assert.match(sidebar, /<button className="imperial-phone"/);
  assert.match(navigation, /id: "collection"/);
  assert.match(navigation, /id: "honors"/);
});

test("owner-approved compact widths and lighter typography preserve icon and spacing metrics", () => {
  const legacy = read("app/globals.css");
  const layout = read("app/navigation-layout.css");
  const styles = read("app/shell/shell.css");
  const variables = read("app/entry.css");
  assert.match(layout,/--sidebar-width: 224px/);
  assert.match(layout,/--sidebar-width: 192px/);
  assert.match(layout,/--sidebar-width: 64px/);
  assert.match(legacy, /min-height: 49px/);
  assert.match(styles, /min-height:49px/);
  assert.match(styles, /grid-template-columns:25px minmax\(0,1fr\) 15px/);
  assert.match(styles, /padding:0 9px; border:0; border-left:1px solid transparent/);
  assert.match(styles, /font-family:var\(--sans\); font-size:\.74rem/);
  assert.match(styles, /font-weight:400; line-height:normal; letter-spacing:\.04em/);
  assert.match(styles, /font-size:6px; font-weight:400; line-height:normal/);
  assert.match(styles, /color:#505d70; text-transform:uppercase/);
  assert.match(styles, /color:#738095/);
  assert.match(variables, /--sans: Inter, ui-sans-serif, -apple-system/);
  assert.match(variables, /--serif: Georgia, "Times New Roman", "Noto Serif SC"/);
  assert.match(styles, /width:18px; height:18px; stroke-width:1.5/);
  assert.match(styles, /grid-template-areas:"icon copy chevron"/);
  assert.match(styles, /font-size:\.74rem; font-weight:400; line-height:normal/);
  assert.match(styles, /padding-right:30px/);
  assert.match(styles, /min-width:761px/);
});

test("collapsed logo, phone and expand button occupy separate nonoverlapping rows", () => {
  const styles = read("app/shell/shell.css");
  assert.match(styles,/grid-template-rows:30px 46px 30px/);
  assert.match(styles,/\.system\.sidebar-collapsed \.imperial-sidebar \.imperial-side-utilities \{\s*position:static; display:contents;/);
  assert.match(styles,/\.system\.sidebar-collapsed \.imperial-sidebar \.imperial-logo-trigger \{\s*grid-column:1; grid-row:2;/);
  assert.match(styles,/\.system\.sidebar-collapsed \.imperial-sidebar \.sidebar-toggle \{\s*grid-column:1; grid-row:1;/);
  assert.match(styles,/\.system\.sidebar-collapsed \.imperial-sidebar \.imperial-phone \{\s*grid-column:1; grid-row:3;/);
  assert.match(styles,/grid-template-areas:"icon"/);
  // The mobile header uses a separate grid so both controls stay accessible.
  assert.match(styles,/grid-template-columns:40px minmax\(0,1fr\) 68px/);
  assert.match(styles,/grid-template-rows:44px/);
  assert.match(styles,/position:static; display:flex; grid-column:3; grid-row:1/);
  assert.match(styles,/grid-column:1; grid-row:1; width:40px; height:40px/);
});
