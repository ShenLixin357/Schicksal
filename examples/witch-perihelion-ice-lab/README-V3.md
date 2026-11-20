# The Witch’s Perihelion · Crystalline Witchcraft V3

**Status: working independent animation experiment. Not yet visually approved, not merged into production.**

This is the V3 response to the user's explicit instruction to upgrade the 2026-11-20 Witch ice card, with design lineage from the actual Mafraer private Lounge and the 17-rib articulated fan.

## Preview and previous versions

- **V3:** [crystalline-witchcraft-v3.html](./crystalline-witchcraft-v3.html)
- **V2 optical baseline:** [V2 branch](https://github.com/ShenLixin357/Schicksal/blob/demo/witch-perihelion-crystalline-magic-v2-20261120/examples/witch-perihelion-ice-lab/preview-v2.html)
- **V1 original material lab:** [V1 branch](https://github.com/ShenLixin357/Schicksal/blob/demo/witch-perihelion-ice-material-lab-20261120/examples/witch-perihelion-ice-lab/preview.html)

GitHub browser: click the V3 link → Raw → Save as HTML → open in Safari or Chrome. No server is needed for the placeholder lab. The HTML is self-contained and can import original card PNG or WEBP files, or a source ZIP, directly inside the browser.

## Non-negotiable sequence

1. **Summon:** The original back image (or an openly labeled placeholder if no original is imported) appears from a central point at 50% × 39% of the card, within a high-detail pearl-violet magic bloom with curved independent filaments, restrained moonlit astral rings, etched ticks and tiny light intersections.
2. **Growth:** Six real primary ice ribs propagate from the exact center. The ribs have tapered facets and independent delays, with paired secondary branching, further tiny spikes, minute hollow points, a hexagonal core and later spreading outer frost veins.
3. **Frozen hold:** The WebGL2 optical shell becomes **fully opaque** on completion. The original back **must not remain visible through it**. Wait indefinitely for click.
4. **On click:** Fracture paths illuminate first, then 168 narrow, pointed triangular ice shards separate with independent delay, rotation, inertia and gravity. **The actual original front**, when imported, appears underneath. **No card flip.**
5. Click to replay after reveal.

## Optical material implementation

- **Refraction:** during the early growth stage, multi-scale surface-normal displacement samples the original back as a GPU texture; displacement softens as the ice thickens.
- **Fresnel-inspired rim reflection:** grazing highlights on exterior and steep facet normals, with cold pearl-silver shimmer.
- **Frost scattering:** multi-scale noise, anisotropic ice striae and different local roughness give translucent crystalline and microfrost areas; final optical shell is fully opaque, although its internal palette suggests depth.
- **No cheap effects:** avoid bright rounded crystals, neon outlines, full-screen white wipes, or regular chunky polygons.

A **Canvas2D fallback** is provided when WebGL2 cannot initialize. It still conceals the back but has simpler optical details. This is an artistic simulation of ice optics, not real-time path tracing or physical volumetric scattering.

## Interactive tuning

| Control | V3 default | Adjustable range |
|---|---:|---|
| Overall speed | 1.00× | 0.50–2.00× |
| Summoning | 1.35s | 0.60–3.50s |
| Ice growth | 3.60s | 1.50–7.50s |
| Fracture | 1.15s | 0.45–3.00s |
| Ice-branch density | 90% | 35–150% |
| Frost scattering | 62% | 15–95% |
| Refraction + rim light | 95% | 10–140% |
| Shard energy | 85% | 25–145% |

Use **full / summoning / crystal growth / ice material / fracture** buttons for isolated tests, and **pause / restart / frame step** for precise tuning. The normalized time scrubber can jump across the frozen wait specifically for debugging; normal playback **never** auto-breaks.

## Lineage from the real Mafraer Lounge

The reference source was read directly from the Schicksal repository:

- `app/page.tsx`: clicking the closed lacy fan enters Mafraer's private Lounge.
- `app/club/articulated-fan.tsx`: 17 individually rotating ribs, with lacy petal mesh geometry updated with the fan.
- `app/club/fan-motion.ts`: 5.2s nonlinear, non-uniform motion controlled by independent wrist and folding tracks.
- `app/club/mafraer-lounge.tsx`: moonlit purple crystal palace, fine arcs conveying power from moon/crystal to chandelier, and floor snowflake resonance.
- `app/globals.css`: delicate projected magic rings, faint pearl-blue light lines, layered moonlit illumination.

V3 borrows the principles (genuine independent geometry, natural acceleration and restraint in light origin) and does not copy the Lounge artwork or unrelated code.

## Implementation and source of truth

- `summon`: `bezierP`, `drawMagic`, `revealCircle`.
- `crystal-growth`: `drawArm`, `hollowLance`, `blade`, `drawFreeze`.
- `ice-material`: GLSL `iceFragment`, `renderIce`, plus 2D fallback.
- `fracture`: `makeSharpFragments`, `drawCrackPropagation`, `drawShatter`.
- `timeline`: `seekAbsolute`, `frame`, `syncTimeline`.

They are **separated by functions in a portable, offline HTML demo** rather than shipped as individual JS files: native modules loaded via `file://` commonly run into restrictions when saved directly from GitHub. The functions can be extracted into separate production modules *after* art/behavior approval.

## Verification status

**Completed:** JavaScript syntax check; static DOM ID correspondence; simulated 60fps interaction path with Canvas2D mock; 8 runtime checks passed (summon → growth → frozen indefinitely → clicked fragment burst → front reveal; 168 pointed shards; ×2 speed; time scrub; material-mode hold). The experiment is isolated from main and the accepted Solstice Dendrite.

**Outstanding before approval:** compile and display WebGL2 shader on actual Safari; visually inspect the original female Witch artwork after local import; alpha/UV alignment, optical believability, sharpness of ice, 30/60fps performance, visual A/B against original historic animation. Only then freeze a version and integrate into the site.

The original historical `witch-ice-card.js` exists in uploaded historical ZIPs but could not be extracted through the available file runtime in this session. This V3 is a new working visual experiment based on the documented old animation contract, **not a claim to have edited that legacy source directly**.

## Never change without explicit approval

- Witch card back, face, flower/Helianthus, card framing and colors.
- `main` or any approved Solstice Dendrite branches.
- The story: summon back → snowflake-centered ice grows → full concealment → click-triggered sharp break → directly reveal face.
