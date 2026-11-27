/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { currentMember } from "../app/member-session";
import { standaloneBoundary } from "../app/standalone-access";
import { privateSiteResponse } from "../app/private-login";
import { ministryFeatureBoundary } from "../server/ministry/guard.ts";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  SCHICKSAL_HOSTING?: string;
  SCHICKSAL_MEMBER_PASSWORDS?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

import { scheduledDocumentBatch } from "../server/operations/document-jobs";
import { scheduledSearchIndex } from "../server/search/service";
const worker = {
  async scheduled(_event: unknown, _env: Env, ctx: ExecutionContext) { ctx.waitUntil(Promise.allSettled([scheduledSearchIndex(),scheduledDocumentBatch()])); },
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const guarded = await standaloneBoundary(request, env, currentMember);
    if (guarded instanceof Response) return privateSiteResponse(guarded, env);
    request = guarded;
    const ministryDenied = await ministryFeatureBoundary(request);
    if (ministryDenied) return privateSiteResponse(ministryDenied, env);
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return privateSiteResponse(await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths), env);
    }

    // run_worker_first protects every asset with the session boundary above.
    // Built client chunks must then be served by ASSETS: the framework router
    // only recognises public files, not Vite's generated JS and CSS chunks.
    if (env.SCHICKSAL_HOSTING === "cloudflare" && env.ASSETS &&
      ["GET", "HEAD"].includes(request.method) && !url.pathname.startsWith("/api/")) {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return privateSiteResponse(asset, env);
      await asset.body?.cancel();
    }

    return privateSiteResponse(await handler.fetch(request, env, ctx), env);
  },
};

export default worker;
