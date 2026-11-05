import { entryScreen } from "./entry-screen.ts";

/** The original entry design without private app scripts or artwork. */
export function privateLoginResponse(configured: boolean, method = "GET", unavailable = false) {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const html = entryScreen(nonce, configured, unavailable);
  return new Response(method === "HEAD" ? null : html, {
    status: !configured || unavailable ? 503 : 401,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Vary": "Cookie",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`,
      "Referrer-Policy": "no-referrer",
    },
  });
}

export function privateSiteResponse(response: Response, config: { SCHICKSAL_HOSTING?: string }) {
  if (config.SCHICKSAL_HOSTING !== "cloudflare") return response;
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  const vary = headers.get("Vary");
  if (!vary?.split(",").some((value) => value.trim().toLowerCase() === "cookie")) headers.set("Vary", vary ? `${vary}, Cookie` : "Cookie");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
