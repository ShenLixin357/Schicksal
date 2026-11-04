# Schicksal — 天命第一帝国

The complete private website, including the original eight-blade emblem, Committee Lounge, three private rooms, five games, personal-best leaderboards, parliament, photo archive and all original scene artwork.

## Cloudflare setup

Connect this private GitHub repository in **Workers & Pages → Create application → Connect GitHub**. Select:

| Setting | Value |
| --- | --- |
| Worker / project name | `schicksal` |
| Production branch | `main` |
| Root directory | `/` |
| Build command | `npm run build` |
| Deploy command | `npm run deploy` |
| Node version | `24` |

Wrangler automatically provisions the `DB` D1 database and the private `BUCKET` R2 bucket in the selected Cloudflare account. No old account resource IDs are embedded. The deploy script applies the schema migrations before publishing the Worker.

Add **SCHICKSAL_MEMBER_PASSWORDS** as a Worker **Secret**. Its value is a JSON object with the keys `amberina`, `zxy`, `truth`, `kaito` and `harry`, each mapped to a different password of at least 12 characters. Configure these credentials privately in Cloudflare; do not put them in Git, screenshots or chat. Login stays unavailable until the secret is configured correctly. The source contains no working fallback member password.

If Cloudflare asks to activate billing or a paid product, pause that step for the owner's decision. This repository does not activate a paid plan.

## Restore existing records

The data backup is separate from this source repository. It contains the source table snapshot, SQL files, one original archive photo and checksums. After the new resources are created:

1. Verify the target D1 tables are empty, apart from login sessions and migration metadata.
2. Import backup `data.sql` into the newly migrated `DB`; preserve all record IDs and timestamps. Do not import `schema.sql` on top of applied migrations.
3. Upload backup `objects/family-archive/...` to the private R2 bucket with the same object key and MIME type.
4. Compare the restored row counts and photo hashes with the backup manifest. Refresh the source snapshot before final cutover if the old site received new writes.

The original export contained 313 application records and one archive photo. Login sessions and rate-limit windows were intentionally omitted. Creating the Worker alone does not finish the data migration. Keep the old website until the restored site is checked.

## Local development and checks

Use Node 24 and `npm ci`, then `npm run dev`. Production builds use `npm run build`. Checks include `npm run test:records`, `npm run test:migration`, `npm run test:minigames` and `npm run test:solitaire`.

The independent Worker validates member sessions on the server, protects private APIs and photo bytes, and derives authorship and manager permissions from the verified member. It does not depend on Google or ChatGPT sign-in. Different game difficulties keep separate personal-best boards, and queued records remain scoped to their member.
