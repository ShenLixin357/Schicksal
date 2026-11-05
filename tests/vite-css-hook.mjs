import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";

// Node tests use the same inline CSS string that Vite supplies in production.
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.endsWith(".css?inline")) {
    const css = readFileSync(new URL(specifier.split("?")[0], context.parentURL), "utf8");
    return { url: `data:text/javascript,export default ${encodeURIComponent(JSON.stringify(css))}`, shortCircuit: true };
  }
  return nextResolve(specifier, context);
} });
