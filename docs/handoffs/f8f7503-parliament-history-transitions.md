# Schicksal handoff — Parliament history and skippable passages

Date: 2026-11-27 (Asia/Singapore)

## Safety status

- Work is isolated on `fix/parliament-history-transitions`.
- `main` was not merged or modified.
- No Cloudflare Worker was deployed.
- No production D1 database, R2/Supabase storage, account, secret, member record, photo, chat, save, or Lounge artwork was modified.

## Git identity

- Baseline branch: `feature/no2-garnet-identity-20261122`
- Baseline commit: `90176ab19b29b386dd17191268a1c280425bb89c`
- Local candidate commit: `f8f75038a19e88c66c267dd23c5c3f6866a192b4`
- GitHub equivalent candidate commit: `9bd2fbfaaa131e023eaa7635dae3f8060b6704eb`
- Candidate tree SHA (local and GitHub): `7dd4f770e245dbb9b495cad10cc6d5373d8d4f69`

The local and GitHub commit hashes differ because the authenticated GitHub API recreated the commit object after command-line Git lacked credentials. Their complete file trees are byte-identical, proven by the matching tree SHA above. The local commit remains available in the originating workspace; the GitHub branch is the durable handoff.

## Delivered scope

1. Opening and Committee Lounge visual transitions use the same click/tap-to-skip rule without visible Skip text.
2. Reduced-motion users bypass visual motion while resource readiness remains independently enforced.
3. If the Lounge code or scene image is not ready, skipping stops the animation, keeps the source view available, and enters only after the required resource is ready; repeated clicks and late loads cannot double-swap.
4. Parliament text versions are preserved by additive migration `0020_parliament_document_versions.sql` and guarded database triggers.
5. Direct official edits and accepted amendments use compare-and-set updates and record the resulting text version atomically.
6. Ballots remain bound to the exact document version presented to the voter.
7. Authenticated document-history reads expose retained versions for a future Parliament UI without redesigning the current UI.
8. CI explicitly checks out and records the reviewed PR head SHA so review and acceptance refer to one commit.

## Modified and added files

- `.github/workflows/schicksal-safety-review.yml`
- `app/api/parliament/route.ts`
- `app/club/committee-lounge.tsx`
- `app/club/lounge-access.ts`
- `app/entry-screen.ts`
- `app/entry.css`
- `app/page.tsx`
- `app/parliament/parliament-section.tsx`
- `app/transitions/lounge-passage-controls.css`
- `app/transitions/lounge-passage.tsx`
- `app/transitions/passage-gate.ts`
- `db/schema.ts`
- `drizzle/0020_parliament_document_versions.sql`
- `drizzle/history.json`
- `package.json`
- `tests/migration-authority.test.mjs`
- `tests/parliament-document-versions.test.mjs`
- `tests/parliament-speaker-api.test.mjs`
- `tests/passage-gate.test.mjs`

This handoff document is a separate documentation-only child commit and is not part of the candidate tree listed above.

## Tests completed

### Exact candidate content after the final interaction cleanup

- `npm run test:shell` — passed: 9/9.
- `npm run test:parliament` — passed: 11/11.
- `npm run db:check` — passed: 21 ordered migrations and query models verified.
- Targeted ESLint for `app/transitions/lounge-passage.tsx`, `app/transitions/passage-gate.ts`, and `tests/passage-gate.test.mjs` — passed with no findings.
- `git diff --check` — passed before commit.

### Immediate precursor with the same database/API design

- `npm test` — completed successfully across the repository before the final focus-only cleanup.
- `npm run build` — completed successfully with Vinext/Vite before the final focus-only cleanup; all page and API routes built.
- Migration, architecture, identity, backup/restore, privacy, game, Lounge, cello, asset, visual-regression, and sidebar groups passed in that full run.

### Known lint baseline

- Full `npm run lint` is not green on the baseline: 581 findings (49 errors, 532 warnings), mainly pre-existing React-hook findings in older cello/briefing code and third-party game sources.
- This task did not broaden scope to rewrite those unrelated modules.

## Tests not yet completed

- A second full `npm test` on the committed SHA was started but interrupted after about six seconds by the handoff request; it did not finish.
- A second full `npm run build` after the last focus-only cleanup has not been run.
- GitHub Actions results for the independent branch have not yet been observed.
- No authenticated browser acceptance test or isolated Cloudflare preview deployment has been run.
- Migration `0020` has not been applied to any remote D1 database, including preview or production.

## Migration and release notes

- `0020_parliament_document_versions.sql` must run strictly after sealed migration `0019_technology_credential_tenure.sql`.
- Do not edit or reorder any earlier migration, including `0011_committee_vase_history.sql`.
- The migration backfills only the current text known at migration time. If a proposal is already at version 3, versions 1 and 2 cannot be reconstructed and must remain explicitly unavailable.
- New inserts and later sequential text revisions are captured by triggers. Text cannot be changed without incrementing the version exactly once.
- Existing ballot rows keep their historical `document_version`, even when a pre-migration body is unavailable.
- Before any remote migration: create and verify a production backup, restore it into an isolated local database, rehearse all migrations there, verify counts/integrity, and stop on any mismatch.
- Deploy runtime code and migration only under a separately approved release plan. Do not let runtime requiring `0020` reach production before the migration readiness check passes.

## Remaining issues and next safe steps

1. Observe branch CI and confirm both jobs report the same reviewed full SHA.
2. Re-run `npm test` and `npm run build` on the remote candidate tree or an exact checkout.
3. Rehearse `0020` on an isolated copy of production data; verify current proposals, old vote version numbers, new revisions, and rollback behavior.
4. Perform a private preview acceptance test for: first opening skip, replay skip, slow Lounge load, repeated click/tap, reduced motion, direct text edit, accepted amendment, history read, stale edit, and stale ballot.
5. Keep the future Parliament redesign and bulk bill replacement separate. The new history API can power a future version viewer without coupling stored text to the replacement UI.
6. Do not merge to `main`, deploy production, or migrate production without a new explicit approval after all gates above pass.
