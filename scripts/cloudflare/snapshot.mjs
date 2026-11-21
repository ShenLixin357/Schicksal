import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { readPrivateJson } from "./input.mjs";

export const OMIT_TABLES = new Set(["member_sessions", "member_login_windows", "member_credentials", "technology_credentials"]);
const identifier = (name) => { if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new Error("Unexpected SQL identifier"); return `\"${name}\"`; };
export function sqlValue(value) {
  if (value === null) return "NULL";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") return `CAST(X'${Buffer.from(value, "utf8").toString("hex")}' AS TEXT)`;
  throw new Error("Unsupported database cell; export must be lossless");
}
export async function schemaSql(root) {
  const files = (await readdir(resolve(root, "drizzle"))).filter((file) => file.endsWith(".sql")).sort();
  const database = new DatabaseSync(":memory:");
  try {
    for (const file of files) database.exec(await readFile(resolve(root, "drizzle", file), "utf8"));
    // Applied migrations may contain one-time seed/backfill DML. Reconstruct only
    // the final schema so importing a snapshot cannot silently keep its seed rows
    // instead of the actual, possibly edited, member-owned records.
    const statements = database.prepare(`SELECT sql FROM sqlite_master
      WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'
      ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 WHEN 'trigger' THEN 2 ELSE 3 END, rowid`)
      .all().map(({ sql }) => sql.endsWith(";") ? sql : `${sql};`);
    return statements.join("\n") + "\n";
  } finally {
    database.close();
  }
}
export async function validateSnapshot(snapshot, root) {
  assert.equal(snapshot.version, 1); assert.ok(Array.isArray(snapshot.tables));
  const database = new DatabaseSync(":memory:"); const schema = await schemaSql(root); database.exec(schema);
  const expected = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map((row) => row.name).sort();
  assert.deepEqual(snapshot.tables.map((table) => table.table_name).filter((name) => !OMIT_TABLES.has(name)).sort(), expected.filter((name) => !OMIT_TABLES.has(name)), "Every application table must be represented");
  const statements = [], counts = Object.fromEntries([...OMIT_TABLES].map((name) => [name, 0]));
  for (const table of snapshot.tables) {
    const projection = table.model_projection;
    assert.ok(projection && !projection.truncated && !projection.truncated_values && !projection.omitted_rows && !projection.omitted_columns && projection.next_offset === null, `Incomplete table: ${table.table_name}`);
    const columns = database.prepare(`PRAGMA table_info(${identifier(table.table_name)})`).all().map((row) => row.name).sort();
    assert.deepEqual([...table.columns].sort(), columns, `Schema mismatch: ${table.table_name}`);
    if (OMIT_TABLES.has(table.table_name)) { counts[table.table_name] = 0; continue; }
    for (const row of table.rows) {
      assert.deepEqual(Object.keys(row).sort(), columns, "Missing or unexpected database cells");
      const sql = `INSERT INTO ${identifier(table.table_name)} (${columns.map(identifier).join(",")}) VALUES (${columns.map((column) => sqlValue(row[column])).join(",")});`;
      database.exec(sql); statements.push(sql);
    }
    counts[table.table_name] = table.rows.length;
    assert.equal(database.prepare(`SELECT COUNT(*) AS n FROM ${identifier(table.table_name)}`).get().n, table.rows.length);
    const restored = database.prepare(`SELECT ${columns.map(identifier).join(",")} FROM ${identifier(table.table_name)}`).all().map((row) => Object.fromEntries(columns.map((key) => [key, row[key]])));
    const sortRows = (rows) => rows.map((row) => JSON.stringify(Object.fromEntries(columns.map((key) => [key, row[key]])))).sort();
    assert.deepEqual(sortRows(restored), sortRows(table.rows), `Round-trip mismatch: ${table.table_name}`);
  }
  database.close();
  const dataSql = `-- Schicksal data snapshot: ${snapshot.capturedAt}\n-- Import only into an empty migrated database. Existing records are never replaced.\n-- Login credentials, sessions and rate-limit windows are intentionally excluded.\n${statements.join("\n")}\n`;
  return { schema, dataSql, counts };
}

export async function writeSnapshot(snapshot, root, output) {
  const result = await validateSnapshot(snapshot, root); await mkdir(output, { recursive: true });
  const safeSnapshot = { ...snapshot, tables: snapshot.tables.map((table) => OMIT_TABLES.has(table.table_name) ? { ...table, rows: [] } : table) };
  await writeFile(resolve(output, "snapshot.json"), JSON.stringify(safeSnapshot, null, 2), { mode: 0o600 });
  await writeFile(resolve(output, "data.sql"), result.dataSql, { mode: 0o600 });
  await writeFile(resolve(output, "schema.sql"), result.schema, { mode: 0o600 });
  const manifest = { version: 1, capturedAt: snapshot.capturedAt, sourceCommit: snapshot.sourceCommit, counts: result.counts, omittedTables: [...OMIT_TABLES], sha256: { "schema.sql": createHash("sha256").update(result.schema).digest("hex"), "data.sql": createHash("sha256").update(result.dataSql).digest("hex") }, photos: [] };
  await writeFile(resolve(output, "manifest.json"), JSON.stringify(manifest, null, 2), { mode: 0o600 });
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const snapshot = await readPrivateJson();
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const manifest = await writeSnapshot(snapshot, root, resolve(process.argv[2] || "work/cloudflare-migration"));
  console.log(JSON.stringify({ capturedAt: manifest.capturedAt, tables: Object.keys(manifest.counts).length, records: Object.values(manifest.counts).reduce((a, b) => a + b, 0), excluded: manifest.omittedTables }));
}
