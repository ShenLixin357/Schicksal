# Wordmage Lounge and globe entrance

The new bookshelf globe opens Room No. 03 from Committee Lounge for its current authorized members. Nishujiade's existing `truth` identity, homepage lightning mark, and Lounge magnetic-field mark are retained. The entrance is painted into the shelf artwork; an invisible object-shaped button activates a temporary magnetic-field passage. There is no idle hotspot light or duplicate globe laid over the scene.

## Asset paths and generation

Created using the built-in ImageGen tool (not the CLI fallback):

- Entry artwork: `public/committee-lounge-word-globe-v1.png`; absolute path `/workspace/sites/schicksal-first-empire/public/committee-lounge-word-globe-v1.png`.
- Private Lounge: `public/nishujiade-private-lounge-v1.png`; absolute path `/workspace/sites/schicksal-first-empire/public/nishujiade-private-lounge-v1.png`.
- Both are 1672 × 941 RGB PNGs. The original backgrounds are kept as source references.

### Final entry prompt

Use case: edit a production illustration with strict scene fidelity. The reference image is the EDIT TARGET. Preserve the entire existing illustrated European Gothic Halloween Committee Lounge exactly: identical camera, room geometry, exact three chair silhouettes and placement, window, moon, bookshelf, cats, curtains, candle sconces, pumpkins, fireplace, rug, floor and EMPTY central area (no table). Make ONE localized modification only: replace the small gold armillary sphere on the upper-left bookshelf, centered at about 10.8 percent of image width and 25 percent of image height with its base at about 29.7 percent height, with ONE exquisite miniature terrestrial globe on that same shelf. It is an elegant word-mage's globe: clearly recognizable Earth sphere with believable continents, ivory parchment oceans, muted dusty teal and lilac cartography, etched fine meridians, delicate antique gold and moon-silver thin meridian ring, slim ornate Rococo stand with delicate filigree feet fully resting on the shelf. Keep it in perspective, same small scale and warm candlelight as the old instrument, restrained and luxurious. A beautiful scholarly instrument which looks naturally painted into the original art, not a bright UI icon. No glowing aura, no sparkles, no dot markers, no added text, no letters, no overlays or people. Leave all other pixels and composition as faithful as possible. Preserve original 16:9 wide aspect ratio and full uncropped composition, ideally 1672 by 941.

### Final room prompt

Use case: stylized-concept environment artwork for a classical European magical website, asset type: full 16:9 landscape private Lounge background, no UI. The attached images are STYLE REFERENCES ONLY, do not reproduce either room. Create a beautiful private scholarly Lounge for a male word-mage (言灵师), nimble, light, mercurial, full of knowledge and incantation. Same exquisitely crafted European Gothic/Rococo illustrated world as the references, high quality semi painterly stylized 3D furniture, cozy and magical. Distinct personal palette: moonlit pearl/ivory, mist lavender, soft periwinkle, antique champagne gold and small dusty teal accents. Light and airy rather than oppressive, elegant nighttime observatory library inside a castle, vaulted ceiling, two tall arched starry windows to right, wispy clouds beyond, pale draped silk, detailed pale walnut gilded bookshelves to left with abundant leather books, one graceful carved lavender wingback chair at center-left around x44 y63, refined oval reading table at center around x55 y70 with one clearly visible OPEN parchment spellbook and feather quill around x55 y62, comfortable seat and rug grounded. On the left sideboard around x20 y56 place one exquisite terrestrial globe: ivory parchment oceans, muted lilac and teal realistic Earth continents, thin brass meridian ring, slender ornate stand. A delicate brass suspended magnetic-field armillary instrument above the table around x57 y33, three fine elliptical rings and a tiny pearl core, ordinary crafted metal at rest, not a glowing logo. On right window sill around x81 y61 place one small clear ink bottle. Restrained pale highlights, candle reflections, believable contact shadows, beautiful architectural depth, polished craftsmanship, clean coherent uncluttered composition. Magic feels scholarly and can be activated later through code. NO floating books at idle, no particle soup, no neon, no green fireplace, no generic sci-fi HUD, no Chinese fan or furniture, no cartoon emoji, no people, no text, no signage, no UI, no watermark. Ensure a full uncropped wide 16:9 landscape illustration.

## Interactions and coordinates

All positions use percentages of the final 1672 × 941 artwork. The entry button is at (10.9%, 25.2%). Private room: globe (7.1%, 43.1%), hanging magnetic instrument (57.5%, 21.8%), open book (57.9%, 62.7%), right window (87.2%, 28.5%). These are tunable in `app/globals.css`.

The globe cycles three atlas chapters. The magnetic instrument gathers animated letters from the open book. The book lets visitors write a short incantation and release its characters into the air. The window reveals a connected constellation; moonlight can be toggled separately. Effects last 5.6 seconds and reduced-motion preferences produce static effects. Book keyboard focus is confined to its dialog and restored to the trigger on close.

The entrance waits for destination image decoding and at least 1.9 seconds (0.18 with reduced motion), gives a retry message after failure or a 12-second deadline, and cancels outstanding callbacks when leaving the Lounge.

## Verification scope

Generated art was visually inspected for style, placement, and continuity. Component TypeScript checks and the production build validate code integration. Browser interaction, touch, and final layout QA are unavailable in the current environment; they are not claimed as tested.
