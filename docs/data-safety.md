# Schicksal 2.0 — Security integration C (draft)

**Scope:** stacked on the phase-2 UI architecture branch. No production Worker, D1 database, object store, credentials or approved artwork was modified by this change.

## Immutable migrations

The existing `0012_member_direct_messages.sql` is preserved byte-for-byte. The older PR #4 Parliament bootstrap is appended as `0013_explicit_parliament_bootstrap.sql` rather than reusing `0012`.

`drizzle/history.json` seals both file names and SHA-256 checksums. `npm run db:check` applies ordered migrations to an in-memory SQLite database and checks Drizzle query-model table/column/type parity, including the direct-message table. Never rewrite a historical migration after it has been applied. Do not infer that an in-memory test proves compatibility with a real production snapshot.

The request-time Parliament and photo schema functions now execute only SELECT readiness checks, not CREATE, ALTER, or historical backfills. Deploy migrations first in an isolated D1 environment; do not deploy the new runtime before the schema is verified.

## Session and API protection

The Parliament, Committee Lounge, vase history and photo endpoints now resolve identity from the actual member session inside the API route rather than trusting request body/query/header citizenship fields. Mutation requests check same origin; bounded JSON helpers avoid unbounded streaming reads. Private messaging keeps its separate existing server-session authorization. Keep all existing committee membership, stage-management, image deletion and speaker/voting rules unchanged.

These changes may expose tests or clients that previously relied on an invented citizen ID. Such clients must use real test sessions rather than weaken the check.

## Backup and recovery

The optional `scripts/cloudflare/backup.mjs` adapted from PR #4 validates coherent imported SQL plus referenced image/music object bytes, writes a manifest with sizes and SHA-256 checksums, and verifies a **new isolated** local SQLite restore. It does not query production, obtain a coherent export on its own, or automatically schedule backups. The older `snapshot.mjs` remains available; it has not been replaced.

Commands (for a separately coordinated local run):

```sh
npm run backup:capture -- /absolute/new-backup
npm run backup:verify -- /absolute/new-backup
npm run backup:restore-local -- /absolute/new-backup /absolute/new-restore
```

A backup can contain private member messages and salted password hashes. Keep it encrypted or strictly private, outside the repo and CI artifacts. The `work/` path is gitignored. Do not upload it to a public Gallery. New object-bearing tables, such as future Library files, require explicit backup adapters.

## Release protection

The checked `npm run deploy` command refuses missing/conflicting Cloudflare account and D1 IDs and does not create a substitute database. The lock-built-binding helper can pin the compiled config when explicitly called; it is **not yet wired into every possible direct Wrangler/dashboard deploy path**. Review the actual Cloudflare deployment configuration before any launch. CI workflows only run tests/build; they never apply remote migrations or publish a Worker.

## Acceptance still required

1. Run new and existing automated CI on the stacked draft PR and repair regressions.
2. Verify cross-member direct API access, including messenger and photo bytes.
3. Test additive `0013` against an anonymized or isolated copy of the real D1 schema/data, including counts and member edits.
4. Coordinate a coherent D1 + object-store export and a complete isolated restore rehearsal. Do not store the backup in GitHub.
5. Safari/mobile UI comparison and rollback-readiness before separately authorizing production.

**Passing a draft branch CI is not permission to merge or deploy.**
