# V3.2 review handoff — 2026-11-28

This is a development branch, not an activated release. R5 and the earlier V3 commits are retained. The existing repository ZIP is the canonical cumulative source; no re-upload.

## Local assembly
Use an authenticated checkout of the private repository on feature/imperial-v32-review. Run `bash integration/imperial-v3/integrate-v32-local.sh`. If it stops, retain the candidate worktree and resolve conflicts; never force reset or use wholesale ours/theirs. Expected overlaps include page.tsx, library-section.tsx, catalog/mount.js and technology-ministry.tsx. Remove the old DiscoveryToast mount, retain PersonalDiscoveryToast with identity, retain R5 loader/scene controls/A hover and both book and archive integrations. Keep page coordinator within its prior size budget. Expose Gallery B from the collection navigation rather than adding back R4's in-scene overlay; private workspace remains personal-page placeholder.

## Activation boundary
- Review proposal SQL is not an active migration. Apply only to isolated test DB after canonical schema and explicitly verified backfill. Public review views fail closed for unregistered versions. Verify every list/search/asset/detail/history read path and storage permissions before enabling gallery. Check valid image decode and quotas; new citizen upload candidate handles image originals only. Test legacy admin upload UI compatibility, thumbnails, title revisions and notifications. Existing approved content must remain visible after backfill.
- fullReviewReady deliberately returns false: book/digital submission and rendering, original authorship distinct from editors, public slot runtime reuse, AVS custom rendering and exclusive binding still need integrated work. SQL and API foundations are not end-to-end feature completion.
- Basic exploration excludes retired R4 controls; strong wind, broom flight and orb rotation classified hidden provisionally. Timed event and achievement progress arithmetic is implemented; actual authoritative event/achievement registry integration is pending. Never treat cosmetic client events as reward entitlement. Future point redemption and BGM are not enabled.
- Ministry review queue, previous policy/monitoring modules and audit history retained; full notifications, card odds management and backup/restore operational validation remain outstanding.
- No AI provider, Actions, production writes, R2 provisioning, or release.

## Verification
Run the exact-source preflight, npm ci, npm test, npm run build, and repository artifact validation where available. Run the proposed SQL on temporary SQLite or isolated D1, test citizen vs current minister vs stale term, rejection and rollback, old approved versions, direct asset visibility, slot ownership, same-slot display exclusivity, and browser flows. Preserve the old branches, commit/push only the review branch after tests; report conflicts/build results precisely. Do not deploy without approval.

Local evidence from this session: 11 SQLite scenarios using canonical proposed table schemas and captured review SQL; four exploration-progress logic tests. R5 previously passed six mock checks. No full app build, real Cloudflare D1 or authenticated browser acceptance in this session.
