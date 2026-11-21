import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { captureBackup, restoreLocal, verifyBackup } from "../scripts/cloudflare/backup.mjs";
import { schemaSql, sqlValue } from "../scripts/cloudflare/snapshot.mjs";
const root = new URL("../", import.meta.url).pathname;
async function fixture() {
    const directory = await mkdtemp(join(tmpdir(), "schicksal-backup-")), files = new Map([["family-archive/photo.png", Buffer.from([137, 80, 78, 71])], ["cello/zxy/page.png", Buffer.from("page-bytes")], ["cello/zxy/recording.mp3", Buffer.from("ID3-audio")]]), text = "主人's 备注\n第二行\0最后 🎻";
    const sql = await schemaSql(root) + `
 INSERT INTO archive_photos(id,object_key,original_name,title,subjects_json,subject_key,uploader_citizen_id,mime_type,size_bytes) VALUES('photo','family-archive/photo.png','p.png','Photo','[]','empire','truth','image/png',4);
 INSERT INTO emerald_music_scores(id,title,private_note,write_token,created_by,created_at,updated_at) VALUES('score','原有曲目',${sqlValue(text)},'token','zxy','2026-11-14','2026-11-14');
 INSERT INTO emerald_music_assets(id,score_id,kind,object_key,original_name,mime,size,created_at) VALUES('page','score','image','cello/zxy/page.png','page.png','image/png',10,'2026-11-14');
 INSERT INTO emerald_music_assets(id,score_id,kind,object_key,original_name,mime,size,created_at) VALUES('audio','score','audio','cello/zxy/recording.mp3','recording.mp3','audio/mpeg',9,'2026-11-14');
 INSERT INTO emerald_music_assets(id,score_id,kind,object_key,original_name,mime,size,created_at,deleted_at) VALUES('deleted','score','image','cello/zxy/deleted.png','deleted.png','image/png',4,'2026-11-14','2026-11-14');
 INSERT INTO emerald_music_melodies(id,creator_id,client_id,notes_json,tempo,message,created_at) VALUES('melody','truth','client','[{"pitch":"C3","beats":1}]',80,'留言','2026-11-14');
 INSERT INTO member_insaniquarium_saves(citizen_id,state_json,revision,updated_at) VALUES('zxy','{"version":1,"files":{"users.dat":"AAECAw=="}}',7,'2026-11-14');
 INSERT INTO member_credentials VALUES('zxy','hash-sentinel','salt-sentinel',1,'amberina');
 INSERT INTO current_office_holders(office_id,citizen_id,term_id) VALUES('technology','amberina','founding-2026');
 INSERT INTO member_sessions(token_hash,citizen_id,expires_at) VALUES('old-session','zxy',9999999999999);
 INSERT INTO member_login_windows VALUES('window',2,9999999999999);
 `;
    return { directory, files, text, input: { sql, output: join(directory, "backup"), sourceCommit: "a".repeat(40), sourceDatabaseId: "11111111-2222-4333-8444-555555555555", getObject: async (key) => files.has(key) ? { body: files.get(key) } : null } };
}
test("real isolated restore preserves photos, music, private notes, native saves, credentials and IDs", async () => {
    const f = await fixture();
    try {
        const manifest = await captureBackup(f.input);
        assert.equal(manifest.objects.length, 3);
        assert.ok(manifest.objects.some(o => o.objectKey.endsWith(".mp3")));
        assert.equal(manifest.counts.member_sessions, 0);
        assert.equal(manifest.counts.member_credentials, 1);
        const target = join(f.directory, "restore");
        await restoreLocal(f.input.output, target);
        const db = new DatabaseSync(join(target, "database.sqlite"));
        try {
            assert.equal(db.prepare("SELECT private_note FROM emerald_music_scores WHERE id='score'").get().private_note, f.text);
            assert.equal(db.prepare("SELECT revision FROM member_insaniquarium_saves WHERE citizen_id='zxy'").get().revision, 7);
            assert.match(db.prepare("SELECT state_json FROM member_insaniquarium_saves WHERE citizen_id='zxy'").get().state_json, /AAECAw==/);
            assert.equal(db.prepare("SELECT password_hash FROM member_credentials WHERE citizen_id='zxy'").get().password_hash, "hash-sentinel");
            assert.equal(db.prepare("SELECT COUNT(*) AS n FROM member_sessions").get().n, 0);
            assert.equal(db.prepare("SELECT citizen_id FROM current_office_holders WHERE office_id='technology'").get().citizen_id, "amberina");
            assert.equal(db.prepare("SELECT COUNT(*) AS n FROM emerald_music_melodies").get().n, 1);
            assert.equal(db.prepare("SELECT COUNT(*) AS n FROM emerald_music_assets WHERE deleted_at IS NOT NULL").get().n, 1);
        }
        finally {
            db.close();
        }
        for (const [key, bytes] of f.files)
            assert.deepEqual(await readFile(join(target, "objects", key)), bytes);
        assert.equal((await stat(join(f.input.output, "database.sql"))).mode & 0o777, 0o600);
        await assert.rejects(restoreLocal(f.input.output, target), /EEXIST/);
    }
    finally {
        await rm(f.directory, { recursive: true, force: true });
    }
});
test("SQL/object corruption and path traversal prevent restore", async () => {
    const f = await fixture();
    try {
        await captureBackup(f.input);
        const path = join(f.input.output, "objects/cello/zxy/page.png");
        await writeFile(path, Buffer.alloc(10));
        await assert.rejects(verifyBackup(f.input.output), /checksum/);
        await writeFile(path, f.files.get("cello/zxy/page.png"));
        const sqlPath = join(f.input.output, "database.sql"), sql = await readFile(sqlPath);
        await writeFile(sqlPath, Buffer.concat([sql, Buffer.from("--corrupted")]));
        await assert.rejects(verifyBackup(f.input.output));
        await writeFile(sqlPath, sql);
        const manifestPath = join(f.input.output, "manifest.json"), manifest = JSON.parse(await readFile(manifestPath, "utf8"));
        manifest.objects[0].objectKey = "../../escape";
        await writeFile(manifestPath, JSON.stringify(manifest));
        await assert.rejects(restoreLocal(f.input.output, join(f.directory, "blocked")));
    }
    finally {
        await rm(f.directory, { recursive: true, force: true });
    }
});
test("missing/oversized files or unknown reference tables cannot produce completed backups", async () => {
    for (const kind of ["missing", "oversized", "future-table"]) {
        const f = await fixture();
        try {
            if (kind === "missing")
                f.input.getObject = async () => null;
            if (kind === "oversized")
                f.input.getObject = async () => ({ body: Buffer.alloc(100) });
            if (kind === "future-table")
                f.input.sql += "CREATE TABLE library_files(id TEXT,object_key TEXT);";
            await assert.rejects(captureBackup(f.input));
            await assert.rejects(readFile(join(f.input.output, "manifest.json")), /ENOENT/);
        }
        finally {
            await rm(f.directory, { recursive: true, force: true });
        }
    }
});
