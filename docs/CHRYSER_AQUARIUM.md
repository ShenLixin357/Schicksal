# No.2 Aquarium (phase 1)

This branch introduces a **new original aquarium prototype**, not the source engine, assets or rules of PopCap's *Insaniquarium*. Do not advertise this as the original game or a completed engine port.

## Included
- A standalone `/games/aquarium` game page and a visible transparent-tank launcher in Lord Chryser's private lounge.
- Per-authenticated-member, single-slot D1 saves at `/api/aquarium-save` with revision compare-and-swap to prevent overwriting updates from another device.
- Browser local backup as a best-effort fallback, and manual sync action. All API identity comes from the session, never the payload.
- Basic feed/earn/buy loop as a wiring prototype to verify the save path before adding complicated mechanics.

## Required before release
1. Confirm D1 migration `0008_member_aquarium_saves.sql` is applied on the **correct** remote database before deploying the new Worker. Check migration status rather than reimporting production data.
2. Run `npm ci`, `npm run lint`, `npm test`, `npm run build`; verify route and API work with the Cloudflare Worker boundary.
3. Verify each member sees only their own fish/coins, and switching devices after save restores the same state. Test 409 collisions between two simultaneously open tabs.
4. Verify No.2 stage positioning at desktop/mobile widths; preserve all existing objects and controls.
5. Review offline retry: current prototype retains local backup but **does not provide an automatic persistent cross-reload upload queue**. Verify network failures clearly expose unsynced state.
6. Test on iOS Safari, desktop Safari and Chrome. No production deploy or merge before review.

## Original-engine roadmap
Locating a legitimate porting source/asset distribution and checking its license is a separate research task. Its engine state must be mapped to a versioned, validated schema; avoid saving executable code, unbounded blobs, or untrusted JS. Preserve original code attribution and compatibility requirements. Save migration needs its own converter before exposing original-engine play.
