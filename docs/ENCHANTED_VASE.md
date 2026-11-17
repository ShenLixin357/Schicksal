# Committee Lounge — Enchanted Vase

The original nine selections and their image bytes are retained. This addition expands the shared vase to 30 arrangements: 19 named manual choices and 11 hidden, animated choices. Guess What? draws uniformly from both groups, excluding the actual current arrangement. Royal Cabbage receives a gold coronation; Royal Rose is a diamond rose with a silver-blue reveal.

## Interaction

- Short click/tap: a compact, names-only list. Hidden names and artwork are not shown in the menu.
- Hold for 600ms: object history, newest first. A moved/cancelled pointer does not open the menu.
- History rows contain member, arrangement name and time, without before/after text or thumbnails.
- Keyboard: Shift+Enter, Shift+F10 or Context Menu opens history; the menu also has a history entry. Dialogs restore focus and contain keyboard navigation.
- Guess What? performs a short card shuffle and flip. Clicking the draw surface skips the animation; reduced-motion preferences reveal directly. The saved result does not depend on the animation finishing.
- Artwork animation pauses while the document is hidden. Reduced motion preserves visible static weather/ice details.

## Boundaries

`app/club/vase/` contains the catalogue, illustrated/animated SVG parts, scoped styles, UI, and transactional persistence. Existing scene artwork, table placement, tea, room transitions, music, parliament, messages and game records are not replaced. The nine original PNGs have explicit hash regression checks.

`0011_committee_vase_history.sql` only adds an append-only table. It does not replace the existing room or invent earlier events. Before the first new event, the UI can display the known current arrangement's last author/time from the original room record.

The existing vase POST action remains compatible. New `vase-random` requests select on the server inside a D1 batch transaction, append authorship, and update the original room atomically. Request IDs are scoped to the verified member; retries recover the original draw and cannot restore an old arrangement over another member's newer change. Choosing an already-current manual option adds no history event. Hidden choices cannot be selected through the manual action.

`GET /api/committee-club/vase-history` uses the existing standalone member boundary and Committee Lounge membership. A sequence cursor returns 30 entries per page, including equal-time entries without omissions. No client-supplied author is recorded.

## Validation

Run `npm run test:vase` for original image preservation, catalogue completeness, additive migration, authorship, deterministic coverage of all draw outcomes, retries, transaction rollback, concurrent changes, access controls and history pagination. The default `npm test` includes this suite.

Production worker/client compilation was checked with `npx vinext build`. Full repository TypeScript checking has existing errors in unrelated music, observatory, parliament and potion-test code; a focused strict check covers the new vase modules. Managed browser preview routing showed the existing homepage for the isolated test route, so interactive browser QA could not be completed in this environment. All new artwork and the Guess What? wordmark were rendered and visually inspected independently.
