# Schicksal 2.0 — Lounge and scene isolation (D)

Status: **Draft PR #13** stacked on **C / PR #12**. No production deployment or database operation. Visual parity and manual acceptance are still required.

## Component and dependency ownership

```text
app/page.tsx                      login + mandatory briefing + section selection
  ├── app/club/game-room-return.ts  ephemeral navigation hint only (no save payload)
  └── lazy app/club/committee-lounge.tsx
        ├── chat, mask, vase, seat, room UI and member-fetched data
        ├── use-room-journeys.ts     private-room navigation, decoding and timers
        │     └── mafraer-assets.ts small approved image-path manifest
        ├── lazy mafraer-lounge.tsx  private bedroom, own lighting/camera/music
        ├── lazy chryser-lounge.tsx  emerald room
        ├── lazy wordmage-lounge.tsx wordmage room
        ├── lazy game-room.tsx      cabinets/links
        └── lazy minigames/*        game UI/engines and rankings
```

**Rendering vs persistence:** room presentation and loading never decide who may read or write records. Committee chat, vase history, rankings, music and game saves continue to use their authenticated existing API routes, with per-member server-side authorization. No game save migration, reset, or layout/data backfill is included in D.

**Return hint:** `game-room-return.ts` owns only `schicksal:lounge-return` in session storage and the `?lounge=game-room` navigation hint. It stores no member ID, session token, game save or file. It can select a room only after login, because `app/page.tsx` still refuses to mount any site feature until the fresh mandatory briefing is acknowledged. Once entered, the room consumes the hint and strips the URL marker without touching unrelated query parameters.

**Transition lifecycle:** `use-room-journeys.ts` owns fan, globe, fireplace and music-box entrances. Timings, easing, scene artwork and success destinations are unchanged. Decoding/timeout results use monotonically incrementing request IDs, canceled timers and load deadlines; a late completion cannot reopen a room after its parent unmounts. Chat history fetch cancellation stays with `committee-lounge.tsx`, where that data belongs. This phase does **not** add a new visible skip control to private room animations or modify the separate main-site Lounge veil skip behavior.

**Heavy scene isolation:** `mafraer-assets.ts` provides exact approved artwork paths without importing private room implementation. The bedroom scene now uses a React lazy chunk, like other private rooms. The shared Lounge no longer needs to eagerly import the private bedroom's mechanism and observatory implementation. The original `mafraer-lounge.tsx` re-exports its original asset manifest name for compatibility.

## Art and CSS protection

The D regression suite pins exact Git blob hashes of six approved Lounge/Parliament/passage CSS files from phase 2. No new brightness, recolouring, camera move, image overwrite or reordered CSS declaration is authorized. This byte contract prevents *accidental* changes; it is not a substitute for screenshots and Safari/manual mobile acceptance.

**Remaining CSS debt:** selectors in the large `lounge-scenes.css` are not all namespaced. Safely scoping them needs a separate visual comparison and transition tests for each scene. Do not run a global selector-prefix script or change the CSS import order without that validation.

## Verification / release gates

- `npm run test:isolation`: immutable art style hashes, stable room animation contracts, lazy scene chunks, stale-request cleanup
- `npm run test:game-room-return`: status on re-entry, blocked storage, URL sanitization and consumption
- `npm test` and `npm run build`: existing API, ranking, archive, briefings and application regressions
- GitHub Actions: test status must be green before considering D review
- **Manual acceptance still pending:** iOS Safari and desktop entrance/back/skip/reduced-motion scenarios; deliberately stalled image requests; private room photo/lighting and sound, member permissions, game returns and original artwork comparison

**Release rule:** D remains Draft. Do not merge C/D, deploy Workers, apply remote D1 migrations, or change production images without a separate explicit approval and coherent restore rehearsal.
