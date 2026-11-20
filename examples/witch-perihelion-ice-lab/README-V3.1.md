# The Witch’s Perihelion · V3.1 — Ornate Snowflake & Original-Style Sharp Shatter

**Independent visual tuning branch. Not published on the live Schicksal site.**

## Preview

[Open the V3.1 animation HTML](./crystalline-witchcraft-v3-1.html). On GitHub, click **Raw** and save the file as HTML; open locally in Safari or Chrome. Upload your original Witch card back and front assets (or a ZIP containing `front.webp`, `back.webp`) in the import panel to view the effects on real art. The default art is an explicitly labelled placeholder.

Compare against [unchanged V3](https://github.com/ShenLixin357/Schicksal/blob/demo/witch-perihelion-crystalline-witchcraft-v3-20261120/examples/witch-perihelion-ice-lab/crystalline-witchcraft-v3.html).

## Exactly two intended changes

### 1. Snowflake artwork, growth logic and fine structure

The former relatively simple six-arm construction now features:

- Strict six-axis geometry at 60° intervals, with deliberately **slightly irregular arm length**.
- True thin faceted main crystal blades, with an **open split longitudinal spine**.
- **Three pierced needle-shaped apertures per major arm**, plus additional open eyelets between ribs.
- **Ten staggered pairs of secondary branches on each arm**; selected ones produce a third generation of fine crystal thorns.
- Curved lace-like ice bridges near the ribs; an **interlaced central sixfold rosette**, concentric hexagonal rings and elongated open cathedral-ice apertures between the main rays.
- Outer fine frost filaments, separate from the main snowflake, appear later.
- Controlled pale-blue, pearl-white and a few muted champagne facet glints. No metallic yellow rewrite, thick glow or plastic snowflake.
- The entire motif is *procedurally grown* from the same center as the magic beam rather than scaled up from a static icon.

The filigree has **open negative spaces** between its lines and frames, so it remains airy despite the new intricate branches. It is an artistic approximation based on the approved sixfold / sharp / pierced snowflake design direction; it is not a claim to have pixel-traced the earlier uploaded isolated PNG.

### 2. Return to the dramatic original-style shattering

- Replace V3's **168 tiny triangular fragments** with **18 LARGE irregular triangular wedge plates**.
- Each plate covers a substantial portion of the card, so the shell breaks into broad sharp pieces instead of powder.
- The 18 triangles are an **irregular Delaunay mesh**, with an interior fracture node at the crystal center and uneven nodes around the card perimeter. They are not aligned to a regular rectangular grid, uniform pizza slices or V2's bulky Voronoi cells.
- Crack light propagates first in six principal directions from the snowflake core, then sprouts secondary fissures.
- The main ice slabs break loose **after a brief intact crack-growth pause** (starting about 23–50% into the shatter), rotate, translate outward, then fall.
- Long jagged edges catch sharp silver-white highlights as they tilt. The original card face appears under the retreating shell, with no flip.
- **No extra burst of dozens of tiny chips** and no blanket white flash.

## Unchanged from V3

- First-stage ornate centered spell summoning (24 curved strands, celestial circles).
- Optical freezing material: early-stage **Refraction**, grazing **Fresnel-inspired reflection**, multi-scale **Frost Scattering**.
- Complete frozen shell hides the original back; **never auto-breaks**; click releases the fracture sequence.
- No 3D flip; the real card face is revealed.
- Adjustable overall speed **0.5–2.0×**, individually tunable summon/growth/break durations, pause, restart, single-frame stepping and drag-to-scrub timeline.
- Independent test modes: full sequence, summon, growth, frozen material and fracture.
- Image/ZIP import; original artwork remains untouched.
- Neither `main` nor the accepted `Solstice Dendrite` files and branches are changed.

## Engineering validation

Performed via GitHub source inspection and a sandboxed JavaScript clock+Canvas2D mock:
- HTML JavaScript syntax and referenced DOM element IDs: pass.
- Large-shard triangulation: **exactly 18 nondegenerate polygons**, no holes (triangle areas sum to the card area) at 120×180, 172×258, 270×405 and 350×525.
- Full progression held in the frozen state beyond completion, waited for click, broke into 18 fragments and revealed the front. Timeline scrub, double-speed, material mode and single-frame step passed simulation.
- Unrelated magical summon, WebGL shader, optical controls and timing/state machine match V3, barring a harmless newline/label version change.

Still pending: **real Safari GPU compilation, visual playback and original-art calibration**. This should be evaluated on the source Witch card art before acceptance. The previous original historical witch-ice-card.js was not directly extracted from the supplied old ZIP in this runtime. V3.1 is an independent art-direction experiment, not a patch of that legacy JS.

## Acceptance checklist

- [ ] The snowflake appears noticeably more luxurious and elaborate while retaining six clear long slender axes.
- [ ] Carved open needle holes and fine secondary ribs remain readable at normal viewing size.
- [ ] Entire back is concealed when frozen.
- [ ] No automatic shatter; a click produces an initial visible crack propagation.
- [ ] Fragments are **large, pointed, triangle-like ice plates** resembling the first approved art direction, not V3 fine chips.
- [ ] The real original front is revealed underneath, without a flip or ghost frame.
- [ ] Everything outside snowflake and fracture is visually unchanged relative to V3.

Approved design lineage: Lady Mafraer’s private moonlit ice palace; the 17-rib articulated lace fan for independent growth instead of scaling a bitmap.
