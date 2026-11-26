# Preview PR inventory — 2026-11-27

Scope: all 25 repository PRs, verified via Git comparison against previously deployed `ab06de953d57ea73f89519b1fe2b2a66352f8478` (isolated UI preview deployment run 45879999123). Production main remains untouched.

- PRs 9–25: all 17 exact heads are ancestors of the deployed candidate or the candidate itself. Review current cumulative behavior, not each superseded intermediate implementation.
- PRs 1, 2, 3, 5, 7, 8: merged into main; all six actual merge commits are ancestors of the preview. PR 7 historical Atlas implementation is intentionally gated by the later owner-approved placeholder in PR 18; do not re-enable old art just to count it.
- PR 6: explicitly visually rejected; exclude.
- PR 4: diverged legacy foundation. PR 12 selectively ported authentication, migration authority, database protection and recovery; PRs 10–11 implemented archive/module extraction using the current layout. Never merge the old branch or its conflicting 0012 migration. The current preview follow-up selectively carries the remaining cello error guard, readonly potion input types, observatory metadata type, checked migration/generation CLI aliases, and real anonymous-entry test (replacing obsolete starter meta assertion). Older archive-specific exact markup fixtures and automatic all-test discovery/strict whole-project typecheck remain engineering QA work, not separate features to deploy. Do not claim those have passed.
- Browser acceptance run 45879999123 failed on a zero-height main wrapper with a fixed-position briefing child. The corrected browser assertion separately requires the gate wrapper to be attached, the dialog to be visibly displayed, and the sidebar to be absent. This is a test correction, not proof of a browser pass.

No production merge, deployment or remote production migration. No art replacements, no old Atlas reactivation, no prototype branch import. Preview data only.
