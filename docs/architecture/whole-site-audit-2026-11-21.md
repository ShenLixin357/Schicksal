# Schicksal · 全站回归审计 / End-to-end test charter
**Date:** 2026-11-21  
**Basis:** Latest stacked Draft PR #19 (built on #18, #17, #16); none merged to `main`.  
**Safety:** Isolated `schicksal-ui-preview` Worker + isolated preview D1 only; never run mutation tests on production accounts, D1, Supabase, or live citizen records. Do not expose login secrets, cookies, member data, or image masters in logs/screenshots.

## 1. Incident: arcade → Lounge unexpectedly restarts login

**Confirmed source defect before J:** `GameRoom` linked to `/games/fireboy-watergirl?from=game-room` and `/games/aquarium?from=game-room` using full-page `<a href>`. Standalone "返回游戏室" linked to `/?lounge=game-room`. Consequently both entry and exit unmounted the authenticated React shell. The root `Home()` always begins in `opening` and performs independent member-session verification and a fresh mandatory briefing. A separate route-return hint cannot restore prior state. `ChryserLounge` independently linked to `/games/aquarium`, with the same failure mode. `FeatureSuspense` on lazy chunk failure offered only `window.location.reload()`, causing another unwanted full-entry sequence.

**What source does NOT prove:** whether the user's exact reported login screen resulted from a missing/expired session cookie, or from the forced full-entry/briefing sequence. This requires a real browser navigation trace; do not claim the cookie was deleted.

**Fix in J:** local state, lazy `EmbeddedArcade`, full-viewport portal, in-app return callback in both games and both source rooms. Independent standalone game URLs retained for direct visits; mandatory auth and briefing gate remain intact for true new entries. A failed game chunk shows a reversible button, and broken site features can return to Home without page reload. Imported HTML temple resources, aquarium WASM and artwork unchanged.

### Required independent E2E acceptance
From a real preview account, follow these paths in both Safari (macOS) and Chromium:
1. Sign in once; complete required briefing; enter Committee Lounge; open music box → Game Room.
2. Click forest ice/fire object → choose temple 1; interact with keyboard; click **返回游戏室**. Assert same game room appears without a new `/` document request, login page, Welcome or briefing; `GET /api/member-session` identity unchanged. No `POST`/`DELETE /api/member-session` occurred.
3. Repeat for temples 2–6, and at least one fullscreen launch / iframe focus / ESC interaction. A missing imported resource should show a controlled error or diagnostic, not sign out.
4. Click Game Room aquarium; interact, save if supported by isolated account; return; verify in-app state and session. Check for unsaved-data warnings where applicable.
5. Committee Lounge → Chryser's private room → clickable aquarium → return to the *same Chryser room*, without a full navigation.
6. Return to Committee Lounge by its actual UI. Test repeated fast click/close, rapid room switches, hidden tab/reopen, Safari back/forward, browser zoom, 390px viewport and `prefers-reduced-motion`.
7. Simulate blocked game chunk/404/fetch timeout while already signed in. Verify error boundary offers **返回休息室**; returning never reloads whole site.
8. **Negative session case:** explicitly expire/logout the isolated test session in a separate controlled test. A full new request must require authentication; do NOT bypass the Worker or briefings to make return look successful.
9. Record console errors, failed network requests, slow (>3s) transitions, route/URL change, visible overlays, screenshot before/after and whether the login cookie is retained. Never log the cookie value itself.

## 2. Whole-site modules and pass/fail contracts

| Area | Required check | Current source-level status |
|---|---|---|
| Authentication / privacy | 401 for anonymous pages, JS chunks, static art, documents and imported games; 403 for forged member headers; cookie scopes and 12h expiry; correct 401 on logout | Existing `tests/private-site.test.mjs` + extra game→return session test in J. Browser verification still required |
| First login / Welcome / mandatory briefing | New entry shows current, server-verified briefing; skip animations do not bypass authentication or the briefing; no duplicate login after in-app game exit | Existing CI covers authorization; new in-app route avoids unnecessary re-entry |
| Sidebar / navigation | 248/200/64px, font family/metrics, official personal mark placements, lounge/main palette, collapse, group expansion, phone action, icon/no-scroll overlays | Owner visual acceptance incomplete; safari screenshot comparison required |
| Profile / marks | 22 authorized placements (only Amberina's own ordinary sidebar strong), one 4.236:1 prism, original Simple PNG; public office dot follows current President, never login identity | Automated contract in #17/#18; pixel/contrast review pending |
| Atlas / unfinished artwork | Visible text menu item and text-only design placeholder; incomplete art and active module still gated | Implemented in #18; confirm no image/code appears through public route |
| Parliament | Seating, candidate & speaker election, debate, comment, amendment, vote, permissions, same-origin checks and duplicate/rapid submits | API unit coverage; browser flows and data-migration rehearsals pending |
| Committee Lounge | Distinct masks, member seats, chat, vase manual/random/history, fan/globe/fireplace/music box, tea, solitaire; overlays and click areas match scene art | Vase #18 CSS contract; actual Safari click traversal pending |
| Personal Lounges | Chryser aquarium return, cello/audio, Wordmage planetarium, Mafraer fan/observatory; cancelled transitions never leave overlays behind | In-app Chryser aquarium J; interactive visual, sound and reduced-motion checks pending |
| Imported standalone games | 6 temples (resources intact), two-player keyboard, fullscreen, screenshot/readable score, in-app return; 3D objects not degraded | Assets & tests available; real browser keyboard/focus test required |
| Aquarium / other minigames | Original WASM/asset hashes, saved game data, leaderboard owner constraints, no unsaved data loss on exit, retry after network timeout | API tests present; save-on-exit requires real-browser trial |
| Photo gallery / storage | 12MB limit, mime validation, stable metadata, upload/download/delete, no cross-member unauthorized deletion, no orphan files | **OPEN POLICY/CONSISTENCY RISK**: see below |
| Messenger / Library | Displayed placeholders must not masquerade as finished interactive features; disabled or unapproved screens stay safe | Not fully implemented; do not mark complete |
| Performance / delivery | Dynamic imports only when accessed, 3D pauses offscreen, no unbounded room polling, no iframe retained when closed, return doesn't replay onboarding | CI source checks; browser network/memory profiling pending |
| Accessibility & viewport | Buttons keyboard reachable; Escape/Tab and pointer capture work; high-DPI Safari/image detail, touch targets, no hidden clickable objects | Pending real E2E |
| Release / database | Restore trial before D1 0013/0014, artifact quota, protected production Worker, no unexpected production secrets/env use | Draft CI coverage; real isolated restore drill still necessary |

## 3. Confirmed open risks / decisions, not silently modified

**P0 — Photo delete authorization.** `app/api/photos/route.ts` lines ~165–176 explicitly allow any authenticated member to delete any photo. The right authorization policy (uploader-only vs owner/admin vs council) requires an owner decision. Do not alter it while performing read-only regression audit.

**P0 — Two-system delete consistency.** The same route calls `storage.delete(row.objectKey)` BEFORE deleting D1 metadata. If the subsequent DB delete fails, the metadata can point to a missing blob. Design a tombstone/soft-delete/retry or recovery policy and test with storage/DB fault injection against an isolated DB and disposable objects only.

**P0 — Site data and migrations.** No production C/D/E migrations, backup restore or account-role transfer exercised by these UI tests. Do not infer real data safety from static CI alone.

**P1 — User-approved design parity.** Sidebars still differ in structure from legacy `main` despite matching numerical width/font settings; compare same viewport, browser, zoom and font loading. Parliament official original-colour Simple at small comment icon size may appear faint; do not tint or regenerate the original PNG without separate owner consent.

**P1 — Public President office vs site admin.** Current `office-registry` is a static verified baseline; electing Parliament Speaker does NOT change President nor grant database/site administrator permissions.

**P1 — CSS stacking / interaction.** Previous bugs came from moving office insignia CSS into a lazy room and mismatch between the vase art and its invisible hotspot. Audit pointer-events/z-index/DOM ordering, portals, scoped styles and image coordinate alignment after every CSS split.

**P1 — Independent direct-game URLs.** They are still full page and re-enter site through normal gates when returning. This is intentional fallback behavior, distinct from Lounge-launched in-app play. For old bookmarks, display a precise indication rather than claiming seamless return.

**P2 — Gallery & Library.** Storage efficiency/duplication plan, user uploads, previews, and per-member curation not shipped. Placeholder labels must stay honest.

## 4. How to detect problems (do not equate green CI with acceptance)

**Static/source tests:** every actual `href` and `window.location` in private-area TSX; role and placement registries; scene CSS hash stability; import boundaries; matching hotspot and artwork boxes; event cleanup / Aborts; API authentication; no reachable unfinished art routes.

**Unit/integration tests:** with isolated in-memory D1, simulate same cookie across resources and navigation, expired session, permission violations, concurrent votes/seat claims, upload errors, blob delete failure, double click, save retries, stale request cancellation.

**Real browser end-to-end tests:** Playwright/WebKit + Chromium / Safari. Drive the actual site as a user, click the artwork, inspect visible state and URL changes, capture screenshots/diffs, network failed requests, console exceptions and page errors; intercept failed chunks and slowed requests. Do not put private cookies or passwords in reports.

**Measured performance:** use network waterfall (compressed transferred bytes, not Git repository blob sizes), CPU profiling for visible/offscreen 3D, post-logout chunk behavior, memory snapshots before/after repeated room visits.

## 5. Independent audit deliverables
A fresh READ-ONLY Work/ChatGPT audit should provide: (a) reproducible steps, expected/actual, module, screenshot or console evidence for each bug; (b) critical P0/P1/P2 classification; (c) exact source file and probable root cause; (d) which test was missing and how to add it; (e) no production deployment or data writes. Reviewer does NOT edit the implementation branch to avoid concurrent conflicts. After review, the implementer applies vetted fixes in a separate Draft PR and reruns the entire test matrix.

**Status at authoring:** all source defects above are in Draft J; real Safari visual and interactive acceptance is NOT yet claimed. Tests are necessary but not sufficient.
