# Mafraer's Lounge — three room mechanisms

Implemented scope: outside broom recall/gesture flight; articulated bed linen and canopy; faceted crystal-ball weather and galaxy gestures. No changes to other lounges, games, emblems or the telescope's star catalogue.

## Controls

- Broom: click toggles night-sky home / window dock. Drag within the window region; release docks with preserved velocity and damping. Enter/Space recalls, arrow keys guide flight.
- Quilt: click runs a 5.6-second corner lift, cloth billow, independent pillow alignment and canopy closure. Touch the canopy to reopen it. Original mattress stack, supports, guardrails and under-bed secret drapes remain stationary.
- Globe: short click invokes the existing moon/star resonance. A stationary hold starts charging at 300 ms, reaches full strength at 1.5 seconds and releases the selected weather on pointer-up. Moving 7 CSS pixels locks the gesture to galaxy dragging and cancels charge, even if the pointer moves back. Modes are stardust, snow and ice mist; a button / R key offers a keyboard alternative. Weather dissipates locally after 4.6 seconds.
- Toolbar: optional sound toggle persists on this device. Reduced-motion preference removes the broom orbit and cloth flourish while retaining actions, and keeps local weather still. Hiding the page or opening the observatory pauses active animation clocks. Pointer cancellation/blur clears the hold without emitting weather.

## Artwork registration

Authoritative source: `public/mafraer-ice-bedroom-moonlit-v4.png` and `public/mafraer-ice-bedroom-lit-v4.png`, 1672 × 941.

The clean plates contain no broom or crystal globe. The original upper-bed art is restored as a registered canvas tile; only individually traced moving textiles are removed using the matching clean plate and then painted through their articulated mesh. Textures are sampled directly from the original source at their native positions. Pillows have independent transforms; quilt corners and curtain hems have independent mesh vertices. This avoids substituting a redesigned bed or leaving the original moving objects painted behind their animated versions.

A generated fabric extraction was rejected because it changed the perspective and registration. Its output remains a process image only; the application uses the original artwork's fabric textures instead.

## Tunable motion

`app/club/mafraer-magic-motion.ts`: MAGIC_TIMING, BROOM_HOME, BROOM_DOCK, BROOM_WINDOW, ORB; spring stiffness/damping, Bezier control points, quilt corner delay/lift/billow/settling, per-pillow delay, curtain hem travel, galaxy damping.

`app/club/mafraer-fabric.ts`: original fabric outlines and texture bounds, 8 × 13 cloth mesh, native artwork bed-region tile. `mafraer-mechanisms.tsx`: weather radius/count/opacity, galaxy projection and audio levels. All coordinates share the original artwork's grid, including while zooming/panning.

## Generated assets / prompt record

Mode: built-in image_gen, edit mode. No CLI/API fallback. Original source artwork was inspected before editing. Selected PNGs preserve generated alpha and are copied into the Site repository.

| Selected asset (absolute project path) | Purpose |
| --- | --- |
| /workspace/sites/schicksal-first-empire/public/mafraer-palace-clean-moonlit-v1.png | Moonlit clean plate, 1672 × 941 |
| /workspace/sites/schicksal-first-empire/public/mafraer-palace-clean-lit-v1.png | Matching illuminated clean plate, 1672 × 941 |
| /workspace/sites/schicksal-first-empire/public/mafraer-ice-broom-v1.png | Original-style transparent broom, 2172 × 724 |
| /workspace/sites/schicksal-first-empire/public/mafraer-crystal-shell-v1.png | Clear faceted transparent globe shell, 1254 × 1254 |

### Moonlit clean plate — final prompt

Use case: precise-object-edit.
Asset type: clean background plate for an interactive illustrated room.
Image 1 is the exact edit target, 1672 x 941 pixels. Preserve the entire ornate purple ice-palace room, viewpoint, every architectural edge, bed structure, staircase, mattress stack, railings, under-bed curtains, slide, trampoline, ceiling device, ice chandelier, crescent moon, telescope and floor snowflake exactly.
ONLY remove these movable foreground items and reconstruct what is behind them:
1) the slender crystal broom outside the window around x=73–81%, y=49–55%. Fill with the same starry blue sky.
2) the UPPER bed quilt and loose pillows around x=27–40%, y=41–65%; show a simple pale lavender mattress/bed linen underneath, retain all stacked mattress edges, railings and bed supports. Remove only the snowflake-patterned thick draped quilt and loose pillows.
3) the pale translucent UPPER canopy textile: the central canopy cloth above the pillows around x=24–40%, y=27–44%, and its long left/right fabric drops around x=23–29%, y=41–85% and x=38–42%, y=41–85%. Retain the delicate structural poles, decorative finials, entire bed and all under-bed purple curtains. Fill only missing textile pixels with room background behind, seamlessly.
4) the floating crystal sphere around x=61.9%, y=68% (diameter approx 4.8% width), showing the telescope/background behind it.
Do not add anything. Do not redesign the room. Keep moonlit lighting, purple, silver and pale gold palette exactly. Same 1672 x 941 full composition, no crop, no text.

### Illuminated clean plate — final prompt

Use case: lighting-weather.
Asset type: chandelier-on background plate aligned with Image 1.
Image 1 is the exact edit target: the cleaned moonlit 1672 x 941 ice bedroom. Image 2 is ONLY the lighting reference from its original chandelier-on version.
Change ONLY the illumination of Image 1 to closely match Image 2: turn on the pure snowflake ice chandelier, enhance its gentle silver-blue light, and its tiny blue/purple ice refractions on the existing floor.
The clean plate must remain clean: NO broom, NO floating globe, NO upper bed quilt or pillows, NO upper canopy fabric. Keep the under-bed purple curtains intact. Do NOT bring back the removed objects from Image 2.
Preserve every pixel position, architecture, mattress stack, bed frame, railings, staircase, telescope, slide, trampoline, ceiling device, window, crescent and floor snowflake from Image 1. Exact same viewpoint and 1672 x 941 canvas. No crop, no redesign, no added objects, no text.

### Broom — final prompt

Use case: background-extraction.
Asset type: transparent animated broom cutout.
Image 1 is the exact source. Extract ONLY the slender ice-crystal witch broom outside the right window at x=73–81%, y=49–55%.
Make a tightly framed wide transparent asset around this original broom, preserving its diagonal left-up to right-down orientation, exact design, ivory/silver-blue slim handle, tiny delicate binding, and elegant narrow translucent faceted ice-prism tail. Complete tiny occluded edge details only. It must be the same broom from the image, not a generic or fluffy broom.
No stars, window, moon, room, light halo, smoke, background, labels. Genuine alpha transparency. Fill most of the wide canvas with the intact broom leaving a small safe transparent margin.

### Crystal shell — final prompt

Use case: background-extraction.
Asset type: transparent faceted crystal-ball shell for an interactive galaxy.
Image 1 is the exact source. Extract ONLY the floating crystal sphere centred at x=61.9%, y=68%, preserving its circular form, delicate ice facets, moonlit glass edge, blue/purple refractive glints and high quality illustrated finish.
REMOVE the little stars and luminous galaxy from the interior: the inner region should be nearly clear transparent glass so a separately animated galaxy can be seen through it. Keep subtle faceted refraction and rim highlights, not an opaque painted globe. No pedestal; this sphere floats.
Tight square crop around the complete intact sphere with small transparent margin. Genuine alpha transparency outside and largely transparent inside. No telescope, architecture, props, smoke, halo, stars, text or background. Same crystalline material and perspective as original sphere.

### Rejected fabric extraction — process prompt

Use case: background-extraction.
Asset type: registered transparent fabric layer for the exact illustrated bed in Image 1.
Preserve original FULL 1672 x 941 canvas and the original pixel positions, scale, shapes, texture and perspective. This layer will be composited on a cleaned version of Image 1.
Keep ONLY the UPPER bed textiles:
- the snowflake-patterned thick lavender quilt draping down the upper bed front around x=27–36%, y=43–67%, and any upper quilt fold on the bed around x=27–40%, y=42–46%;
- the three loose pillows across the upper bed head around x=28–37%, y=41–44%, complete their soft hidden silhouettes where necessary;
- the pale translucent canopy fabric around x=24–40%, y=27–44% and the long fabric falls left around x=23–29%, y=41–85%, right around x=38–42%, y=41–85%.
EVERYTHING ELSE must be genuinely transparent alpha, including every building/background, the mattress stack, bed frame, bed supports, ice railings, and the UNDER-bed dark purple secret curtains.
This is the original fabric extracted, not a newly designed bed. No drop shadow blocks, no checkerboard pixels, no white background, no labels. Retain fine gold embroidery, snowy filigree, sheer fabric translucency, moonlight highlights. Do not enlarge, relocate or recenter the fabric. Full original canvas.

## Verification

Automated acceptance checks: tap/hold distinction, hold-to-drag cancellation, pointer ownership/cancel, curved non-uniform recall and perspective, inertial docking at 30/60/120 fps, bounds, dropped-frame stability, separate quilt corners, pillow landing and curtain attachment, galaxy damping, room-grid / alpha registration. The existing six astronomy checks remain included in `npm run test:mafraer`.

Scoped strict TypeScript validation and production Site build are required before publication. Browser QA is unavailable in this managed session because the supported control-browser capability is absent; no browser visual/interaction pass is claimed.

