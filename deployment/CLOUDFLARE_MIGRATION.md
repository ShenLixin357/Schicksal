# Independent Cloudflare deployment

This deployment retains the existing eight-blade branding, artwork, all rooms, interactions, five games, member records, chat, parliament and photo archive. It uses the existing locked Vinext / Workers stack; no framework upgrade is required.

The original `.openai/hosting.json` and the original hosted site remain intact. `SCHICKSAL_HOSTING=cloudflare` enables the independent security boundary only on the new Worker.

## Required account access

The owner must authorize deployment to their Cloudflare account. Account registration in a separate browser does not authenticate the current development environment. Cloudflare's website currently presents a repeated human-verification screen to the cloud browser. No independent Worker, D1 database or R2 bucket has been created yet.

After account access is available, create a new `schicksal-data` D1 database and a private `schicksal-family-archive` R2 bucket. Use the free Workers deployment where eligible. Do not enroll in a paid plan or activate billing without the owner's approval. If R2 requires billing activation, stop that step and explain it.

Keep account IDs and generated resource IDs in ignored `work/cloudflare-target.json`, following `cloudflare-target.example.json`. Never store API credentials or member passwords in the repository. Do not reuse the original Sites placeholder database ID or bucket name.

## Build and package

1. Run the repository's verified build.
2. Run `node scripts/cloudflare/prepare.mjs work/cloudflare-target.json`.
3. Check the generated Worker with Wrangler `deploy --dry-run --config work/cloudflare-dist/server/wrangler.json`.

The generated config includes the Worker modules, 64 MB of unchanged client artwork/assets, D1 (`DB`) and R2 (`BUCKET`) bindings, and API-first routing. Passwords are not serialized into this config or client bundles.

## Data and photos

`scripts/cloudflare/snapshot.mjs` accepts a complete paginated native Sites export through hidden stdin. It verifies that all 19 application tables and every column are represented, refuses any truncation or unfinished pagination, restores into an isolated SQLite database and compares every restored cell. UTF-8 text is hex-encoded in SQL to preserve quotes, newlines and embedded nulls.

The output contains `schema.sql`, `data.sql`, `snapshot.json` and `manifest.json`. `member_sessions` and `member_login_windows` are deliberately empty; members sign in again on the new origin. All application records keep their original IDs and timestamps. This is a point-in-time export, not a transactionally frozen live database. Refresh the export just before cutover and verify no intervening writes.

`scripts/cloudflare/download-photos.mjs` downloads source images using supported service access supplied through hidden stdin, verifies byte counts and records SHA-256 hashes. It never saves the service bearer. R2 objects retain their original object keys and MIME types, so existing photo links continue to resolve.

For the **new empty D1 only**, apply source migrations with Wrangler `d1 migrations apply DB --remote --config ...`, then import `data.sql` with `d1 execute DB --remote --file ... --config ... --yes`. SQL uses strict INSERTs; it never deletes or replaces existing target records. Abort and inspect an unexpected nonempty target rather than overwriting it. Do not subsequently import `schema.sql` on top of those migrations; it is a separate standalone restoration option.

Upload each `objects/family-archive/...` file to the new private bucket using `r2 object put BUCKET_NAME/family-archive/... --remote --file ... --content-type ...`. Verify the remote bytes/hashes and per-table counts against the manifest before publishing.

## Independent member login

Configure the Worker secret `SCHICKSAL_MEMBER_PASSWORDS` as a JSON object with distinct passwords for `amberina`, `zxy`, `truth`, `kaito` and `harry`. Each must contain at least 12 characters. The owner sets these credentials securely; do not collect them in chat. The existing account selection and login UI remain the same. The independent deployment refuses login until this configuration is complete, so the old shared fallback password is not exposed as a standalone access mechanism.

The independent Worker strips client-supplied OpenAI identity and trusted-member headers. Private APIs and photo bytes require a valid HttpOnly member session; mutations verify their origin. Chat profiles/messages, parliament actions and photo uploads derive the actor from that verified identity. `amberina` keeps the stage-manager role without Google or ChatGPT identity headers. Other members cannot acquire it by selecting an arbitrary citizen ID in an API payload. Native Sites behavior is unchanged when the independent-hosting variable is absent.

Wrangler 4.92 supports deploying the Worker and its secrets together using `deploy --secrets-file` (a private ignored local file). Do not publish or commit that secret file. Preserve the original site as a fallback until the new deployment passes verification.

## Cutover checks

- New `workers.dev` address opens at the top level without a ChatGPT / Google access gate.
- Each configured member can log in, log out and reopen their own records.
- All 313 exported application records, plus any final incremental changes, match the target counts; photo bytes match the manifest hashes.
- Lounge mask names, chat, vase, seats and all five game boards work. No artificial scores are written to production for testing.
- Owner parliament management works; non-owners cannot manage stages or impersonate another member.
- Private image endpoints reject anonymous requests; authorized members can view the original archive photo.
- Record the actual returned deployment URL. A local build, backup or dry run alone is not a completed migration.
