# Lounge game records

All five current Lounge games share the member-specific **月光成绩簿**. The main Lounge toolbar and each game open the same board, with separate difficulty selectors where applicable.

| Game | Boards | Personal best / ranking |
| --- | --- | --- |
| Lounge Solitaire | Classic draw-one | Completed games; fewer total operations, then less active time |
| Potion Sort | Apprentice / Alchemist / Oracle | Completed games; fewer total operations, then less active time |
| Jade Sigils | 4×4 / 5×5 | Completed games; fewer total operations, then less active time |
| Relic Merge | Classic | Higher score; equal scores share a rank |
| Ember Echo | Classic | Higher score; equal scores share a rank |

Undo counts as an additional operation. Pausing, opening the records dialog and hiding the game suspend its active clock. A completed puzzle freezes its recorded duration. Records use whole seconds. New games and restarts create a new run identifier.

## Identity and persistence

- Stable citizen IDs `amberina`, `zxy`, `truth` own records. Mask names come from `committee_club_profiles` at read time, so renaming a mask retains its history.
- `/api/member-session` verifies the existing member login on the server, issues a random 12-hour HttpOnly SameSite cookie and stores only its SHA-256 hash. HTTPS adds Secure. Logout revokes it. Login attempts are rate limited.
- Production may configure `SCHICKSAL_MEMBER_PASSWORDS` as an ID-to-password JSON secret, or `SCHICKSAL_SITE_PASSWORD`. The existing shared login remains the fallback for backward compatibility. Selecting an identity with that shared password is the existing trust model; this is not a claim that each member already has distinct credentials.
- `/api/lounge-games` derives the actor from that session. An explicit member header must agree, so a queued result from another tab/member cannot be assigned to the newly logged-in member. Client-supplied member IDs and rank fields are ignored.
- Migration `0006_mysterious_morlocks.sql` adds session, login-rate-window and best-record tables. No request handler performs DDL. A unique game/board/member key plus conditional atomic UPSERT keeps the best result regardless of retry order. Equal or worse results cannot overwrite it.
- Saves, personal-best caches and an offline outbox are partitioned by member. Scores first enter the outbox; successful acknowledgements remove only the matching submission. Newer pending results survive old responses. Online/focus/page-exit events and the manual sync button retry synchronization. Existing anonymous local saves are left untouched rather than assigned to a random member.
- Results are checked against the actual game engines, card inventories and completion rules. This rejects malformed or unfinished puzzle results. It is result-state validation, **not** a tamper-proof replay or competitive anti-cheat system.

## Verification

- `npm run test:records`: 14 tests covering all five result policies, real migrations, record comparisons, rank ties, actor/mode isolation, live mask-name joins, cookies and the actual HTTP route handlers against an isolated D1-compatible SQLite database. Route tests use temporary generated credentials and never real accounts or production scores.
- Existing minigame tests: 13 passed. Existing Solitaire tests: 5 passed.
- Client and server changes are checked separately with DOM / generated Cloudflare types. A framework build and artifact validation run before packaging.
- Internal browser preview checks the Lounge entry, records tabs/difficulty controls, game controls and completed-game personal-best feedback. Production records require a normal member login; the development preview shortcut intentionally does not create a server session.

## Independent hosting status

The existing source, assets and database are retained. Cloudflare registration is blocked by that website's human-verification screen in the cloud browser. No new Cloudflare account was created, and the site has not been migrated to a user-owned Cloudflare account. Registration, password setup and email verification must be completed by the owner before an independent deployment can proceed. No registration email or credentials are stored in this repository.
