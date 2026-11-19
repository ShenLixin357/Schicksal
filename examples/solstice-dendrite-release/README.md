# Solstice Dendrite — Accepted Release

This directory contains exactly **three standalone HTML demo variants**, saved on the isolated branch `release/solstice-dendrite-final-20261119`. None is deployed to the production Schicksal website.

| File | Purpose |
| --- | --- |
| `card-motion.html` | Card-only: overhead holy light, 720° diagonal descent, hover, then 180° reveal. Snowfall continues. **No WebGL burst shader.** |
| `burst-effect.html` | Final approved V4 effect: 1.42-second GPU glow from card-back center, semi-visible freeze front, outward-aligned snowflake refraction and 0.46-second sparkle. Starts from a hovering card. |
| `complete-animation.html` | Integrated entrance/hover/click/reveal combining the accepted card motion and the approved V4 burst. |

## Original assets

Use the **original** `Solstice_Dendrite_Original_Art_Assets_Updated.zip`, containing `Card_Back.png`, `Card_Front.png`, `Flower_Bruma.png`, `Title_Solstice_Dendrite.png`. Optionally upload the separately approved pearlescent Bruma transparent PNG to replace the older flower in the ZIP.

All three HTML files are self-contained apart from the original images entered through the file pickers. Browser preview: open the GitHub file, select **Raw**, save as HTML and open in a modern Safari or Chrome.

## Design invariants

- Preserve the actual original card/flower/title artwork; do not redraw.
- Full descent: overhead lighting first (0.95s); 4.45s diagonal-axis descent with approximately 355px travel; end near the 54% stage-height hover line.
- Reveal: 1.42 seconds; final 180° turn around original diagonal 3D axis while preserving slight tilt.
- Final glow: center of the **actual card-back snowflake**, not screen center; snow stops when expanding light front reaches each flake.
- Snow crystal flash: temporary pearl/ice-blue halo, with each outgoing refraction light-tail parallel to the ray from original explosion center to that particular snowflake. No large triangle shards or artificial rainbow effect.

## Isolation and verification

JS syntax, DOM ID references, and preservation of the motion/1.42s effect constants were checked in the connected GitHub workflow. Real Safari visual playback and GPU performance have **not** been empirically tested. Do not merge into `main` before visual approval.

## Obsolete experiment branches (cleanup pending)

The GitHub connector does not expose deletion of branches. These nine temporary branches remain and must be deleted using GitHub's Branches UI (or an authenticated GitHub CLI) **only after verifying that the three files above work**.

- `demo/solstice-burst-lab-gpu-20261119`
- `demo/solstice-burst-lab-ice-refraction-20261119`
- `demo/solstice-burst-lab-radial-snow-light-20261119`
- `demo/solstice-burst-lab-snow-refraction-20261119`
- `demo/solstice-burst-lab-v1-microice-ab-20261119`
- `demo/solstice-dendrite-crystalline-burst-20261119`
- `demo/solstice-dendrite-final-animation-20261119`
- `demo/solstice-dendrite-light-refinement-20261119`
- `demo/solstice-dendrite-snow-refinement-20261119`

Keep `main`, `release/solstice-dendrite-final-20261119`, and all unrelated branches. Deleting branch references cleans up the branch list; it does not guarantee immediate reduction in GitHub's stored history.
