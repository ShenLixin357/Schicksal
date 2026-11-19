# The Witch’s Perihelion — Ice Material Lab v1

**Status:** isolated visual experiment, NOT a production replacement.

## Purpose

Replace the old "plastic" impression with an optically thin, semi-transparent ice film, physically suggestive branching frost, and nonuniform shard fracture.

**Story contract (preserved):**
1. The card appears (this lab currently uses a stationary, slightly tilted card for material testing).
2. Six crystal arms begin growing outward from the central snowflake, with staggered secondary branches.
3. Transparent ice film and micro-refractions appear around the branches.
4. The ice freezes in place. **It never shatters automatically.**
5. User clicks; the ice breaks and falls away, directly revealing the front. **No flip.**
6. User can click again to replay.

## Lab controls

- Full sequence: grow -> hold -> user click -> fracture -> front reveal.
- Growth only: inspect growth, click to reach the final frozen state.
- Fracture only: skip straight to the breakup preview.
- Crystal density, ice-film opacity, refraction strength, and fracture force sliders.
- Pause/restart.
- Optional ZIP or direct image import for `front.webp`, `back.webp`, `ice.webp`, and `flake.webp`; PNG equivalents also work.

The ZIP parser only extracts matching images. It does not execute JavaScript from uploaded packages.

## Visual constraints

The preview's unimported sample card is labeled **REFERENCE PLACEHOLDER**. It is not the original card art. Upload source images to see the effect against the real historical art.

The historical JS source named `witch-ice-card.js` is recorded in the user's archive, but it was **not programmatically extracted in the current tool environment**. This v1 prototype therefore preserves the documented user-facing animation sequence while introducing a separate ice/fracture rendering engine; it is not presented as an exact code patch or confirmed pixel-match.

## Integration safety

The branch `demo/witch-perihelion-ice-material-lab-20261120` is independent of `main` and all Solstice Dendrite card animation branches.

After the material effect is visually approved: 
- Inspect and adapt the actual legacy JS and art layer anchors.
- Separate the reusable frost-growth, refraction, and fracture stages.
- Calibrate timing and positions to the real card.
- Test Safari graphics performance and click-to-skip behavior.
- Merge only after approval.

## Open

View `preview.html` from GitHub, choose Raw, save as HTML, and open in Safari. No server required for the placeholder preview. Images may be selected from your device.
