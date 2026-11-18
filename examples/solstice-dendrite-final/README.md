# Solstice Dendrite — Rare Card Interactive Animation

**Status:** isolated implementation on branch **demo/solstice-dendrite-final-animation-20261119**. This branch is **not** connected to the production Guess What flow. No database, existing site page, or original image was modified.

## Contents

- **preview.html:** one-page, standalone interactive animation using HTML, CSS, and JavaScript.
- **README.md:** instructions and integration guidance.

## Art assets

Expected names:

- **Card_Back.png:** approved pearlescent crystal card back.
- **Card_Front.png:** approved detailed ornate card front.
- **Title_Solstice_Dendrite.png:** approved sharp crystalline logotype.
- **Flower_Bruma.png:** use the later-approved pearlescent-ivory Bruma, not the older saturated-blue version.

The older four-part ZIP contains the earlier blue flower. To load the correct design, use that ZIP in the first picker and **Bruma_pearlescent_ice_flower_standalone_transparent.png** in the second picker. The second picker replaces the flower in the animation without changing the original ZIP.

Alternatively, create an adjacent **assets/** folder containing four PNG files with the exact four canonical names, replacing the flower file with the pearlescent one. Serve the directory using any simple local HTTP server, and the preview attempts to load the images automatically.

Modern browsers can read the ZIP directly via built-in DecompressionStream with deflate-raw. No external script dependency is required.

## Final approved motion sequence

1. Press **Guess What**. A white-gold spotlight visibly extends downward from the top. Card and snow have not appeared yet.
2. Card and snowfall **appear simultaneously** after the spotlight is established. Snow always starts from the top edge and falls downward.
3. The card descends and rotates around its own diagonal line, from bottom-left corner to top-right corner, initially quickly and then progressively more slowly.
4. With a 2:3 portrait card, the diagonal starts at approximately **70° to horizontal**, which is 20° to vertical. The card as a whole has a -13.7° lean. During only the **last 28% of the descent**, the lean transitions smoothly to a slight remaining -4.8° lean. The card must still be descending and spinning while this happens.
5. The card finishes descent and rotation **simultaneously**, displaying its back and hovering indefinitely. Snow continues falling.
6. On click, intense radial light **originates at the core of the snowflake in the card back** and expands outward. Individual snowflakes stop **only when reached by the expanding light**, not all at click time.
7. The card turns a final **180° around that same diagonal axis**. It retains the slight lean. The front art is pre-oriented so its flowers and text are not mirrored at the end.
8. The radial light propagates outward and fades naturally **during the flip**, reaching zero brightness exactly as the face is presented. Normal ambient brightness returns. All visible snow stays suspended.

## Default values, adjustable

- Spotlight projection: **0.95 seconds**
- Entrance with descent and two full rotations: **3.85 seconds**
- Hover: **until clicked**
- Final diagonal-axis half turn: **1.42 seconds**
- Wave sweeps stage in roughly **78% of flip duration**
- Initial and final planar lean: **-13.7° → -4.8°**

## Artwork treatment

The page displays the exact approved original face and back PNG pixels as image layers. It overlays the independent Bruma PNG. It uses the title PNG's alpha transparency as a mask for a pearl-white/soft-gold/pale-blue crystalline-gradient treatment, preserving the actual sharp letterforms. Title and Bruma sizes have interactive sliders. Input image files are not altered.

## Work integration instructions

The current live components are **app/club/vase/vase-experience.tsx** and **app/club/vase/vase-experience.css**.

- Treat this preview as the behavior and motion reference.
- Integrate in a separate Rare-card state machine with stages **light → entrance → hover → flip → front → dismiss**, without disrupting the existing normal-card flow.
- Preserve server-authoritative random result, request-id idempotence, history, room state, and persistence.
- Clicking during entrance may skip ahead to the **hovering card back**, but must not reveal the front.
- The next click on the hovering card back triggers the half-turn and expanding snow-freeze wave.
- Ensure any current generic draw-to-finish timeout does not close the Rare experience automatically.
- Only allow closing or returning to the lounge on deliberate dismissal after presentation.
- Center the emitted light on the **actual geometric core of the back snowflake**, not the entire viewport by assumption. Adjust its origin if artwork alignment requires it.
- Keep the assets and animation layers modular. Do not redraw the ornate frame, modify the flower design or smooth the sharp letterforms.
- Keep other modules (library, committee, games, music) unchanged.

## Testing status

The code has been authored and saved as an isolated demo branch. The authoring environment could not run an automated graphical browser preview, so manual checks of the ZIP import, layout, snow wavefront, title position, and motion smoothness are still necessary before production merge.
