// Deployment safety guard only. The real cumulative site is deployed from
// scripts/cloudflare/deploy-ui-preview-builds.mjs with isolated D1 bindings.
// A default wrangler deploy from this directory cannot touch production.
export default {
  async fetch() {
    return new Response("Schicksal preview: build safety fallback. Check the configured deploy command.", {
      status:503,
      headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"},
    });
  },
};
