# The music-box game room and magical chat scroll

The main Committee Lounge now has three visible props: the floating parchment on the table opens private chat/history, the left cabinet's music box opens the bright game room, and the globe visibly rotates before entering Nishujiade's existing room. The fan and fireplace retain their destinations. The cabinet prop is anchored to the left cabinet's top, away from the globe and fan. The scroll is a sibling of the table layer so seat hit areas cannot intercept it.

## Game room

The room uses a mint/cream sectional sofa, lilac knitted throw, flower and mushroom lamps, peach rug, a TV/console with two controllers and an eight-slot glass cabinet. Seven animated collectibles with detailed material artwork launch the five existing mini-games, Fireboy/Watergirl and the original Insaniquarium browser port. The final slot stays empty for future additions. A keyboard/touch-friendly game catalogue provides the same entries. A light toggle adjusts the scene.

All existing game engines, record IDs, difficulty boards, and per-member saves remain in use. Chryser's private aquarium entrance remains available. Mini-games opened from the cabinet return to the game room. Standalone games have a game-room return route; the server still validates the normal member session before serving it. Leaving the room returns to the main Lounge. The console explains that native games/streaming are not connected yet; it does not pretend to launch It Takes Two.

The entrance plays an original short pentatonic phrase synthesized with Web Audio after the user's click; no external music service or asset download is needed. The lid opens and the carousel turns, then the destination image is decoded before switching rooms. Loading has an eight-second deadline, errors leave the visitor in the main Lounge, timers/audio stop on unmount, and reduced motion shortens the transition.

## Private chat history

Existing records are kept unchanged. Their SQLite `CURRENT_TIMESTAMP` values are parsed as UTC, alongside ISO timestamps, and shown as year/month/day and hour/minute/second in Asia/Shanghai (UTC+8). Keywords search the stored history, including records older than the live window. Queries escape SQL LIKE wildcards and use bound parameters. Cursor pages use timestamp plus ID to avoid missing equal-time messages, including mixed SQLite/ISO date strings. The API reads at most 101 rows per page and returns 100 plus the next cursor. Earlier pages preserve the reader's scroll position, live polling does not replace historical results, and stale search requests are aborted. Sending returns to live chat. Both interfaces retain the three-member committee restriction and the site's existing server-side authentication.

No database migration, credential change, storage tier change, or paid service is required.

## Artwork

Background: `public/lounge-game-room-v1.webp`, 1672 × 941, optimized WebP (~284 KiB), generated with the built-in image generator. The original Solitaire card-back figure is reused intact; the other cabinet objects and the music box use `public/lounge-collectibles-v2.webp` (a transparent 1254 × 1254 three-by-three atlas). The atlas was generated with the built-in image generator, then encoded as WebP. Its nine cells are the closed/open walnut entrance box, a separate rotating brass crescent ornament, the potion rack, relic casket, jade instrument, emerald music casket, fire/water glass sculpture, and miniature aquarium. Both the closed/open box art share the same base position; the figures are animated as independent layers.

Art prompt: Polished wide 16:9 soft 3D storybook interior for a private fantasy website. Bright, warm, sophisticated playful family game room in cream, buttery yellow, muted coral peach, pistachio mint, soft lilac and sky blue. Large comfortable sectional with a knitted blanket, cute flower/mushroom lamps, TV and generic console with two controllers, soft rug, plants and small return doorway. Clear nearly front-facing glass cabinet in the rightmost third, cream/pale blue frame, two columns and four empty shelves for animated collectibles. Soft afternoon sun, tactile fabrics and clear glass, harmonious materials. No people, text, logos, interface or watermark.

## Validation

- Five real chat-history/API tests run against isolated SQLite: full timestamps/timezone and new-year rollover, all 235 messages across cursor pages, equal timestamps/mixed formats, search in old records with literal wildcard characters and SQL-injection text, committee restrictions and malformed cursors, and deduplicating message merges.
- The existing privacy/login, sigil/potion/merge/solitaire checks pass alongside those tests (36 tests total).
- Vinext production framework build passes. The full packaging command's original-game binary verification/import remains the existing Cloudflare pipeline's responsibility; those remote binary assets were not changed by this patch.
- Browser QA uses the actual client components in an isolated local static harness with disposable messages, without Cloudflare runtime/bindings or a production session. The new room uses its final artwork. Only an older Lounge plate and stand-in private-room background were available to the local review; original production scene art was preserved. Production member-authenticated visual QA is separate from this review.

## Visual refinement

The original painted Wordmage globe remains the only globe seen at rest. The simplified SVG overlay, hover label, pointer cursor, glowing affordance, introductory destination hint, and overt music-box toolbar shortcut are removed. An invisible hit area stays aligned to the existing shelf. On activation only, a clipped copy of the original painted globe supplies the brief turning effect before the existing passage. The walnut music box is scaled to the cabinet surface and color-matched to the room's candlelight, with no idle tooltip or hover glow. Cabinet sprites preserve transparent surroundings and subtle material highlights instead of flat outline icons. Card-back geometry, gold borders, and the eight emblem colors come directly from the earlier Solitaire figure.

Refinement art prompt: Nine exquisite antique fantasy collectibles on true transparent alpha, arranged in an exact three-column/three-row sprite atlas. Consistent slightly elevated near-frontal three-quarter camera, soft warm light from upper left, real rosewood grain, patinated brass filigree, engraved mechanisms, clear glass, and restrained jewel colors. Same closed/open walnut music box and baseline, separate brass crescent with faceted amethyst star, three fine glass potion vials in a wooden rack, velvet-lined relic casket with crystal, jade/brass optical instrument, emerald mechanical bird/harp music casket, amber fire and aquamarine water sculptures on one low base, and a tiny brass-framed planted glass aquarium with guppies. Generous transparent margins, no flat app icons, plastic, outlines, labels, opaque panels, neon or watermark.
