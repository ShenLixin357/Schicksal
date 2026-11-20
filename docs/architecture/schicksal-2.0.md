# Schicksal 2.0 — Modular Monolith Architecture

Status: **active staged refactor** (branch `refactor/schicksal-architecture-phase1-20261120`). The approved UI lives on `preview/sidebar-lounge-v4-20261120`; the production `main` branch is a separate, explicitly approval-gated release target.

## 1. Why change the structure?

The original app ships a single `app/page.tsx` with the identity gateway, front page, old visual parliament prototype, live parliamentary workflows, photo gallery, archives, and several immersive Lounge scenes. Much of the stylesheet was also one file (`globals.css`, approximately 2,754 lines before this phase).

That creates cross-feature regressions: changing one room could affect unrelated text, art, permissions, or page load. **The user requires replacing individual scenes (e.g., a full Emerald Lounge redesign) without rebuilding unrelated pages or re-colouring approved scenes.**

Do **not** convert this project to multiple microservices or replicate login databases. Keep one service with strict module boundaries, controlled routes, and existing Cloudflare Workers/D1 architecture.

## 2. Dependency direction and ownership

```text
app/page.tsx (client coordinator; *no* scene drawing, DB rules or large CSS)
 ├── shell/           shared navigation, feature loading, presentation fallback
 ├── briefing/        login briefing + mandatory entry gate
 ├── home/            main screen; emblem/blade-spec -> single shared identity order
 ├── parliament/      future: view/ + workflow/ + API contract/
 ├── collection/      future: Library Lab adapter; atlas/; photos/; archives/
 ├── club/            future: Lounge shell, private scenes, games, effects
 ├── photos/          gallery rendering, filters, uploads via /api/photos
 ├── archives/        book reader, markdown parser, chapter catalogue
 ├── festivals/       calendar
 ├── points/          honors, market
 ├── profile/         own member and public profile views
 └── transitions/     individual scene transitions (current 4-second Lounge veil)

app/api/*              server-only access and authorization
db/ + drizzle/         centralized schema and migration discipline
app/citizens.ts        single canonical member palette and identity metadata
public/                current approved assets; preserve all original images
scripts/architecture/  read-only audit and enforceable architectural boundaries
```

**Allowed dependency pattern:** feature → shared public primitives / typed contracts → authenticated API **over HTTP**. Features must never import `app/page.tsx`, import API route implementations, or directly reach into another feature's private UI implementation. `shell/` must not import the internals of Lounge, parliament, images, or games. Only the application coordinator decides which feature to mount.

Keep the exact original `Emblem compact` and each member's approved identity presentation. Assets are rendered in their current locations and colours; never infer permission to redraw or move them from a code-only refactor.

## 3. CSS and art isolation

- Design tokens (`--serif`, `--sans`, shared colours), resets and genuinely shared typography remain global.
- Each feature owns its main stylesheet. In Phase 1, original homepage and photo archive CSS declarations were copied **without modification** into `home/home.css` and `photos/photo-archive.css`, with their earlier global declarations removed. Existing responsive rules and palette overrides retain their original content.
- Remaining global selectors are **legacy debt**. Next phases should migrate one domain at a time to explicitly scoped CSS (or CSS Modules), preserving computed styles and media breakpoints. Avoid blindly prefixing or reordering all rules at once.
- Lounge approved 2D/3D art is not a byproduct of CSS migrations; no new lighting, brightness, camera position, asset filenames or image edits.
- Original Apple/Safari and narrow-screen visual verification is mandatory before merging each CSS migration.

## 4. Loading isolation & resilience

Phase 1 retains eager loading for the lightweight homepage and canonical identity data, while the **family gallery and book archive** are lazy-loaded only on navigation. A neutral `FeatureSuspense` wait state prevents pulling these large components into the initial client bundle. Their existing API fetches run after a feature is mounted.

Next steps: code-split the actual parliament view, Lounge rooms, mini-game engines, art-heavy interactive props, and future Library Lab. The page coordinator must not import every 3D scene at initial login. The transition/runtime layer must handle readiness, cancellation, fallback, reverse navigation, and skip **without showing unloaded scenes**. Only skip a visual transition after the destination is ready; never silently skip the mandatory briefing gate.

A code-split module should get its own error boundary and retry path before being used on low-reliability networks; this will be part of subsequent runtime work.

## 5. Authentication, briefing and permissions

- Keep `/api/member-session` authenticated and preserve server-side authorization for every private endpoint.
- A **fresh**, schema-validated, identity-verified briefing must be shown and acknowledged before the site shell mounts. Loading or failed briefings may offer Retry but never "Enter Without Briefing." This rule also applies to restored sessions and external mini-game returns.
- The current Lounge whitelist is **amberina, zxy, truth**. Unauthorized logo clicks are inert (no action, sound or animation), and server-side access checks remain decisive.
- Refactors cannot weaken CSRF checks, privacy controls, vote permissions, or private photo access.
- UI feature boundaries do **not** create database isolation; the API/service must remain authoritative.

## 6. Data boundaries and deployment safety

- Each domain has its own typed API contract; only authenticated server operations may mutate D1 records.
- Parliament is especially sensitive: split its **UI / workflow / database contracts** in its own PR. Preserve transactional boundaries, vote idempotency, audit records and legal stage transitions. No schema migration is part of Phase 1.
- Keep preview Worker, preview D1, and production Worker/D1 separate. New D1 migrations must be verified first on isolated preview and through backup/restore rehearsals.
- No approved staging/preview PR is automatically a production deployment authorization. UI approval does not authorize unreviewed data or routing changes on `main`.
- The module refactor is delivered as stacked draft PRs. Verify tests, build, permission smoke tests, visual screenshots and rollback feasibility before requesting a merge.

## 7. Asset strategy and quotas

`npm run audit:assets` performs a **read-only SHA-256 inventory** of images/audio/3D models in `public/` and `app/assets`, detecting exact duplicate content and reporting largest files. It never deletes, converts or re-compresses approved artwork. Near-duplicate artistic variants are intentionally retained.

For the future Library Gallery, store master art and derivatives in external object storage (e.g. Cloudflare R2) with content-addressed hashes, versioned metadata and explicit creator permissions. Store only indexes/refs in D1. Use responsive preview derivatives and lazy fetching; avoid committing every full-size concept art variant into GitHub. Estimate quotas before activating any paid storage. Never auto-delete unused-looking originals.

## 8. Staged delivery and acceptance

| Stage | Scope | Acceptance |
|---|---|---|
| **1 — foundation (this PR)** | Home, photo, archive, emblem data extraction; two CSS domains; route union; photo/archive JS split; architecture guard and read-only asset audit | Existing API/game/briefing tests, strict build, no artwork or DB changes, full layout comparisons |
| **2 — CSS + core runtime** | Finish CSS ownership, generic Scene Runtime, camera/animation lifecycle, navigation restoration, safe chunk load/error/retry | Room and page visual parity; click-to-skip, reverse, mobile, unavailable-resource fallback |
| **3 — parliamentary architecture** | Extract parliament UI from page, define workflow and service contracts, modularize large API route without altering decision rules | Existing voting/CSRF/idempotency/audit tests, D1 isolated previews, committee roles unchanged |
| **4 — Lounge + games** | Isolate room entry, props, private scenes, save/rankings adapters, dynamic game registries and resource budgets | Per-member access tests, original interactions and asset fidelity; no new eager imports |
| **5 — Library + comms** | Integrate reviewed Work Library Lab through an adapter and object-storage gallery; replace communications placeholder when specified | Independent artwork and content revisions, access controls, storage quota and backup acceptance |

**No stage is represented as complete until its code, automated checks and user-approved visual behaviour all pass.** An approved UI screenshot and an architecture code refactor are separate sign-offs.

## 9. Developer workflow

```sh
npm test
npm run build
npm run test:architecture
npm run audit:assets -- --json
```

`scripts/architecture/check-boundaries.mjs` blocks feature-to-page/API cross-imports and prevents `page.tsx` and `globals.css` from silently regrowing past their current migration budgets. When a phase legitimately changes these budgets, update them with a measured reason and a passing regression test; never quietly disable the check.

This document, not an automatic bulk migration, is the safe route for implementing the complete Schicksal 2.0 architecture.
