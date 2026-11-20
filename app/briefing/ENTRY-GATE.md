# Mandatory Imperial Briefing — Entry Gate

**The owner's requirement:** after a member logs in, the Imperial Briefing must appear before the member can enter the homepage, parliament, Library, Lounge, or other application pages. A missing or failed briefing must never expose the application shell.

## Sequence

1. `/api/member-session` authenticates the member (or validates the resumed signed-in cookie).
2. Welcome fetches a **fresh** `/api/briefing` snapshot with `no-store` and `/api/briefing-session` for the **same member ID**. `parseBriefingFeed` validates the feed shape.
3. While either endpoint is loading or fails, Welcome remains visible. **Retry** is allowed; **Enter Without Briefing is forbidden.** The site and the home screen are not mounted.
4. Once both endpoints succeed, `System` mounts initially in mandatory-gate mode, rendering **only** `BriefingOverlay` (not a translucent modal layered over the actual site).
5. The site shell is rendered only after the member **interacts with the displayed briefing** by closing it, opening the Briefing Desk, or selecting a destination in the briefing.
6. Returning from external mini-games and restoring a session must pass the same entry gate; the remembered game-room destination may be restored **after** acknowledging the briefing. Query strings, localStorage and prior “seen” keys must never skip it.
7. The regular “Open Briefing” action inside the site still works after entry.

## Boundaries

- No changes to D1 schema or login credentials are needed. The gate is a required **UI onboarding step**, not a replacement for server-side authentication or per-resource authorization.
- `mandatory-entry.ts` contains tested preconditions; `page.tsx` enforces rendering exclusivity until acknowledgement.
- No modification of Briefing artwork, colors, dimensions, text hierarchy or animation is authorized by this gate.
- No changes to member permissions: the Lounge remains accessible only to existing allowed members.
- A failed briefing service should show an error and Retry, rather than display outdated or fabricated headlines.
- Test `tests/briefing-preload.test.mjs` for logged-in restoration, mismatched identity, missing feeds, explicit game-room return, and no-bypass contracts.

**Deploy only to isolated preview Worker/D1 until the owner approves the UX; do not merge or deploy to production without explicit approval.**
