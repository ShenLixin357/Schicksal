# Schicksal — 天命第一帝国

The complete private website, including the original eight-blade emblem, Committee Lounge, three private rooms, five games, personal-best leaderboards, parliament, photo archive and all original scene artwork.

## Cloudflare setup

The default deployment uses **Cloudflare Workers Free + D1 Free + Supabase Free Storage**. R2 is not provisioned. Follow the step-by-step [free setup guide](deployment/FREE_SETUP.md).

Connect this private GitHub repository in **Workers & Pages → Create application → Connect GitHub**. Select:

| Setting | Value |
| --- | --- |
| Worker / project name | `schicksal` |
| Production branch | `main` |
| Root directory | `/` |
| Build command | `npm run build` |
| Deploy command | `npm run deploy` |
| Node version | `24` |

The reviewed C security integration changes deployment to **fail closed** when the existing production Cloudflare account or D1 `DB` binding is missing/mismatched. It must never create a substitute production database. Migrations need an isolated rehearsal and a coherent backup before an explicitly approved production release. Older free-setup scripts may describe a less strict first-install path; do not follow those instructions for the current production database. Photos use a private Supabase bucket named `schicksal-photos`. Configure `SUPABASE_URL` and `SUPABASE_SECRET_KEY` as Worker Secrets; never commit their real values. No old account resource IDs are embedded.

Add **SCHICKSAL_MEMBER_PASSWORDS** as a Worker **Secret**. Its value is a JSON object containing the owner key `amberina`; add `zxy`, `truth`, `kaito` or `harry` only when inviting those members. Passwords may use 1–1024 characters. After the initial owner login, use Profile → Member login settings to set other members’ passwords; those values are salted and hashed in D1. Configure the initial owner credential privately in Cloudflare; do not put them in Git, screenshots or chat. The whole site stays closed until owner login is configured correctly. The source contains no working fallback member password.

Every page, artwork file, client bundle, archive and private API requires a valid member session. Only a self-contained login screen and the member-login endpoint are reachable anonymously. Static assets use `run_worker_first: true` so direct asset URLs cannot bypass authentication. Responses use private/no-store caching and no-index headers. Share the site address and each invitee's credentials privately; a link by itself does not grant access.

If Cloudflare asks to activate billing or a paid product, pause that step for the owner's decision. This repository does not activate a paid plan.

## Restore existing records

The data backup is separate from this source repository. It contains the source table snapshot, SQL files, one original archive photo and checksums. After the new resources are created:

1. Verify the target D1 tables are empty, apart from login sessions and migration metadata.
2. Import backup `data.sql` into the newly migrated `DB`; preserve all record IDs and timestamps. Do not import `schema.sql` on top of applied migrations.
3. Upload backup `objects/family-archive/...` to the private Supabase `schicksal-photos` bucket, retaining the `family-archive/...` object key and MIME type.
4. Compare the restored row counts and photo hashes with the backup manifest. Refresh the source snapshot before final cutover if the old site received new writes.

An earlier historical export contained 313 application records and one archive photo; these are **not** asserted to be the current production counts. Login sessions and rate-limit windows were intentionally omitted. Creating the Worker alone does not finish the data migration. Keep the old website until the restored site is checked.

## Local development and checks

Use Node 24 and `npm ci`, then `npm run dev`. Production builds use `npm run build`. Checks include `npm run test:records`, `npm run test:migration`, `npm run test:minigames` and `npm run test:solitaire`.

The independent Worker validates member sessions on the server, protects private APIs and photo bytes, and derives authorship and manager permissions from the verified member. It does not depend on Google or ChatGPT sign-in. Different game difficulties keep separate personal-best boards, and queued records remain scoped to their member.

## Personal emblem and colour governance

Before editing Amberina's personal mark, name, or any identity-colour UI,
read [AGENTS.md](AGENTS.md) and the authoritative
[Amberina identity colour policy](docs/amberina-identity-color-policy.md).
Official representative colour is `#F3ED87`; approved stronger emblem-only
colour is `#EECF58`. New emblem/name display contexts require an explicit
question about whether the colour should be strengthened.

## Public identity, modularity and asset audits (Draft #14)

Future public modules (including Library and Gallery) should use the shared, light
`app/identity/public.ts` contract for member colors, image/mark asset metadata
and office assignments, plus the reusable
`app/identity/public-mark.tsx` and `app/emblem/compact-emblem.tsx` components
for approved public mark presentation. The Lounge's personal masks remain a
separate identity domain. The approved current President is a static office
assignment until a separately authenticated election/term service is built.
Never infer platform-admin permission from a political office.

Use `npm run audit:assets -- --json` for a **read-only** inventory of every
`public/` asset, including game WASM/BIN and source archives; it does not
automatically delete or optimize any artwork. Legacy Lounge CSS still needs
visual approval for per-scene scoping.

Read [the full site audit](docs/architecture/site-audit-2026-11-20.md)
before adding new modules, uploading gallery originals or rewriting
shared identity. The additive `0014_briefing_presence.sql` replaces
request-time schema creation; it must be tested and applied in an isolated
D1 environment **before** deploying code that requires the new tables.
Neither this migration nor the stacked C/D/E PRs are applied to production.
