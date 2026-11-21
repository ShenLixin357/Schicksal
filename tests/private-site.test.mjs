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
let assetCalls = [];
globalThis.__schicksalPrivateSiteHandler = {
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/api/member-session") return sessions[request.method](request);
    if (path === "/api/member-access") return memberAccess[request.method](request);
    protectedCalls.push(path);
    return new Response("private-content-sentinel", { headers: { "Cache-Control": "public, max-age=31536000" } });
  },
  async image() { protectedCalls.push("image-optimizer"); return new Response("private-image-sentinel"); },
};
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "cloudflare:workers") return { url: "data:text/javascript,export const env=globalThis.__schicksalPrivateSiteEnv;", shortCircuit: true };
  if (specifier === "vinext/server/app-router-entry") return { url: "data:text/javascript,export default globalThis.__schicksalPrivateSiteHandler;", shortCircuit: true };
  if (specifier === "vinext/server/image-optimization") return { url: "data:text/javascript,export const DEFAULT_DEVICE_SIZES=[640];export const DEFAULT_IMAGE_SIZES=[32];export const handleImageOptimization=(...args)=>globalThis.__schicksalPrivateSiteHandler.image(...args);", shortCircuit: true };
  if (specifier.endsWith(".css?inline") || specifier.endsWith(".png?inline")) return nextResolve(specifier, context);
  if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });
const sessions = await import("../app/api/member-session/route.ts");
const memberAccess = await import("../app/api/member-access/route.ts");
const { default: worker } = await import("../worker/index.ts");
hooks.deregister();
after(() => { delete globalThis.__schicksalPrivateSiteEnv; delete globalThis.__schicksalPrivateSiteHandler; });

function setup() {
  const sqlite = new DatabaseSync(":memory:");
  for (const name of readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort()) sqlite.exec(readFileSync(new URL(`../drizzle/${name}`, import.meta.url), "utf8"));
  env.SCHICKSAL_MEMBER_PASSWORDS = JSON.stringify(passwords);
  protectedCalls = [];
  assetCalls = [];
  env.ASSETS = { async fetch(request) {
    assetCalls.push(new URL(request.url).pathname);
    return new Response(null, { status: 404 });
  } };
  env.DB = {
    prepare(sql) {
      const statement = sqlite.prepare(sql); let parameters = [];
      return { bind(...values) { parameters = values; return this; },
        async first() { return statement.get(...parameters) ?? null; },
        async all() { return { results: statement.all(...parameters) }; },
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
async function loginAdmin() {
  const cookie = await login("amberina");
  await env.DB.prepare("UPDATE member_sessions SET account_mode='technology', minister_grant_expires_at=? WHERE citizen_id='amberina' AND expires_at > ?")
    .bind(Date.now()+60000,Date.now()).run();
  return cookie;
}
const resourceManifest = JSON.parse(readFileSync(new URL("../public/games/insaniquarium/resources/manifest.json", import.meta.url), "utf8"));
const paths = ["/", "/committee-room.png", "/mafraer-ice-bedroom-moonlit-v4.png", "/assets/page.js", "/archives/how-to-build-a-state-lesson-1.md", "/favicon.svg", "/_vinext/image?url=%2Fcommittee-room.png&w=640", "/games/fireboy-watergirl", "/games/ice-fire-import.json", "/games/1-forest-temple/index.html", "/games/1-forest-temple/js/game.js", "/games/1-forest-temple/data/forest/temple.json", "/games/1-forest-temple/assets/images/Beam.png", "/games/insaniquarium/resources/manifest.json", `/games/insaniquarium/resources/${resourceManifest.parts[0].file}`];

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
      assert.match(html, /Citizen Access · 公民通道/);
      assert.match(html, /选择身份/);
      assert.doesNotMatch(html, /private-content-sentinel|private-image-sentinel|<img|src=|mafraer-ice-bedroom|committee-room\.png/);
      assert.match(response.headers.get("X-Robots-Tag"), /noindex/);
      assert.match(response.headers.get("Cache-Control"), /no-store/);
      assert.match(response.headers.get("Content-Security-Policy"), /script-src 'nonce-/);
    }
    assert.deepEqual(protectedCalls, []);
    assert.deepEqual(assetCalls, []);
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
    assert.deepEqual(await session.json(), { citizenId: "amberina", accountMode: "citizen", authSource: "personal" });
  } finally { sqlite.close(); }
});

test("Fireboy, Aquarium and authenticated return must not revoke the same member session", async () => {
  const sqlite=setup();
  try {
    const cookie=await login("amberina");
    // Same cookie always survives this legacy hard-navigation fallback.
    // Normal Lounge play now avoids the navigation entirely.
    for (const path of [
      "/games/fireboy-watergirl?from=game-room",
      "/games/1-forest-temple/index.html",
      "/games/aquarium?from=game-room",
      "/games/insaniquarium/resources/manifest.json",
      "/?lounge=game-room",
    ]) {
      const response=await visit(path,{ cookie });
      assert.equal(response.status,200, "session lost across "+path);
      assert.equal(response.headers.get("Set-Cookie"),null,"GET must not replace login cookie");
    }
    const response=await visit("/api/member-session",{ cookie });
    assert.deepEqual(await response.json(),{ citizenId:"amberina", accountMode: "citizen", authSource: "personal" });
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM member_sessions").get().n,1);
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

test("Cloudflare pre-auth login actually renders a ministry card and submits independent technology mode", async () => {
  const sqlite=setup();
  try {
    const dedicated="TestSpecialOfficePassword2026!";
    const { hashMemberPassword }=await import("../app/member-passwords.ts");
    const hashed=await hashMemberPassword(dedicated);
    sqlite.prepare(`INSERT INTO technology_direct_credentials
      (office_id,password_hash,password_salt,updated_at,updated_by,citizen_id,term_id)
      VALUES('technology',?,?,?,?,?,?)`).run(hashed.hash,hashed.salt,Date.now(),"amberina","amberina","founding-2026");
    const html=await (await visit("/")).text();
    assert.match(html,/id="identity-technology"[^>]*data-member="technology"/);
    assert.match(html,/MINISTRY OF TECHNOLOGY · OFFICIAL ENTRY/);
    assert.match(html,/05 \/ 08 CITIZENS · 01 OFFICE/);
    assert.doesNotMatch(html,/05 \/ 08 IDENTIFIED/);
    const script=html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)?.[1];
    assert.ok(script, "visitor login must contain the real authentication script");
    let submit, clickMinistry, cookie, destination, posted;
    const makeButton=(member,label,name)=>({
      dataset:{member,label,name},classList:{add(){},remove(){}},setAttribute(){},
      addEventListener(name,listener){if(name==="click"&&member==="technology")clickMinistry=listener;}
    });
    const options=[makeButton("amberina","宇宙霸主","Amberina von Schicksal"),
      makeButton("technology","科技部部长","MINISTRY OF TECHNOLOGY")];
    const submitButton={disabled:false};
    const form={addEventListener(name,callback){if(name==="submit")submit=callback;},querySelector(){return submitButton;}};
    const inert={addEventListener(){}};
    const values={
      opening:{hidden:false},login:{hidden:true},skip:inert,replay:inert,
      "show-password":inert,entry:form,
      member:{value:"amberina"},password:{value:passwords.amberina},
      status:{textContent:""},"selected-label":{textContent:""},
      "selected-name":{textContent:""},"login-password-heading":{textContent:""}
    };
    const fakeDocument={
      querySelectorAll(selector){return selector.startsWith("[data-member]")?options:[];},
      getElementById(id){return values[id];}
    };
    const fakeFetch=async(path,options)=>{
      posted=JSON.parse(options.body);
      const response=await visit(path,{method:options.method,body:options.body,headers:options.headers});
      cookie=response.headers.get("Set-Cookie")?.split(";")[0]??cookie;
      return response;
    };
    new Function("document","fetch","window",script)(fakeDocument,fakeFetch,{
      matchMedia(){return {matches:true};},sessionStorage:{setItem(){}},
      location:{replace(path){destination=path;}}
    });
    clickMinistry();
    assert.equal(values.member.value,"technology");
    assert.equal(values["login-password-heading"].textContent,"部长专用密码");
    await submit.call(form,{preventDefault(){}});
    assert.equal(posted.citizenId,"technology");
    assert.equal(posted.accountMode,"technology");
    assert.equal(destination,undefined,"personal password must be rejected at ministry gate");
    assert.equal(submitButton.disabled,false);
    values.password.value=dedicated;
    await submit.call(form,{preventDefault(){}});
    assert.equal(destination,"/");
    assert.equal(values.password.value,"");
    assert.ok(cookie);
    assert.deepEqual(await (await visit("/api/member-session",{cookie})).json(),{
      citizenId:"amberina",accountMode:"technology",authSource:"ministry-direct"
    });
  } finally {sqlite.close();}
});

test("the actual self-contained login form obtains a session and opens the protected site", async () => {
  const sqlite = setup();
  try {
    const html = await (await visit("/")).text();
    const script = html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1];
    let submit, cookie, destination;
    const button = { disabled: false }, status = { textContent: "" }, member = { value: "AMBERINA" }, password = { value: passwords.amberina };
    const form = { addEventListener(name, listener) { assert.equal(name, "submit"); submit = listener; }, querySelector() { return button; } };
    const inert = { addEventListener() {} };
    const document = { querySelectorAll() { return []; }, getElementById(id) { return { entry: form, member, password, status, opening: {}, login: {}, skip: inert, replay: inert, "show-password": inert }[id]; } };
    const browserFetch = async (path, options) => {
      assert.equal(options.credentials, "same-origin");
      const response = await visit(path, { method: options.method, body: options.body, headers: options.headers });
      cookie = response.headers.get("Set-Cookie")?.split(";")[0];
      return response;
    };
    new Function("document", "fetch", "window", script)(document, browserFetch, { matchMedia() { return { matches: true }; }, sessionStorage: { setItem() {} }, location: { replace(path) { destination = path; } } });
    await submit.call(form, { preventDefault() {} });
    assert.equal(destination, "/");
    assert.equal(password.value, "");
    assert.equal((await visit(destination, { cookie })).status, 200);
  } finally { sqlite.close(); }
});

test("a signed-in browser receives stylesheet, script and artwork bytes from the asset binding", async () => {
  const sqlite = setup();
  const assets = new Map([
    ["/assets/page.js", { type: "text/javascript", body: "export const loaded = true;" }],
    ["/assets/site.css", { type: "text/css", body: readFileSync(new URL("../app/globals.css", import.meta.url)) }],
    ["/favicon.svg", { type: "image/svg+xml", body: readFileSync(new URL("../public/favicon.svg", import.meta.url)) }],
  ]);
  env.ASSETS = { async fetch(request) {
    const path = new URL(request.url).pathname;
    assetCalls.push(path);
    const asset = assets.get(path);
    if (!asset) return new Response(null, { status: 404 });
    if (request.headers.has("If-None-Match")) return new Response(null, { status: 304, headers: { ETag: '"asset-version"' } });
    return new Response(request.method === "HEAD" ? null : asset.body, { headers: { "Content-Type": asset.type, ETag: '"asset-version"' } });
  } };
  try {
    const cookie = await login();
    for (const [path, asset] of assets) {
      const anonymous = await visit(path);
      assert.equal(anonymous.status, 401, path);
      const response = await visit(path, { cookie });
      assert.equal(response.status, 200, path);
      assert.equal(response.headers.get("Content-Type"), asset.type, path);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from(asset.body), path);
      assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    }
    const head = await visit("/assets/site.css", { cookie, method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
    const unchanged = await visit("/assets/site.css", { cookie, headers: { "If-None-Match": '"asset-version"' } });
    assert.equal(unchanged.status, 304);
    assert.equal(await unchanged.text(), "");
    assert.deepEqual(protectedCalls, []);
    assert.deepEqual(await (await visit("/api/member-session", { cookie })).json(), { citizenId: "amberina", accountMode: "citizen", authSource: "personal" });
    assert.ok(!assetCalls.includes("/api/member-session"));
    assert.equal(await (await visit("/", { cookie })).text(), "private-content-sentinel");
  } finally { sqlite.close(); }
});

test("the owner can enable another member with a short Unicode password without exposing stored credentials", async () => {
  const sqlite = setup();
  try {
    env.SCHICKSAL_MEMBER_PASSWORDS = JSON.stringify({ amberina: passwords.amberina });
    const owner = await loginAdmin();
    const initial = await (await visit("/api/member-access", { cookie: owner })).json();
    assert.equal(initial.members.find((member) => member.id === "zxy").configured, false);
    const short = "短✓";
    const saved = await visit("/api/member-access", { method: "POST", cookie: owner, body: { citizenId: "zxy", password: short } });
    assert.equal(saved.status, 200);
    assert.deepEqual(await saved.json(), { ok: true, requiresLogin: false });
    const stored = sqlite.prepare("SELECT * FROM member_credentials WHERE citizen_id = 'zxy'").get();
    assert.match(stored.password_hash, /^[a-f0-9]{64}$/);
    assert.match(stored.password_salt, /^[a-f0-9]{32}$/);
    assert.ok(!JSON.stringify(stored).includes(short));
    const after = await (await visit("/api/member-access", { cookie: owner })).json();
    assert.equal(after.members.find((member) => member.id === "zxy").configured, true);
    assert.doesNotMatch(JSON.stringify(after), /password_hash|password_salt/);
    const entry = await visit("/api/member-session", { method: "POST", body: { citizenId: "zxy", password: short } });
    assert.equal(entry.status, 200);
    const member = entry.headers.get("Set-Cookie").split(";")[0];
    assert.deepEqual(await (await visit("/api/member-session", { cookie: member })).json(), { citizenId: "zxy", accountMode: "citizen", authSource: "personal" });
    assert.equal((await visit("/", { cookie: member })).status, 200);
    assert.equal((await visit("/api/member-access", { cookie: member })).status, 403);
    assert.equal((await visit("/api/member-access", { method: "POST", cookie: member, body: { citizenId: "amberina", password: "x" } })).status, 403);
  } finally { sqlite.close(); }
});

test("password changes revoke existing sessions and override old deployment secrets", async () => {
  const sqlite = setup();
  try {
    const owner = await loginAdmin();
    const oldMember = await login("zxy");
    assert.equal((await visit("/api/member-access", { method: "POST", cookie: owner, body: { citizenId: "zxy", password: "1" } })).status, 200);
    assert.equal((await visit("/", { cookie: oldMember })).status, 401);
    assert.equal((await visit("/api/member-session", { method: "POST", body: { citizenId: "zxy", password: passwords.zxy } })).status, 401);
    assert.equal((await visit("/api/member-session", { method: "POST", body: { citizenId: "zxy", password: "1" } })).status, 200);
    const changedOwner = await visit("/api/member-access", { method: "POST", cookie: owner, body: { citizenId: "amberina", password: "自定" } });
    assert.equal(changedOwner.status, 200);
    assert.deepEqual(await changedOwner.json(), { ok: true, requiresLogin: true });
    assert.match(changedOwner.headers.get("Set-Cookie"), /Max-Age=0/);
    assert.equal((await visit("/", { cookie: owner })).status, 401);
    assert.equal((await visit("/api/member-session", { method: "POST", body: { citizenId: "amberina", password: "自定" } })).status, 200);
  } finally { sqlite.close(); }
});

test("member password administration rejects forged identities, foreign origins and invalid input", async () => {
  const sqlite = setup();
  try {
    assert.equal((await visit("/api/member-access", { method: "POST", headers: { "x-schicksal-server-member": "amberina" }, body: { citizenId: "zxy", password: "x" } })).status, 401);
    const owner = await loginAdmin();
    assert.equal((await visit("/api/member-access", { method: "POST", cookie: owner, headers: { origin: "https://unrelated.invalid" }, body: { citizenId: "zxy", password: "x" } })).status, 403);
    for (const body of ["null", "[]", "{", { citizenId: "sealed-6", password: "x" }, { citizenId: "unknown", password: "x" }, { citizenId: "zxy", password: "" }, { citizenId: "zxy", password: "x".repeat(1025) }]) {
      assert.equal((await visit("/api/member-access", { method: "POST", cookie: owner, body })).status, 400);
    }
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM member_credentials").get().count, 0);
  } finally { sqlite.close(); }
});



test("a failed server-side session revocation cannot report success or redirect a still-authenticated account", async () => {
  const sqlite = setup();
  try {
    const cookie = await login("amberina");
    const original = env.DB.prepare;
    env.DB.prepare = function (sql) {
      if (/^DELETE FROM member_sessions WHERE token_hash/.test(sql)) throw Error("isolated simulated D1 outage");
      return original.call(this, sql);
    };
    const result = await visit("/api/member-session", {method:"DELETE", cookie});
    assert.equal(result.status, 503);
    assert.equal(result.headers.get("Set-Cookie"), null);
    env.DB.prepare = original;
    assert.equal((await visit("/", {cookie})).status, 200, "server token remains valid until revocation succeeds");
  } finally { sqlite.close(); }
});
