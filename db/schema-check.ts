const checks = new WeakMap<D1Database, Map<string, Promise<void>>>();
/** Per-binding, retryable SELECT checks; never perform DDL or bootstrap writes. */
export function assertSchema(db: D1Database, tables: readonly (readonly [
    string,
    string
])[]): Promise<void> {
    let cache = checks.get(db);
    if (!cache) {
        cache = new Map();
        checks.set(db, cache);
    }
    const key = JSON.stringify(tables);
    let ready = cache.get(key);
    if (!ready) {
        ready = Promise.all(tables.map(([table, columns]) => db.prepare(`SELECT ${columns} FROM ${table} LIMIT 0`).all()))
            .then(() => undefined)
            .catch(() => { cache!.delete(key); throw new Error("Database schema is not ready; apply reviewed migrations before release."); });
        cache.set(key, ready);
    }
    return ready;
}
