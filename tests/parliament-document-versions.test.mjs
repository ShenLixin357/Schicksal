import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

const manifest = JSON.parse(readFileSync(new URL("../drizzle/history.json", import.meta.url), "utf8"));
const sql = name => readFileSync(new URL(`../drizzle/${name}`, import.meta.url), "utf8");

test("migration captures only known legacy text and retains subsequent document versions", () => {
  const db = new DatabaseSync(":memory:");
  try {
    const revision = manifest.files.findIndex(entry => entry.name === "0020_parliament_document_versions.sql");
    assert.notEqual(revision, -1);
    for (const { name, sha256 } of manifest.files.slice(0, revision)) {
      assert.equal(createHash("sha256").update(sql(name)).digest("hex"), sha256);
      db.exec(sql(name));
    }
    db.exec(`INSERT INTO parliament_items (id, serial_code, title, summary, body, created_by_citizen_id, version)
      VALUES ('legacy', 'LEGACY-1', '现有标题', '现有摘要', '还找得到的第三版正文', 'amberina', 3);
      INSERT INTO parliament_votes (id, item_id, citizen_id, choice, document_version)
      VALUES ('old-vote', 'legacy', 'zxy', 'support', 1);`);
    db.exec(sql(manifest.files[revision].name));
    db.exec(`UPDATE parliament_items SET title = '新标题', summary = '新摘要', body = '第四版正文', version = 4 WHERE id = 'legacy';
      UPDATE parliament_items SET body = '并入修正案后的正文', version = 5 WHERE id = 'legacy';
      UPDATE parliament_items SET stage = 'debate' WHERE id = 'legacy';`);
    const archived = db.prepare("SELECT version, title, summary, body, source FROM parliament_document_versions WHERE item_id='legacy' ORDER BY version").all();
    assert.deepEqual(archived.map(row => Object.values(row)), [
      [3, "现有标题", "现有摘要", "还找得到的第三版正文", "baseline"],
      [4, "新标题", "新摘要", "第四版正文", "revision"],
      [5, "新标题", "新摘要", "并入修正案后的正文", "revision"],
    ]);
    assert.equal(db.prepare("SELECT document_version FROM parliament_votes WHERE id='old-vote'").get().document_version, 1);
    assert.throws(() => db.exec("UPDATE parliament_items SET body='直接覆盖' WHERE id='legacy'"), /require the next document version/);
    db.exec("INSERT INTO parliament_items (id, serial_code, title, body, created_by_citizen_id) VALUES ('new','NEW-1','新议案','第一版','amberina')");
    assert.equal(db.prepare("SELECT body FROM parliament_document_versions WHERE item_id='new' AND version=1").get().body, "第一版");
    db.exec("BEGIN; UPDATE parliament_items SET body='未提交', version=6 WHERE id='legacy'; ROLLBACK;");
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM parliament_document_versions WHERE item_id='legacy'").get().n, 3);
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    db.close();
  }
});
