# Schicksal 2.0 — Full-site architecture, identity, security and performance audit

**Date:** 2026-11-20 (Singapore)  
**Scope:** GitHub tracked tree and source on the PR #13 baseline, plus iterative PR #14 changes and GitHub CI. 428 tracked blobs, application/Cloudflare API routes, schema/migrations, test coverage, CSS and assets were inspected. **No live user-session Safari timeline, deployed bundle transfer size, browser heap profile, real D1 query latency, R2 bill or production restore was measured**; storage footprint must never be misrepresented as a web page's memory use.

**Implementation:** [PR #14](https://github.com/ShenLixin357/Schicksal/pull/14), stacked on [D #13](https://github.com/ShenLixin357/Schicksal/pull/13), stacked on [C #12](https://github.com/ShenLixin357/Schicksal/pull/12). All Draft. Neither source artwork nor site CSS changed here. Nothing was deployed or merged.

## 1. Public identity, president and Lodge boundaries

The site historically had separate hardcoded identity/color files: `app/citizens.ts`, Atlas's own `ATLAS_APPEARANCE`, `sharedColors`, briefing wave/backdrop palettes, the home procedural ray order, the score page, and private Lounge magic marks. The current presidential seat was also recorded both in `citizen.office` and the Atlas office list.

**Changes in E:**

- `app/identity/visual-registry.ts` owns the stable **public** eight-member representative, home-ray, website-mark and official-mark colors; approved PNG paths; the approved Atlas shared emblem image; and **three separate existing decorative palettes**. Public display shades and member representative colors intentionally differ (notably Amberina #F3ED87 official and #EECF58 on ivory pages). Decorative palette indices are **not** member IDs. A future color or asset replacement can be reviewed from one place without silently altering art in other contexts.
- `app/identity/public-mark.tsx` is the reusable **public citizen mark** renderer; it accepts `display="web" | "official"`, reads approved asset/color metadata and adds the presidential halo by **office**, not by member ID. Fallback vector paths preserve the approved original non-image marks.
- `app/emblem/compact-emblem.tsx` is the reusable compact/ceremonial eight-ray mark used in navigation, login, briefing and public identity contexts. The home 3D sculpture remains `app/emblem/hero-emblem-sculpture.tsx` and uses `EMBLEM_BLADES`; the Atlas uses approved `PUBLIC_EMPIRE_ASSETS.atlasEmblem`. Their shapes are different; one visual asset change does **not** magically repaint the entire 3D/model/illustrated scene.
- `app/identity/public.ts` is a lightweight **data-facing import contract** for a new Library, gallery, government or community module. For React marks import the two standalone components directly, so data-only modules do not pull in Next/Image or scene UI by accident.
- `app/identity/office-registry.ts` is the single **current static office assignment baseline**. `isCurrentPresident(id)`, `officeHolders("president")`, `currentOfficeLabel(citizen)`, and `withOfficeHolders(snapshot,...)` establish office-based rendering and **pure**, non-persistent election simulation; no account ID, mark, color, password, member save or Lounge persona is changed by an office transition. The Atlas and Home pulse now use this registry. Legacy `Citizen.office` remains only for backward-compatible fallback: new modules must not use it as election authority.
- `app/club/lounge-access.ts` and `app/club/mystic-marks.tsx` retain private **Lounge** names, masks and magic graphics, including their owner-specific palettes. A public emblem edit or presidential change must never automatically edit Lounge content.
- Existing legal/historical texts (e.g., the 2026 restoration referendum) are history, not dynamic office-holder badges. They should remain unchanged when a future President takes office.

**Important: elections are NOT implemented in PR #14.** At present the presidency still has a static approved holder. A real election needs a separate D1 term/history model, authenticated result certification, date-effective office snapshots, auditor records, committee/governance permission review, caching/refresh rules, expiry and rollback. Parliamentary **speaker** elections are *not* the Presidency election. Current server controls such as `isStageManager` in `app/api/parliament/route.ts` and account settings access in `app/api/member-access/route.ts` are deliberately tied to current technical/committee permissions and must **not automatically follow the President**. What rights transfer on election is a policy decision, not a renderer concern.

### How to add a new public Library feature

1. Keep the scene art and private data under its own `app/library/` module; code-split it as a feature. Do not import `app/page.tsx`, API route implementations, or Lounge internals.
2. Import `CITIZENS`, `getPublicMemberVisual`, `EMBLEM_BLADES`, `officeHolders`, `isCurrentPresident`, `PUBLIC_EMPIRE_ASSETS` from `app/identity/public.ts` (or their lightweight owner file). Render existing marks using `PublicCitizenMark` and `CompactEmpireEmblem` when suitable, instead of copying SVG paths, colors or member artwork URLs.
3. When a new public mark, emblem asset or color is *approved*, add its versioned file and update the public visual registry once. Review web/official variants separately. Preserve the old file for intentional rollback until explicitly authorized to remove it.
4. The Library does not get member permissions by importing visual metadata. Use authenticated server API contracts with member-scoped authorization; store gallery files in object storage with content hashes and D1 pointers/metadata. Backup metadata **and bytes** together. Private manuscripts/reader drafts must not be made public by the Gallery index.
5. A Library UI must distinguish archival **office history** from live current-office rendering. It must never infer presidential succession from a personal alias or an HTML badge.

## 2. Resource, network and memory audit

**Tracked Git object sizes (not CDN usage, bandwidth or browser RAM):**

| Group | Files/amount |
|---|---:|
| Repository tracked blobs (single tree) | 428 / **109.50 MiB** |
| `public/` static resource files | 104 / **106.87 MiB** |
| `public/games/` | **42.36 MiB** |
| `public/games/insaniquarium/source/insaniquarium-source.tar.gz` | **24.73 MiB** |
| Eight versions of `public/mafraer-ice-bedroom-*.png` | **25.16 MiB** |
| `public/` PNG payloads | **58.17 MiB** |
| `public/` BIN payloads | **11.18 MiB** |
| `public/` WASM payloads | **9.80 MiB** |
| All tracked CSS source files | 27 / **~499 KiB**, largest `app/club/lounge-scenes.css` **~158 KiB** |

A browser does **not** automatically download all 106.87 MiB on first navigation; which bytes are requested/cached is a separate browser-network measurement. Compressed image storage size is also not decoded texture memory (GPU/canvas allocations may be larger).

**Implemented:** `scripts/architecture/audit-assets.mjs` now inventories **every** `public/` payload (including WASM, BIN, ZIP-like and compressed source archives); reports exact SHA-256 duplicates, large files and bytes by extension. It streams 256 KiB buffers when hashing instead of reading every large file entirely into memory. It is read-only and intentionally does **not** delete apparently redundant assets.

**High-payoff opportunities requiring a separate verified resource PR:**

- Determine whether the native Insaniquarium source TAR is needed at a **public web path**. It consumes 24.73 MiB and may be better retained as an internal source artifact/release asset, but must not be moved without checking build scripts, import/link compatibility, and original-game reproducibility.
- Inspect actual references for older `mafraer-ice-bedroom-v1/v2/v3` images. Do **not** delete artistic variants based on names, approximate similarity or file age; archive them in future Library Gallery/object storage only after a verified mapping and author approval.
- Store future original Gallery art, PSD/Procreate exports, 3D meshes and high-resolution derivatives in content-addressed object storage (such as R2), not unbounded `public/` Git commits. D1 should store permissions/metadata/object refs, not image blobs. Deduplicate by exact content hash; keep intentional edited versions and originals.
- Use small responsive previews in galleries, load full-resolution images only on open, and check Cloudflare quotas/billing before enabling user uploads.
- The 158 KiB old Lounge CSS remains globally imported from `app/layout.tsx`. Splitting it into feature-owned styles, and especially CSS selector scoping, requires **visual** verification because source order/shadow/glow/camera rules are approved; avoid wholesale refactors. A CSS file's source size is not its actual transfer size.

**Implemented runtime change:** Atlas + government handbook React code now lazy-loads on navigation. Lounge room polling pauses when the tab is hidden; when it becomes visible, it refreshes, and obsolete requests are aborted. Existing 3.5s chat / 15s idle polling remains for visible users. Future improvement: measured payload size, debounce/conditional refresh, per-feature limits and WebSocket/push only if eight-member usage justifies complexity.

## 3. Data, security and deployment audit

- **Critical migration debt addressed in E:** `app/briefing/inbox-schema.ts` previously executed `CREATE TABLE`/index on HTTP requests. The new sealed additive `drizzle/0014_briefing_presence.sql` creates existing `briefing_archives` and `member_presence` tables/index with their same shapes and **preserves** rows on already-initialized D1 databases. Drizzle models `db/schema.ts` and the sealed history match. HTTP now checks readiness with SELECT only.
- **Deployment order matters:** `0014` must first be verified and applied to an **isolated** D1 copy, preserving archived-task counts and online-state rows; then run the runtime. A runtime published before the migration will fail closed on fresh installations. Production schema/data was **not** changed.
- The C-backed Parliament schema remains on `0013`; direct member correspondence remains on `0012`. No prior migration SQL hashes were rewritten.
- Server API ownership: member sessions are authoritative for Parliament, photo archive, Lounge chat/vase, music, games and messenger. Some existing callers additionally send a claimed member header for mismatch detection; that header is **not** a grant of privileges.
- **Existing policy requiring review:** `app/api/photos/route.ts` currently permits any authenticated member to delete other members' photo archive entries. This was deliberately retained from the old workflow; decide whether future shared Gallery needs owner/editor/admin restrictions plus trash/retention before merging a new Library module.
- Parliament API remains an unusually large `app/api/parliament/route.ts` (~43 KiB), with client/server workflow, speaker, stage and D1 queries partly coupled. Split into transaction/authorization/domain services only with vote-idempotence, timeline and full audit-log regression; do not couple technical admin authority to `president` just because President badges move.
- Review `sameOrigin` policy, request size limits, per-member auth and redirect/upload headers as security hardening. Avoid a blanket CSRF or permission behavior change without test coverage and user sign-off.
- A full production restore must include D1, R2/image/music object bytes and checksums; the C backup/restoration tool is not evidence that a **coherent live** production snapshot has already been captured or restored.
- The private messenger, member password changes and session termination have separate existing API contracts. Do not put private data into identity display registries, client caches, public Library Gallery or build artifacts.

## 4. Suggested priority queue (separate from current PR's done work)

| Priority | Issue | Current disposition |
|---|---|---|
| P0 (release gate) | Isolated D1 migration + coherent object-store restore for C/E; verify actual Cloudflare Worker binding and direct Wrangler deploy | **Pending**, no production write |
| P0 (release gate) | Authenticated user/browser Safari screenshots, mandatory briefing and private member access | **Pending** |
| P1 | Public identity and office duplication | **Registry + shared renderers implemented in E**; election data persistence is future work |
| P1 | Runtime DDL in Briefing and presence | **Replaced by 0014 migration / SELECT readiness in E**, pending isolated D1 application |
| P1 | Bulk public assets / exact duplicates | **Full inventory implemented**, no deletion |
| P1 | Global legacy Lounge CSS, risky selectors | **Documented**, require staged visual pass |
| P1 | Shared Gallery/photo delete rights, retention/versioning | **Existing permissions preserved**, policy decision needed |
| P2 | Parliament API/service decomposition | Pure routing policy started in D; remaining isolation requires transaction tests |
| P2 | Browser first-load transfer & decoded textures, mobile memory, slow-network CSS/scene loading | **Not measured**; use browser devtools/Work cloud browser and realistic Safari |
| P2 | Future President elections, appointment/terms/history | Pure UI snapshot model exists; official election workflow **not implemented** |
| P2 | Future Library integration, asset dedupe, multi-member art contributions | Contract defined; actual Library modules/R2 workflow not implemented |

## 5. How to review and roll back

- Inspect [PR #14](https://github.com/ShenLixin357/Schicksal/pull/14) independently, comparing it to the previously green [PR #13](https://github.com/ShenLixin357/Schicksal/pull/13). No `public/` art or CSS was changed intentionally in E.
- Run `npm test`, `npm run build`, `npm run db:check`, `npm run test:identity-architecture`, `npm run audit:assets -- --json`. New and old CI must pass on the latest commit; success is necessary but not sufficient.
- Inspect the Login → Welcome → mandatory Briefing → Home → Atlas → Parliament → Lounge flows. Verify approved contrast, white/yellow distinction, historical Palace art, Safari compact mark, alternate member identity badges, and hidden/private records.
- Test a **pure** office snapshot switch in unit tests (current President Amberina → candidate zxy), confirming halo/office labels change while representative color, login account, archived events and Lounge masks remain untouched. Do **not** claim the real election has happened.
- To abandon E, leave PR #14 unmerged and return to PR #13. No down-migration or art restoration is needed because no production changes have occurred.
