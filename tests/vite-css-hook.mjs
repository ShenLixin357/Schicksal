import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";

// Node tests use the same inline CSS string that Vite supplies in production.
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.endsWith(".css?inline")) {
    const css = readFileSync(new URL(specifier.split("?")[0], context.parentURL), "utf8");
    return { url: `data:text/javascript,export default ${encodeURIComponent(JSON.stringify(css))}`, shortCircuit: true };
  }
  if (specifier.endsWith(".png?inline") || specifier.endsWith(".png?inline.ts")) {
    // Match Vite's asset-inline import in the Node privacy tests.
    const assetSpecifier = specifier.replace(/\.png\?inline(?:\.ts)?$/, ".png");
    const base64 = readFileSync(new URL(assetSpecifier, context.parentURL)).toString("base64");
    const url = "data:image/png;base64," + base64;
    return { url: `data:text/javascript,export default ${encodeURIComponent(JSON.stringify(url))}`, shortCircuit: true };
  }
  return nextResolve(specifier, context);
} });
