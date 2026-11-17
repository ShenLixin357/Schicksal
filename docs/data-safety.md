# Data, identity and release safety

This patch never runs production migrations, changes member records, uploads/deletes production objects, or publishes the Worker. Recovery tests create new local SQLite databases and mock private object storage. Existing identity IDs, passwords, speaker/owner roles and photo-deletion policy remain unchanged.

## Release prerequisites

Before a separately authorized release, record the **existing** Cloudflare account ID and D1 UUID. Set build variables `CLOUDFLARE_ACCOUNT_ID` and `SCHICKSAL_D1_DATABASE_ID`, or provide these IDs in the reviewed config. Do not create a replacement database. Missing/conflicting/placeholder IDs fail closed.

`npm run build` runs type/tests/migration checks, builds, then pins the generated Wrangler config to those explicit IDs. This also protects dashboards still running `npx wrangler deploy` directly. CI runs `build:app` after its separate core check, without credentials or deployment. `npm run deploy:check` verifies the existing DB identity without migrating/publishing; `db:migrate` uses the same checks and never publishes. `npm run deploy` migrates reviewed SQL before publication. Prefer this checked deploy command over direct Wrangler so migration ordering is enforced too.

Repository branch protection is separate. If supported by the existing plan, require **Core regression** and **Production build** before merging. This patch does not activate paid settings or change hosting configuration.

## One migration authority

Ordered `drizzle/*.sql` is authoritative. `drizzle/history.json` seals names and hashes. CI also compares SQL with the PR base, preventing an old SQL file and its lock from being silently rewritten together.

- `npm run db:check`: validate sealed history, apply all SQL in memory, compare query-model tables, columns and types.
- `npm run db:new -- feature_name`: create the next additive SQL draft.
- Update SQL and `db/schema.ts`, review, then run `npm run db:seal` and `npm run check`.
- `db:generate` now aliases explicit draft creation. Historical `drizzle/meta/` remains intact but is not the generation/deployment authority; automatic drizzle-kit generation is retired here.

0011 preserves the already-added committee vase history table; 0012 contains the former HTTP-time Parliament bootstrap/backfills. Original `INSERT OR IGNORE` and exact-match predicates protect edited proposals. No election rules or historical texts are invented. Runtime `ensure*Schema` names are retained but only perform retryable SELECT checks. The legacy Sites exporter now emits DDL without bootstrap rows so a restored snapshot cannot collide with seeds.

Migrations are additive; never rewrite applied SQL or automatically drop old columns. Old Workers must remain compatible while new schema is applied. Rolling back code does not roll back a database.

## Backup and isolated restore

Coordinate a backup window: pause writes/uploads or obtain a coherent D1 export and corresponding files. The utility does not itself export/query production and cannot make sequential HTTP reads into a consistent snapshot. Obtain the SQL export using the reviewed config/account/UUID; keep it outside Git.

```
npm run backup:capture -- /absolute/new-backup-directory
npm run backup:verify -- /absolute/new-backup-directory
npm run backup:restore-local -- /absolute/new-backup-directory /absolute/new-restore-directory
```

Capture consumes hidden stdin using the existing private-input protocol: base64 JSON blocks, then a dot line. JSON fields: `sqlFile`, `sourceCommit` (40 hex), `sourceDatabaseId` (existing UUID), and `storage` (existing private Supabase server configuration). Never put credentials in arguments or committed files. Storage credentials remain in memory and are absent from the manifest.

The bundle includes normalized SQL, counts, source IDs/commit, active referenced photos/music images/recordings, exact bytes and SHA-256 checksums. Missing/oversized files or an unregistered object-reference table prevent a completed manifest. New file-backed features must register an adapter in `objectInventory`. Tombstones remain in SQL; deliberately deleted files need not reappear.

Existing salted password hashes are included to preserve accounts; sessions and login-rate windows are emptied. Restored users sign in again. The old Sites migration export intentionally omits credentials too and remains a separate tool. Backup files use 0600, directories 0700. They contain private member data: never commit them or publish them as artifacts.

Verification restores SQL in memory and checks integrity, foreign keys, counts, inventory, sizes and hashes. `restore-local` creates a real new SQLite file and object tree; existing targets are refused. It never overwrites production or uploads to a live bucket. Review and test an isolated D1/bucket import before any separately authorized production rebinding. Only referenced objects are covered, not arbitrary bucket orphans; D1 Time Travel does not restore Supabase objects. No scheduled production backup is enabled here.

## Identity boundary

Parliament, public chat, photos and image bytes require actual sessions even when called without the Worker. Body/query/header identity claims are ignored; mutation origins are checked inside routes. JSON reading bounds actual streamed bytes. The private Worker/asset boundary stays intact. Photo deletion retains the existing all-authenticated-members rule; uploader/owner-only deletion needs a separate decision. General Parliament state/audit atomicity remains a later phase.
