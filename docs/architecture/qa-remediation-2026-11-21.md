# Schicksal QA remediation · Draft PR #21

Status: **REVIEW ONLY / NO-GO for production**. Base is Draft PR #20, which itself stacks #19 and previous UI work. Do not merge, deploy, mutate production D1, or delete production photo objects. Approval requires the owner and a verified production backup.

## Approved photo governance

- Any authenticated member can list active photos and upload originals. The user-controlled `uploaderCitizenId` JSON field is intentionally ignored; ownership comes only from the authenticated session.
- A photo uploader may edit title, description, era, date and subject tags, and move **their own** active photos to the recycle bin.
- The site owner (`amberina` authenticated member account) may edit or recycle any photo, enumerate trashed records, and restore them.
- The normal listing excludes trashed rows; trashed image bytes return 404 for non-admins. All photo HTTP responses should be private and no-store. No member has a permanent-delete endpoint.
- A recycle operation changes only D1 `deleted_at` and `deleted_by_citizen_id`. **Original object bytes and object keys remain in private storage.** The owner restore path first checks that the object exists. This prevents the previously identified object-delete-first inconsistency.
- `0015_photo_recycle_bin.sql` is additive. It must be applied to an isolated D1 environment before preview deployment. Existing records remain active after migration. Do not add request-time DDL.

## QA status and boundaries

| ID | Work in this PR | Remaining release gate |
|---|---|---|
| QA-01 | Soft-delete + restore; no storage DELETE on routine photo deletion | Prove isolated object outage, orphan upload recovery and backup restore |
| QA-02 | Authenticated uploader/owner permissions checked server-side; UI edit/trash/restore | Cross-account browser E2E, accessibility and policy approval |
| QA-03 | Cast-vote guarded by one SQL INSERT…SELECT; resolution tally computed inside a stage UPDATE | Verify actual D1 concurrency/interleaving in isolated environment |
| QA-04 | Stage update, system comment and audit event moved to one D1 batch with unique transition token | Fault-injection test plus audit remaining multi-step actions |
| QA-05 | DELETE session returns 503 on D1 revoke failure; frontend redirects only on HTTP success | Safari/Chromium offline and intercepted DELETE testing |
| QA-06 | **Open**. Same-origin imported game iframes still have parent-document capability | Isolated game origin + signed game-only identity, or compatibility-proven sandbox; do not blindly enable an opaque-origin sandbox |
| QA-07 | Bounded manifest checks, retries, iframe load watchdog, user-visible recovery | A child-frame `onLoad` is NOT proof of WASM or dynamically loaded script readiness. Verify script/asset failure paths and add trusted game-ready handshake if needed |
| QA-08 | **Open**. Source checks do not prove the running Worker SHA | Read actual Cloudflare preview deployment metadata and compare full commit hash to PR #21 HEAD |
| QA-09 | Sealed additive migrations + in-memory SQLite migration tests | Isolated Cloudflare D1 + disposable private object storage backup→migrate→restore→hash/count comparison |

## Mandatory real-browser run

1. Prove preview worker SHA matches this branch; do not test an unverified old preview as if it were this PR.
2. Safari/WebKit and Chromium: login → Welcome → mandatory briefing → sidebar (248/200/64px) → Archive.
3. Using **disposable** member A and B sessions, verify B can see A's photo but cannot PATCH/DELETE it (403); A may edit and recycle it; B cannot see trashed bytes; owner may enumerate trash and restore original bytes. Ensure no real family photo is changed during tests.
4. Logout with server DELETE returning 500 / network unavailable: signed-in view remains, warning appears, token is not falsely reported revoked. Successful logout must revoke the server token.
5. Parliament: conditional cast vote, vote vs resolve collision, retry, audit failure injection; the final tally and audit must match the official stage.
6. Lounge/Chryser/Game Room: Forest Temple 1–6 and Aquarium start/return through the in-app overlay, same member session persists; simulate failed HTML/JS/WASM/manifest; verify retry/exit works.
7. Check game iframe origin isolation and the legacy storage/localStorage/WASM compatibility **before** changing the sandbox policy.
8. Compare UI screenshot and click rectangles with original site at identical Safari zoom/viewport; verify #20 icon sidebar and all previously approved artwork remain untouched.
9. Only on a disposal/isolated Cloudflare environment, rehearse D1 migrations 0013–0016, member permissions, object-store restoration and photo checksum preservation. Keep sanitized evidence; never write production.

## Operational restrictions

- Never invoke `npm run deploy` or `db:migrate` against production as part of review.
- No automatic object garbage collection of trash is enabled. Permanent removal needs a separate retention policy, durable recovery window, audit/event ledger, and explicit owner approval.
- `drizzle/history.json` seals 0015 and 0016; never edit older sealed migration SQL.
- CI jobs provide unit/integration/build evidence, not browser sign-off or a live Cloudflare deploy fingerprint.
