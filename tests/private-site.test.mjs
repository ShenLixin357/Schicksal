import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { after, test } from "node:test";

const ids = ["amberina", "zxy", "truth", "kaito", "harry"];
const passwords = Object.fromEntries(ids.map((id) => [id, crypto.randomUUID()]));
const env = { SCHICKSAL_HOSTING: "cloudflare", SCHICKSAL_MEMBER_PASSWORDS: JSON.stringify(passwords) };
globalThis.__schicksalPrivateSiteEnv = env;
let protectedCalls = [];
globalThis.__schicksalPrivateSiteHandler = {
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/api/member-session") return sessions[request.method](request);
    protectedCalls.push(path);
    return new Response("private-content-sentinel", { headers: { "Cache-Control": "public, max-age=31536000" } });
  },
  async image() { protectedCalls.push("image-optimizer"); return new Response("private-image-sentinel"); },
};
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "cloudflare:workers") return { url: "data:text/javascript,export const env=globalThis.__schicksalPrivateSiteEnv;", shortCircuit: true };
  if (specifier === "vinext/server/app-router-entry") return { url: "data:text/javascript,export default globalThis.__schicksalPrivateSiteHandler;", shortCircuit: true };
  if (specifier === "vinext/server/image-optimization") return { url: "data:text/javascript,export const DEFAULT_DEVICE_SIZES=[640];export const DEFAULT_IMAGE_SIZES=[32];export const handleImageOptimization=(...args)=>globalThis.__schicksalPrivateSiteHandler.image(...args);", shortCircuit: true };
  if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });
const sessions = await import("../app/api/member-session/route.ts");
const { default: worker } = await import("../worker/index.ts");
hooks.deregister();
after(() => { delete globalThis.__schicksalPrivateSiteEnv; delete globalThis.__schicksalPrivateSiteHandler; });

function setup() {
  const sqlite = new DatabaseSync(":memory:");
  for (const name of readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort()) sqlite.exec(readFileSync(new URL(`../drizzle/${name}`, import.meta.url), "utf8"));
  env.SCHICKSAL_MEMBER_PASSWORDS = JSON.stringify(passwords);
  protectedCalls = [];
  env.DB = {
    prepare(sql) {
      const statement = sqlite.prepare(sql); let parameters = [];
      return { bind(...values) { parameters = values; return this; },
        async first() { return statement.get(...parameters) ?? null; },
        async run() { return statement.run(...parameters); },
      };
    },
    async batch(statements) { return Promise.all(statements.map((statement) => statement.run())); },
  };
  return sqlite;
}
function request(path, { method = "GET", cookie, headers = {}, body } = {}) {
  return new Request(`https://private.schicksal.invalid${path}`, { method, headers: { origin: "https://private.schicksal.invalid", ...(cookie ? { cookie } : {}), ...headers }, ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }) });
}
const visit = (path, options) => worker.fetch(request(path, options), env, {});
async function login(id = "amberina") {
  const response = await visit("/api/member-session", { method: "POST", body: { citizenId: id, password: passwords[id] } });
  assert.equal(response.status, 200);
  return response.headers.get("Set-Cookie").split(";")[0];
}
const paths = ["/", "/committee-room.png", "/mafraer-ice-bedroom-moonlit-v4.png", "/assets/page.js", "/archives/how-to-build-a-state-lesson-1.md", "/favicon.svg", "/_vinext/image?url=%2Fcommittee-room.png&w=640"];

test("private deployment invokes authentication before every static asset", () => {
  const settings = JSON.parse(readFileSync(new URL("../wrangler.json", import.meta.url), "utf8"));
  assert.equal(settings.assets.run_worker_first, true);
  assert.equal(settings.preview_urls, false);
});

test("anonymous visitors cannot reach pages, artwork, scripts, archives or image optimisation", async () => {
  const sqlite = setup();
  try {
    for (const path of paths) {
      const response = await visit(path);
      assert.equal(response.status, 401, path);
      const html = await response.text();
      assert.match(html, /成员账号/);
      assert.doesNotMatch(html, /private-content-sentinel|private-image-sentinel|<img|src=|宇宙霸主|amberina/);
      assert.match(response.headers.get("X-Robots-Tag"), /noindex/);
      assert.match(response.headers.get("Cache-Control"), /no-store/);
      assert.match(response.headers.get("Content-Security-Policy"), /script-src 'nonce-/);
    }
    assert.deepEqual(protectedCalls, []);
  } finally { sqlite.close(); }
});

test("a guessed cookie, forged member header or ChatGPT header cannot unlock private resources", async () => {
  const sqlite = setup();
  try {
    for (const path of ["/", "/committee-room.png", "/api/photos"]) {
      const response = await visit(path, { cookie: `schicksal_member=${"a".repeat(64)}`, headers: { "x-schicksal-server-member": "amberina", "oai-authenticated-user-email": "owner@example.invalid" } });
      assert.equal(response.status, 401);
    }
    assert.deepEqual(protectedCalls, []);
  } finally { sqlite.close(); }
});

test("real member login unlocks resources while all returned content remains private and unindexed", async () => {
  const sqlite = setup();
  try {
    const cookie = await login();
    for (const path of paths) {
      const response = await visit(path, { cookie });
      assert.equal(response.status, 200, path);
      assert.match(await response.text(), /private-(content|image)-sentinel/);
      assert.equal(response.headers.get("Cache-Control"), "private, no-store");
      assert.match(response.headers.get("Vary"), /Cookie/);
    }
    const session = await visit("/api/member-session", { cookie });
    assert.deepEqual(await session.json(), { citizenId: "amberina" });
  } finally { sqlite.close(); }
});

test("logging out or expiring a real session immediately locks the whole site again", async () => {
  const sqlite = setup();
  try {
    const cookie = await login();
    assert.equal((await visit("/api/member-session", { method: "DELETE", cookie })).status, 200);
    assert.equal((await visit("/", { cookie })).status, 401);
    const expired = await login();
    sqlite.exec("UPDATE member_sessions SET expires_at=0");
    assert.equal((await visit("/committee-room.png", { cookie: expired })).status, 401);
    assert.deepEqual(protectedCalls, []);
  } finally { sqlite.close(); }
});

test("only configured invitees can log in, and an unconfigured site stays closed", async () => {
  const sqlite = setup();
  try {
    env.SCHICKSAL_MEMBER_PASSWORDS = JSON.stringify({ amberina: passwords.amberina });
    assert.equal((await visit("/api/member-session", { method: "POST", body: { citizenId: "zxy", password: passwords.zxy } })).status, 401);
    const cookie = await login();
    assert.equal((await visit("/", { cookie })).status, 200);
    delete env.SCHICKSAL_MEMBER_PASSWORDS;
    assert.equal((await visit("/")).status, 503);
    assert.equal((await visit("/api/member-session", { method: "POST", body: { citizenId: "amberina", password: passwords.amberina } })).status, 503);
  } finally { sqlite.close(); }
});

test("database failures fail closed and HEAD requests never return protected bytes", async () => {
  const sqlite = setup();
  try {
    const head = await visit("/committee-room.png", { method: "HEAD" });
    assert.equal(head.status, 401);
    assert.equal(await head.text(), "");
    env.DB = { prepare() { throw new Error("internal-database-detail"); } };
    const response = await visit("/", { cookie: `schicksal_member=${"a".repeat(64)}` });
    assert.equal(response.status, 503);
    assert.doesNotMatch(await response.text(), /internal-database-detail|private-content-sentinel/);
    assert.deepEqual(protectedCalls, []);
  } finally { sqlite.close(); }
});

test("the actual self-contained login form obtains a session and opens the protected site", async () => {
  const sqlite = setup();
  try {
    const html = await (await visit("/")).text();
    const script = html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1];
    let submit, cookie, destination;
    const button = { disabled: false }, status = { textContent: "" }, member = { value: "AMBERINA" }, password = { value: passwords.amberina };
    const form = { addEventListener(name, listener) { assert.equal(name, "submit"); submit = listener; }, querySelector() { return button; } };
    const document = { getElementById(id) { return { entry: form, member, password, status }[id]; } };
    const browserFetch = async (path, options) => {
      assert.equal(options.credentials, "same-origin");
      const response = await visit(path, { method: options.method, body: options.body, headers: options.headers });
      cookie = response.headers.get("Set-Cookie")?.split(";")[0];
      return response;
    };
    new Function("document", "fetch", "window", script)(document, browserFetch, { location: { replace(path) { destination = path; } } });
    await submit.call(form, { preventDefault() {} });
    assert.equal(destination, "/");
    assert.equal(password.value, "");
    assert.equal((await visit(destination, { cookie })).status, 200);
  } finally { sqlite.close(); }
});
