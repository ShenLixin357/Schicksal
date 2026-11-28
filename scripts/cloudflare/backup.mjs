import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, realpath, lstat } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { getPhotoStorage } from "../../app/photo-storage.ts";
import { readPrivateJson } from "./input.mjs";
const hash = value => createHash("sha256").update(value).digest("hex");
const identifier = name => { assert.match(name, /^[a-z][a-z0-9_]*$/); return `"${name}"`; };
const tables = db => db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(row => row.name);
const OMIT = ["member_sessions", "member_login_windows"];
const knownObjectTables = new Set(["archive_photos", "emerald_music_assets","gallery_blobs","digital_blobs","digital_upload_parts"]);
function objectKey(key) {
    assert.ok(typeof key === "string" && key.length <= 512 && /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(key), "Invalid object key");
    assert.ok(key.split("/").every(part => part && part !== "." && part !== ".."), "Unsafe object path");
    return key;
}
export function objectInventory(db) {
    const names = tables(db);
    for (const name of names) {
        const columns = db.prepare(`PRAGMA table_info(${identifier(name)})`).all();
        if (columns.some(column => /^(object_key|storage_key)$/.test(column.name)))
            assert.ok(knownObjectTables.has(name), `Register a backup adapter for ${name}`);
    }
    const objects = [];
    if (names.includes("archive_photos"))
        objects.push(...db.prepare("SELECT id AS sourceId, object_key AS objectKey, size_bytes AS sizeBytes, mime_type AS mimeType, 'archive_photos' AS sourceTable FROM archive_photos").all());
    if (names.includes("emerald_music_assets"))
        objects.push(...db.prepare("SELECT a.id AS sourceId, a.object_key AS objectKey, a.size AS sizeBytes, a.mime AS mimeType, 'emerald_music_assets' AS sourceTable FROM emerald_music_assets a JOIN emerald_music_scores s ON s.id=a.score_id WHERE a.deleted_at IS NULL AND s.deleted_at IS NULL").all());
    // Retain all ready originals, derivatives and historical/trash references.
    // A pending object has an uncertain byte state; fail closed instead of issuing
    // a misleading complete archive. Segment records are logical, not R2 keys.
    const ready = (table) => {
        assert.equal(db.prepare("SELECT COUNT(*) n FROM "+identifier(table)+" WHERE state<>'ready'").get().n,0,"Unreconciled pending bytes in "+table);
    };
    if (names.includes("gallery_blobs")) {
        ready("gallery_blobs");
        const rows=db.prepare("SELECT sha256 AS sourceId, storage_key AS objectKey, byte_size AS sizeBytes,mime AS mimeType,'gallery_blobs' AS sourceTable FROM gallery_blobs").all();
        for(const r of rows){assert.match(r.sourceId,/^[a-f0-9]{64}$/);assert.equal(r.objectKey,"gallery/sha256/"+r.sourceId);}
        objects.push(...rows);
    }
    if (names.includes("digital_blobs")) {
        ready("digital_blobs");
        const rows=db.prepare("SELECT sha256 AS sourceId,storage_key AS objectKey,bytes AS sizeBytes,'application/octet-stream' AS mimeType,'digital_blobs' AS sourceTable FROM digital_blobs").all();
        for(const r of rows){assert.match(r.sourceId,/^[a-f0-9]{64}$/);if(r.objectKey.startsWith("digital/segments/")){assert.ok(names.includes("digital_upload_parts")&&names.includes("digital_uploads"),"Missing segment schema");continue;}assert.equal(r.objectKey,"digital/sha256/"+r.sourceId);objects.push(r);}
    }
    if(names.includes("digital_upload_parts")){
        ready("digital_upload_parts");
        const rows=db.prepare("SELECT sha256 AS sourceId, storage_key AS objectKey,MIN(bytes) AS sizeBytes,MAX(bytes) AS maxBytes,'application/octet-stream' AS mimeType,'digital_upload_parts' AS sourceTable FROM digital_upload_parts GROUP BY sha256,storage_key").all();
        for(const {maxBytes,...r} of rows){assert.match(r.sourceId,/^[a-f0-9]{64}$/);assert.equal(r.objectKey,"digital/parts/sha256/"+r.sourceId);assert.equal(r.sizeBytes,maxBytes,"Conflicting shared part sizes");assert.ok(r.sizeBytes<=4*1024*1024,"Part limit exceeded");objects.push(r);}
    }
    const seen = new Set();
    for (const object of objects) {
        objectKey(object.objectKey);
        assert.ok(Number.isSafeInteger(object.sizeBytes) && object.sizeBytes > 0 && object.sizeBytes <= 32 * 1024 * 1024, "Invalid object size");
        assert.ok(!seen.has(object.objectKey), "Duplicate object reference requires explicit handling");
        seen.add(object.objectKey);
    }
    return objects.map(object => ({ ...object })).sort((a, b) => a.objectKey < b.objectKey ? -1 : a.objectKey > b.objectKey ? 1 : 0);
}
function literal(value) {
    if (value === null)
        return "NULL";
    if (typeof value === "bigint")
        return value.toString();
    if (typeof value === "number" && Number.isFinite(value))
        return String(value);
    if (typeof value === "string")
        return `CAST(X'${Buffer.from(value).toString("hex")}' AS TEXT)`;
    if (value instanceof Uint8Array)
        return `X'${Buffer.from(value).toString("hex")}'`;
    throw new Error("Unsupported SQL cell");
}
function serialize(db) {
    const schema = db.prepare("SELECT type,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY rowid").all();
    const output = schema.filter(row => row.type === "table").map(row => `${row.sql};`);
    for (const name of tables(db)) {
        const columns = db.prepare(`PRAGMA table_info(${identifier(name)})`).all().map(column => column.name);
        const statement = db.prepare(`SELECT * FROM ${identifier(name)}`);
        statement.setReadBigInts(true);
        for (const row of statement.all())
            output.push(`INSERT INTO ${identifier(name)} (${columns.map(identifier).join(",")}) VALUES (${columns.map(column => literal(row[column])).join(",")});`);
    }
    if (db.prepare("SELECT 1 FROM sqlite_master WHERE name='sqlite_sequence'").get()) {
        output.push("DELETE FROM sqlite_sequence;");
        const statement = db.prepare("SELECT name,seq FROM sqlite_sequence");
        statement.setReadBigInts(true);
        for (const row of statement.all())
            output.push(`INSERT INTO sqlite_sequence(name,seq) VALUES(${literal(row.name)},${literal(row.seq)});`);
    }
    output.push(...schema.filter(row => row.type !== "table").map(row => `${row.sql};`));
    return `${output.join("\n")}\n`;
}
const counts = db => Object.fromEntries(tables(db).map(name => [name, db.prepare(`SELECT COUNT(*) AS n FROM ${identifier(name)}`).get().n]));
function validateDatabase(db) {
    assert.equal(db.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), [], "Dangling foreign keys");
}
function restoreSql(db, sql) {
    db.exec("BEGIN; PRAGMA defer_foreign_keys=ON;");
    try {
        db.exec(sql);
        validateDatabase(db);
        db.exec("COMMIT");
    }
    catch (error) {
        db.exec("ROLLBACK");
        throw error;
    }
}
async function privateWrite(path, bytes) {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    await writeFile(path, bytes, { mode: 0o600, flag: "wx" });
}
async function checkedFile(directory, relative) {
    objectKey(relative);
    const root = await realpath(directory), path = resolve(root, relative);
    assert.ok(path.startsWith(root + sep), "Path escapes backup");
    assert.ok(!(await lstat(path)).isSymbolicLink(), "Backup symlinks are not permitted");
    assert.ok((await realpath(path)).startsWith(root + sep), "Path escapes backup");
    return readFile(path);
}
async function objectBytes(object, expectedSize) {
    assert.ok(object?.body, "Required private object is missing");
    const reader = new Response(object.body).body.getReader(), parts = [];
    let size = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            size += value.byteLength;
            if (size > expectedSize) {
                await reader.cancel();
                throw new Error("Object exceeds recorded size");
            }
            parts.push(value);
        }
    }
    finally {
        reader.releaseLock();
    }
    assert.equal(size, expectedSize, "Object byte count differs from database");
    return Buffer.concat(parts);
}
/** Accepts an already coordinated trusted D1 SQL export; never queries production. */
export async function captureBackup({ sql, output, sourceCommit, sourceDatabaseId, getObject }) {
    assert.match(sourceCommit, /^[a-f0-9]{40}$/i);
    assert.match(sourceDatabaseId, /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
    await mkdir(output, { mode: 0o700 });
    const db = new DatabaseSync(":memory:");
    try {
        // Disable constraints only while loading the source into this ephemeral DB;
        // validate all references before producing any successful backup.
        db.exec("PRAGMA foreign_keys=OFF");
        db.exec(sql);
        db.exec("PRAGMA foreign_keys=ON");
        validateDatabase(db);
        for (const name of OMIT.filter(name => tables(db).includes(name)))
            db.exec(`DELETE FROM ${identifier(name)}`);
        const references = objectInventory(db), normalized = serialize(db);
        await privateWrite(resolve(output, "database.sql"), normalized);
        const manifest = { version: 1, kind: "schicksal-backup", createdAt: new Date().toISOString(), sourceCommit, sourceDatabaseId,
            excludedTables: OMIT, counts: counts(db), database: { file: "database.sql", bytes: Buffer.byteLength(normalized), sha256: hash(normalized) }, objects: [] };
        for (const reference of references) {
            const bytes = await objectBytes(await getObject(reference.objectKey,reference), reference.sizeBytes);
            if(["gallery_blobs","digital_blobs","digital_upload_parts"].includes(reference.sourceTable))assert.equal(hash(bytes),reference.sourceId,"Canonical content checksum mismatch");
            await privateWrite(resolve(output, "objects", reference.objectKey), bytes);
            manifest.objects.push({ ...reference, sha256: hash(bytes) });
        }
        await verifyPayload(output, manifest);
        // Missing or invalid objects can never produce a completed manifest.
        await privateWrite(resolve(output, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
        return manifest;
    }
    finally {
        db.close();
    }
}
/** Reassemble each completed logical segment stream in order without loading
 * the complete file into memory. Verify metadata, length and canonical whole hash. */
async function verifySegments(db,directory){
    if(!tables(db).includes("digital_blobs"))return;
    const rows=db.prepare("SELECT sha256,bytes,storage_key FROM digital_blobs WHERE storage_key LIKE 'digital/segments/%'").all();
    for(const r of rows){
        const id=r.storage_key.slice("digital/segments/".length);
        assert.match(id,/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/);
        const u=db.prepare("SELECT * FROM digital_uploads WHERE id=?").get(id);
        assert.ok(u&&u.expected_sha===r.sha256&&u.total_bytes===r.bytes,"Segment manifest mismatch");
        // A crash after immutable blob insertion but before final status update
        // still has complete bytes; validate them rather than trusting status.
        assert.ok(Number.isSafeInteger(u.part_bytes)&&u.part_bytes>0&&u.part_bytes<=4*1024*1024&&r.bytes<=256*1024*1024);
        const parts=db.prepare("SELECT idx,bytes,sha256,storage_key,state FROM digital_upload_parts WHERE upload_id=? ORDER BY idx").all(id);
        assert.equal(parts.length,Math.ceil(r.bytes/u.part_bytes),"Incomplete segment manifest");
        const h=createHash("sha256");
        let total=0;
        for(const [i,p] of parts.entries()){
            assert.equal(p.idx,i);assert.equal(p.state,"ready");
            assert.equal(p.storage_key,"digital/parts/sha256/"+p.sha256);
            assert.equal(p.bytes,Math.min(u.part_bytes,r.bytes-i*u.part_bytes));
            const bytes=await checkedFile(directory,"objects/"+objectKey(p.storage_key));
            assert.equal(bytes.length,p.bytes);assert.equal(hash(bytes),p.sha256);
            h.update(bytes);total+=bytes.length;
        }
        assert.equal(total,r.bytes);assert.equal(h.digest("hex"),r.sha256,"Whole segmented content checksum mismatch");
    }
}

export async function verifyBackup(directory) {
    return verifyPayload(directory, JSON.parse(await checkedFile(directory, "manifest.json")));
}
async function verifyPayload(directory, manifest) {
    assert.equal(manifest.version, 1);
    assert.equal(manifest.kind, "schicksal-backup");
    assert.deepEqual(manifest.excludedTables, OMIT);
    for (const name of OMIT)
        if (name in manifest.counts)
            assert.equal(manifest.counts[name], 0, "Restoring live sessions is prohibited");
    assert.equal(manifest.database.file, "database.sql");
    const sql = await checkedFile(directory, manifest.database.file);
    assert.equal(sql.byteLength, manifest.database.bytes);
    assert.equal(hash(sql), manifest.database.sha256, "Database checksum mismatch");
    const db = new DatabaseSync(":memory:");
    try {
        restoreSql(db, sql.toString("utf8"));
        assert.deepEqual(counts(db), manifest.counts, "Restored table counts differ");
        assert.deepEqual(objectInventory(db), manifest.objects.map(({ sha256, ...reference }) => reference), "Object inventory differs from database");
        for (const object of manifest.objects) {
            const bytes = await checkedFile(directory, `objects/${objectKey(object.objectKey)}`);
            assert.equal(bytes.byteLength, object.sizeBytes);
            assert.equal(hash(bytes), object.sha256, "Object checksum mismatch");
            if(["gallery_blobs","digital_blobs","digital_upload_parts"].includes(object.sourceTable))assert.equal(hash(bytes),object.sourceId,"Canonical content checksum mismatch");
        }
        await verifySegments(db,directory);
    }
    finally {
        db.close();
    }
    return manifest;
}
/** Creates a new isolated SQLite file and object tree; cannot overwrite a target. */
export async function restoreLocal(directory, output) {
    const manifest = await verifyBackup(directory);
    await mkdir(output, { mode: 0o700 });
    const target = resolve(output, "database.sqlite");
    await privateWrite(target, Buffer.alloc(0));
    const db = new DatabaseSync(target);
    try {
        restoreSql(db, (await checkedFile(directory, "database.sql")).toString("utf8"));
        assert.deepEqual(counts(db), manifest.counts);
    }
    finally {
        db.close();
    }
    for (const object of manifest.objects)
        await privateWrite(resolve(output, "objects", object.objectKey), await checkedFile(directory, `objects/${object.objectKey}`));
    return manifest;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const [command, directory, output] = process.argv.slice(2);
    if (command === "capture") {
        const input = await readPrivateJson();
        const manifest = await captureBackup({ sql: await readFile(input.sqlFile, "utf8"), output: resolve(directory), sourceCommit: input.sourceCommit, sourceDatabaseId: input.sourceDatabaseId,
            getObject: async (key,reference) => {
                if(["gallery_blobs","digital_blobs","digital_upload_parts"].includes(reference.sourceTable)){
                    assert.ok(typeof input.collectionObjectDirectory==="string"&&input.collectionObjectDirectory,"Explicit private collection object export required");
                    return {body:await checkedFile(input.collectionObjectDirectory,key)};
                }
                return getPhotoStorage(input.storage).get(key);
            } });
        console.log(JSON.stringify({ tables: Object.keys(manifest.counts).length, objects: manifest.objects.length, verified: true }));
    }
    else if (command === "verify") {
        await verifyBackup(resolve(directory));
        console.log("Backup SQL, records, inventory and checksums verified.");
    }
    else if (command === "restore-local") {
        await restoreLocal(resolve(directory), resolve(output));
        console.log("Restored to a new isolated local database and object directory.");
    }
    else
        throw new Error("Usage: backup.mjs capture OUTPUT | verify BACKUP | restore-local BACKUP NEW_DIRECTORY");
}
