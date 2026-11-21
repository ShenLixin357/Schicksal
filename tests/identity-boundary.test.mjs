import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { after, test } from "node:test";
import { ApiError, readJson } from "../server/http.ts";
const env = { SCHICKSAL_HOSTING: "cloudflare" };
globalThis.__boundaryEnv = env;
const hooks = registerHooks({ resolve(specifier, context, next) { if (specifier === "cloudflare:workers")
        return { url: "data:text/javascript,export const env=globalThis.__boundaryEnv", shortCircuit: true }; if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier))
        return next(existsSync(new URL(`${specifier}.ts`, context.parentURL)) ? `${specifier}.ts` : `${specifier}/index.ts`, context); return next(specifier, context); } });
const club = await import("../app/api/committee-club/route.ts"), parliament = await import("../app/api/parliament/route.ts"), photos = await import("../app/api/photos/route.ts"), image = await import("../app/api/photos/image/route.ts");
hooks.deregister();
after(() => { delete globalThis.__boundaryEnv; });
function setup() {
    const db = new DatabaseSync(":memory:");
    for (const name of readdirSync(new URL("../drizzle", import.meta.url)).filter(n => n.endsWith(".sql")).sort())
        db.exec(readFileSync(new URL(`../drizzle/${name}`, import.meta.url), "utf8"));
    env.DB = { prepare(sql) { const statement = db.prepare(sql); let args = []; return { bind(...v) { args = v; return this; }, async first() { return statement.get(...args) ?? null; }, async all() { return { results: statement.all(...args) }; }, async raw() { const rows = db.prepare(sql); rows.setReturnArrays(true); return rows.all(...args); }, async run() { return { results: [], meta: { changes: Number(statement.run(...args).changes) } }; } }; }, async batch(statements) { db.exec("BEGIN"); try {
            const r = [];
            for (const s of statements)
                r.push(await s.run());
            db.exec("COMMIT");
            return r;
        }
        catch (e) {
            db.exec("ROLLBACK");
            throw e;
        } } };
    const files = new Map();
    env.BUCKET = { async put(key, bytes, metadata) { files.set(key, { bytes, metadata }); }, async get(key) { const v = files.get(key); return v ? { body: v.bytes, httpMetadata: v.metadata.httpMetadata } : null; }, async delete(key) { files.delete(key); } };
    return db;
}
function session(db, member) { const token = randomBytes(32).toString("hex"); db.prepare("INSERT INTO member_sessions(token_hash,citizen_id,expires_at) VALUES(?,?,?)").run(createHash("sha256").update(token).digest("hex"), member, Date.now() + 60000); return `schicksal_member=${token}`; }
function request(path, { method = "GET", cookie, body, origin = "https://test.invalid" } = {}) { return new Request(`https://test.invalid${path}`, { method, headers: { origin, "x-schicksal-server-member": "amberina", "x-schicksal-citizen": "amberina", ...(cookie && { cookie }) }, ...(body && { body: JSON.stringify(body) }) }); }
test("direct APIs reject forged header/query/body identities without a session", async () => {
    const db = setup();
    try {
        for (const [handler, path, method] of [[club.GET, "/api/committee-club?citizenId=amberina", "GET"], [club.POST, "/api/committee-club", "POST"], [parliament.GET, "/api/parliament?citizenId=amberina", "GET"], [parliament.POST, "/api/parliament", "POST"], [photos.GET, "/api/photos", "GET"], [photos.POST, "/api/photos", "POST"], [photos.DELETE, "/api/photos?id=x", "DELETE"], [image.GET, "/api/photos/image?id=x", "GET"]])
            assert.equal((await handler(request(path, { method, body: method === "POST" ? { citizenId: "amberina", uploaderCitizenId: "amberina" } : undefined }))).status, 401, `${method} ${path}`);
    }
    finally {
        db.close();
    }
});
test("real session overrides creator claims and retains committee restrictions", async () => {
    const db = setup();
    try {
        const cookie = session(db, "truth"), sent = await club.POST(request("/api/committee-club", { method: "POST", cookie, body: { action: "message", citizenId: "amberina", body: "真实身份" } }));
        assert.equal(sent.status, 201);
        assert.equal((await sent.json()).message.citizenId, "truth");
        const board = await parliament.GET(request("/api/parliament?citizenId=amberina", { cookie }));
        assert.equal((await board.json()).session.citizenId, "truth");
        assert.equal((await club.GET(request("/api/committee-club", { cookie: session(db, "kaito") }))).status, 403);
        db.prepare("UPDATE member_sessions SET expires_at=0").run();
        assert.equal((await photos.GET(request("/api/photos", { cookie }))).status, 401);
    }
    finally {
        db.close();
    }
});
test("photo permissions: any member may view, only uploader/owner may edit and move to trash; owner restores", async () => {
    const db = setup();
    try {
        const kaito = session(db, "kaito"), truth = session(db, "truth"), owner = session(db, "amberina");
        db.prepare("INSERT INTO archive_photos(id,object_key,original_name,title,subjects_json,subject_key,uploader_citizen_id,mime_type,size_bytes) VALUES('photo','family-archive/p.png','p.png','test','[\\\"empire\\\"]','empire','truth','image/png',1)").run();
        await env.BUCKET.put("family-archive/p.png", new Uint8Array([1]), "image/png", "p.png");
        assert.equal((await photos.DELETE(request("/api/photos?id=photo", { method: "DELETE", cookie: kaito, origin: "https://elsewhere.invalid" }))).status, 403);
        assert.equal((await photos.DELETE(request("/api/photos?id=photo", { method: "DELETE", cookie: kaito }))).status, 403);
        assert.equal((await photos.PATCH(request("/api/photos?id=photo", { method: "PATCH", cookie: kaito, body: { title: "偷改" } }))).status, 403);
        assert.equal((await photos.GET(request("/api/photos", { cookie: kaito }))).status, 200);
        assert.equal((await photos.GET(request("/api/photos?trash=1", { cookie: kaito }))).status, 403);
        const edited = await photos.PATCH(request("/api/photos?id=photo", { method: "PATCH", cookie: truth, body: { title: "共同记忆", subjects: ["truth"] } }));
        assert.equal(edited.status, 200);
        assert.equal((await edited.json()).photo.uploaderCitizenId, "truth");
        assert.equal(db.prepare("SELECT title FROM archive_photos WHERE id='photo'").get().title, "共同记忆");
        assert.equal((await photos.DELETE(request("/api/photos?id=photo", { method: "DELETE", cookie: truth }))).status, 200);
        assert.equal(db.prepare("SELECT COUNT(*) AS n FROM archive_photos").get().n, 1, "trash preserves metadata and storage");
        assert.ok(db.prepare("SELECT deleted_at FROM archive_photos WHERE id='photo'").get().deleted_at);
        assert.equal((await photos.GET(request("/api/photos", { cookie: kaito })).json()).photos?.length, 0);
        assert.equal((await image.GET(request("/api/photos/image?id=photo", { cookie: truth }))).status, 404);
        assert.equal((await photos.PUT(request("/api/photos?id=photo", { method: "PUT", cookie: truth }))).status, 403);
        assert.equal((await photos.GET(request("/api/photos?trash=1", { cookie: owner })).json()).photos.length, 1);
        assert.equal((await photos.PUT(request("/api/photos?id=photo", { method: "PUT", cookie: owner }))).status, 200);
        assert.equal(db.prepare("SELECT deleted_at FROM archive_photos WHERE id='photo'").get().deleted_at, null);
        assert.equal((await photos.GET(request("/api/photos", { cookie: kaito })).json()).photos.length, 1);
        assert.equal((await photos.DELETE(request("/api/photos?id=photo", { method: "DELETE", cookie: owner }))).status, 200);
    } finally { db.close(); }
});
test("JSON reader bounds actual streamed bytes and rejects malformed roots", async () => {
    const stream = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"x":"')); c.enqueue(new Uint8Array(100)); c.close(); } }), r = new Request("https://test.invalid", { method: "POST", body: stream, duplex: "half", headers: { "content-length": "1" } });
    await assert.rejects(readJson(r, 20), e => e instanceof ApiError && e.status === 413);
    for (const body of ["not json", "null", "[]"])
        await assert.rejects(readJson(new Request("https://test.invalid", { method: "POST", body }), 100), e => e.status === 400);
    const value = { body: "天命 🎼" };
    assert.deepEqual(await readJson(new Request("https://test.invalid", { method: "POST", body: JSON.stringify(value) }), 100), value);
});
