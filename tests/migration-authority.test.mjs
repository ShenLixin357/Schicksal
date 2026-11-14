import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { registerHooks } from "node:module";
import { spawnSync } from "node:child_process";
import { after, test } from "node:test";
import { checkHistory, checkMigrations, migrationFiles, digest } from "../scripts/migrations.mjs";
const root = new URL("../", import.meta.url).pathname, env = {};
globalThis.__schemaCheckEnv = env;
const hooks = registerHooks({ resolve(specifier, context, next) { if (specifier === "cloudflare:workers")
        return { url: "data:text/javascript,export const env=globalThis.__schemaCheckEnv", shortCircuit: true }; return next(specifier, context); } });
const { ensureParliamentSchema } = await import("../db/parliament-schema.ts"), { ensurePhotoSchema } = await import("../db/photo-schema.ts");
hooks.deregister();
after(() => { delete globalThis.__schemaCheckEnv; });
test("fresh migrations apply and all query-model columns/types match", async () => { assert.equal((await checkMigrations(root)).length, 12); });
test("bootstrap is idempotent and cannot replace an edited proposal", async () => {
    const files = await migrationFiles(root), db = new DatabaseSync(":memory:");
    try {
        for (const file of files.slice(0, -1))
            db.exec(file.sql);
        db.prepare("INSERT INTO parliament_items(id,serial_code,title,summary,body,classification,routing,created_by_citizen_id,version) VALUES('lesson-2-citizenship','P-002','已修改标题','我的摘要','成员自己的正文','ordinary','parliament','truth',17)").run();
        const before = db.prepare("SELECT * FROM parliament_items WHERE id='lesson-2-citizenship'").get();
        db.exec(files.at(-1).sql);
        assert.deepEqual(db.prepare("SELECT * FROM parliament_items WHERE id='lesson-2-citizenship'").get(), before);
        const rows = db.prepare("SELECT * FROM parliament_items ORDER BY id").all(), audit = db.prepare("SELECT * FROM parliament_audit_events").all();
        db.exec(files.at(-1).sql);
        assert.deepEqual(db.prepare("SELECT * FROM parliament_items ORDER BY id").all(), rows);
        assert.deepEqual(db.prepare("SELECT * FROM parliament_audit_events").all(), audit);
    }
    finally {
        db.close();
    }
});
test("readiness checks only SELECT, cache per binding and fail closed on missing schema", async () => {
    const files = await migrationFiles(root), db = new DatabaseSync(":memory:");
    for (const file of files)
        db.exec(file.sql);
    const queries = [];
    env.DB = { prepare(sql) { assert.match(sql, /^SELECT /); queries.push(sql); return { async all() { return { results: db.prepare(sql).all() }; } }; } };
    try {
        await ensureParliamentSchema();
        await ensurePhotoSchema();
        const n = queries.length;
        await ensureParliamentSchema();
        assert.equal(queries.length, n);
        env.DB = { prepare() { return { async all() { throw Error("missing table"); } }; } };
        await assert.rejects(ensureParliamentSchema(), /schema is not ready/);
    }
    finally {
        db.close();
    }
});
test("sealed SQL cannot change and new migrations require sealing", async () => {
    const directory = await mkdtemp(join(tmpdir(), "schicksal-migrations-"));
    try {
        await cp(new URL("../drizzle", import.meta.url), join(directory, "drizzle"), { recursive: true });
        const path = join(directory, "drizzle/0000_sleepy_otto_octavius.sql"), original = await readFile(path, "utf8");
        await writeFile(path, original + "\n-- changed");
        await assert.rejects(checkHistory(directory), /cannot be rewritten/);
        await writeFile(path, original);
        await writeFile(join(directory, "drizzle/0012_future.sql"), "--new\n");
        await assert.rejects(checkHistory(directory), /seal/);
    }
    finally {
        await rm(directory, { recursive: true, force: true });
    }
});
test("rewriting SQL and lock together still fails against reviewed Git base", async () => {
    const directory = await mkdtemp(join(tmpdir(), "schicksal-migration-base-")), previous = process.env.SCHICKSAL_MIGRATION_BASE;
    try {
        await cp(new URL("../drizzle", import.meta.url), join(directory, "drizzle"), { recursive: true });
        const git = args => { const r = spawnSync("git", args, { cwd: directory, encoding: "utf8" }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
        git(["init", "-q"]);
        git(["add", "drizzle"]);
        git(["-c", "user.name=Codex", "-c", "user.email=codex@users.noreply.github.com", "commit", "-qm", "isolated baseline"]);
        process.env.SCHICKSAL_MIGRATION_BASE = git(["rev-parse", "HEAD"]);
        const file = join(directory, "drizzle/0000_sleepy_otto_octavius.sql"), text = await readFile(file, "utf8") + "\n--illegal rewrite\n";
        await writeFile(file, text);
        const lockFile = join(directory, "drizzle/history.json"), lock = JSON.parse(await readFile(lockFile, "utf8"));
        lock.files[0].sha256 = digest(text);
        await writeFile(lockFile, JSON.stringify(lock));
        await assert.rejects(checkMigrations(directory), /relative to base/);
    }
    finally {
        if (previous === undefined)
            delete process.env.SCHICKSAL_MIGRATION_BASE;
        else
            process.env.SCHICKSAL_MIGRATION_BASE = previous;
        await rm(directory, { recursive: true, force: true });
    }
});
