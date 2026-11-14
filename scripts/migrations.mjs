import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import * as models from "../db/schema.ts";
export const digest = bytes => createHash("sha256").update(bytes).digest("hex");
export const root = fileURLToPath(new URL("../", import.meta.url));
export async function migrationFiles(directory = root) {
    const names = (await readdir(resolve(directory, "drizzle"))).filter(n => n.endsWith(".sql")).sort();
    for (let i = 0; i < names.length; i++)
        assert.match(names[i], new RegExp(`^${String(i).padStart(4, "0")}_[a-z0-9_]+\\.sql$`), "Migration numbers must be contiguous and unique");
    return Promise.all(names.map(async (name) => { const sql = await readFile(resolve(directory, "drizzle", name), "utf8"); return { name, sha256: digest(sql), sql }; }));
}
export async function checkHistory(directory = root, allowNew = false) {
    const files = await migrationFiles(directory), lock = JSON.parse(await readFile(resolve(directory, "drizzle/history.json"), "utf8"));
    assert.equal(lock.version, 1);
    assert.ok(files.length >= lock.files.length, "Previously sealed migrations cannot be removed");
    for (let i = 0; i < lock.files.length; i++)
        assert.deepEqual({ name: files[i].name, sha256: files[i].sha256 }, lock.files[i], "Previously sealed migrations cannot be rewritten");
    if (!allowNew)
        assert.equal(files.length, lock.files.length, "Review new SQL and run npm run db:seal before release");
    return files;
}
export function checkQueryModels(db) {
    const configs = Object.values(models).map(getTableConfig), names = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r => r.name).sort();
    assert.deepEqual(configs.map(t => t.name).sort(), names, "Query models must cover migrated tables");
    for (const table of configs) {
        const columns = db.prepare(`PRAGMA table_info("${table.name}")`).all();
        assert.deepEqual(table.columns.map(c => c.name).sort(), columns.map(c => c.name).sort(), `Column drift: ${table.name}`);
        for (const column of table.columns)
            assert.equal(columns.find(c => c.name === column.name).type.toLowerCase(), column.getSQLType().toLowerCase(), `Type drift: ${table.name}.${column.name}`);
    }
}
export async function checkMigrations(directory = root) {
    const files = await checkHistory(directory), base = process.env.SCHICKSAL_MIGRATION_BASE;
    if (base && !/^0{40}$/.test(base)) {
        assert.match(base, /^[a-f0-9]{40}$/i, "Expected full migration base SHA");
        const git = args => { const r = spawnSync("git", args, { cwd: directory, encoding: "utf8" }); assert.equal(r.status, 0, "Cannot read migration base; fetch the base commit first"); return r.stdout; };
        const names = git(["ls-tree", "-r", "--name-only", base, "--", "drizzle"]).trim().split("\n").filter(n => /^drizzle\/\d{4}_.+\.sql$/.test(n));
        for (const name of names)
            assert.equal(files.find(f => `drizzle/${f.name}` === name)?.sha256, digest(git(["show", `${base}:${name}`])), `Applied migration changed relative to base: ${name}`);
    }
    const db = new DatabaseSync(":memory:");
    try {
        for (const file of files)
            db.exec(file.sql);
        checkQueryModels(db);
    }
    finally {
        db.close();
    }
    return files;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const command = process.argv[2] || "check";
    if (command === "check")
        console.log(`Verified ${(await checkMigrations()).length} ordered SQL migrations and query models.`);
    else if (command === "new") {
        const files = await checkHistory(), slug = process.argv[3];
        assert.match(slug || "", /^[a-z][a-z0-9_]{1,70}$/, "Usage: npm run db:new -- descriptive_name");
        const name = `${String(files.length).padStart(4, "0")}_${slug}.sql`;
        await writeFile(resolve(root, "drizzle", name), "-- Reviewed, additive migration. Do not edit sealed SQL.\n", { flag: "wx" });
        console.log(`Created drizzle/${name}; edit SQL/models, then db:seal and check.`);
    }
    else if (command === "seal") {
        const files = await checkHistory(root, true);
        await writeFile(resolve(root, "drizzle/history.json"), JSON.stringify({ version: 1, files: files.map(({ name, sha256 }) => ({ name, sha256 })) }, null, 2) + "\n");
        console.log("New migrations sealed; existing history was not rewritten.");
    }
    else
        throw Error("Expected check, new, or seal");
}
