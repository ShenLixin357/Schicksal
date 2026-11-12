import { readFile } from "node:fs/promises";
import { loadHostedAssets } from "../../public/games/insaniquarium/hosted-assets.mjs";

try {
  const baseURL = new URL("../../public/games/insaniquarium/resources/", import.meta.url);
  const files = await loadHostedAssets({ baseURL, fetcher: async url => new Response(await readFile(url), {
    headers: { "content-type": url.pathname.endsWith(".json") ? "application/json" : "application/octet-stream" },
  }) });
  console.log(`[insaniquarium] ${files.length} hosted game resources verified`);
} catch (error) {
  console.error(`[insaniquarium] ${error.message}`);
  process.exitCode = 1;
}
