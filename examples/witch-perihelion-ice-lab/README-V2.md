# The Witch’s Perihelion · Crystalline Magic Lab V2

**Type:** isolated HTML experiment. **Production state:** not merged, not deployed, not a replacement for the existing Solstice Dendrite animation.

Open [preview-v2.html](./preview-v2.html) via GitHub → Raw → save HTML → Safari/Chrome.

## Locked sequence

**Full mode**:
1. **0–0.93s:** back emerges from one point at roughly 50% × 39% of the card. A pearl-violet magical source blooms, with 12 curved/layered light filaments and refractive halo; the whole card is initially clipped to a point, so its rectangle does not appear prematurely.
2. **0.93–3.78s:** six long, slightly unequal crystal ribs grow outwards from the *same* center. Fine subsidiary ribs grow at staggered speeds. Hollow diamond tips and a sixfold crystal core retain an airy, incisive look. At the same time, a crystalline optical layer expands.
3. **Frozen hold:** the optical layer is **fully opaque at progress=1**, hides the back completely, and never shatters automatically. Background art is not visible through the frozen card.
4. **After click, 1.28s:** a fine crack network spreads, then distinct irregular Voronoi ice plates rotate/fall outwards with staggered motion and edge glints. The original front is revealed *without 3D flip*. Click again to replay.

**Independent modes:** Growth-only skips the summon; fracture-only starts with the complete shell. These permit material tuning without replaying the entire sequence.

## Rendering and optics

- **WebGL2 refractive frost (new):** noise-based normal displacement samples the actual back image in the growing stage (when imported). As the ice finishes, haze/scattering becomes an opaque crystal material so that no artwork remains visible.
- **Fresnel-inspired glints:** bright grazing edges and sharp local crystal facets; restrained cool violet, pearl and icy-white accents. This is a stylized optical approximation, not a 3D raytraced simulation.
- **Anisotropic crystalline striae:** multi-scale ice folds, fine directional filaments, and irregular refractive streaks, not a single smooth white gradient.
- **Sixfold crystal growth:** pointed primary rays, delayed secondary side ribs and small hollow diamond end details. Some rays are deliberately longer than others.
- **Nonregular fracture:** 38-cell Voronoi breakup instead of repetitive radial pie-shaped pieces. The break remains deterministic for reproducibility.
- **Canvas2D fallback:** browser fallback for WebGL2-unavailable cases, still fully covering the back. Lower optical detail than WebGL2.

## User controls (defaults)

| Parameter | Default | Meaning |
| --- | ---: | --- |
| Ice-rib density | 90% | Side-rib reach and density |
| Frost scattering | 62% | Roughness/veiling; **does not make the final ice transparent** |
| Refraction and rim reflection | 95% | Facet glints, ice striae and optical response |
| Fracture energy | 85% | Unequal motion of shattered plates |

## Art imports

- Optional ZIP picker finds PNG/WEBP/JPG named **front**, **back**, **ice**, or **flake**.
- Or upload those image files separately.
- Uploaded back artwork becomes the refraction source during crystal growth.
- The original front appears **behind** the solid shell on click and is exposed as fragments move away.
- `ice` and `flake` can be imported for source review, but this V2 experiment intentionally renders a new ice membrane and snowflake instead of assuming the old layers are usable as-is.
- ZIP content is treated only as image bytes; no code is executed.

When no source art is uploaded, the preview uses explicitly labeled placeholders. **Do not mistake those for the user's original approved art.**

## Isolation, limitations, verification

Branch: `demo/witch-perihelion-crystalline-magic-v2-20261120`.

The original user-supplied 2026-11-16 witch card ZIP has not been programmatically extracted in this environment; V2 is a new animation material prototype, not a claim to have patched the old code exactly.

This file has been statically checked for JavaScript syntax, DOM IDs, interaction entry points and key sequence safeguards. Real-world Safari WebGL2 compilation, visual playback and performance still need manual preview acceptance. No production files or Solstice Dendrite animation were changed.

**Acceptance checklist:** no rectangle before center reveal; six distinct pointed snowflake rays; full card back concealed at freeze; no auto-break; fractured shell reveals the actual front rather than flipping; light and ice remain subtle and physically suggestive, not plastic.
