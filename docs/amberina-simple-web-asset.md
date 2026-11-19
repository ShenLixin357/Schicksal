# Amberina von Schicksal — official Simple web identity

Source of truth: user-uploaded `AvS_Final_Procreate_Only(1).zip` (2026-11-19).

- `Simple/AvS_Personal_Emblem_Simple_FINAL.procreate` is the default for **all** ordinary citizen identity marks.
- `FullSimple-Parhelia/AvS_Personal_Emblem_FullSimple_Parhelia_FINAL.procreate` must not be used without an explicit request.
- The previously committed `AvS_Personal_Emblem_Simple_FINAL.png` from an older ZIP is **not visually orientation-identical** to the actual Simple Procreate QuickLook image. Its longest axis is horizontal; the official Procreate preview has its longest axis vertical. Do not substitute the old PNG again.
- The site asset `public/amberina-personal-simple.png` is a pixel-exact **crop**, not a recreation, of `QuickLook/Thumbnail.png` stored **inside** the official Simple Procreate document. Source image: 944 × 1024 RGBA; source crop: left=100, top=128, right=900, bottom=928; result: 800 × 800 RGBA. No rotation, recoloring, interpolation, anti-aliasing beyond Procreate's supplied thumbnail, or source-master changes. Crop removes empty transparent outer margins so small UI badges stay legible.
- SHA-256 of PNG: `55b230019268fce29feb9011ba2d220f3576ec3d8c4d7659049548228b1e4823`.
- For future print/full-resolution work, export directly from the locked Procreate document; do not upscale this QuickLook-based web icon.
- The original `CitizenMark` circular outer border, inner ring, and gold peripheral halo/ray dots are *site UI decoration*, **not** part of the image master. Preserve them wherever `CitizenMark` already rendered. Do not add rings/dots to unrelated illustrations, the empire's shared eight-color emblem, or other placements that previously lacked them.
- The sidebar's real online-member display continues to use the same `CitizenMark` component: maintain existing locations, click-to-public-profile behavior, and no additional status dots, names, counts, or topbar duplicates.
- Official personal representative color: `#F3ED87`. Do not mutate the original Procreate artwork to change contrast on a light background.

## Leadership halo semantics

The existing outer points/ray halo on a citizen icon mark the **President of the First Empire** office, not Amberina, not the current login, and not an online-presence indicator. The shared inner circular CitizenMark frame stays where it already existed. `hasLeaderInsignia(citizen)` derives the halo from `citizen.office`; a new officeholder inherits the halo, while the previous one loses it. At present `CITIZENS` stores the office statically. Future dynamic office elections must update from authoritative server records before this marker can change live. Do not introduce a new dot badge anywhere else.

## Confirmed web display tint — 35.7% (2026-11-19)

- Official representative colour remains `#F3ED87`; it is not changed in the locked Procreate Simple/Parhelia files.
- Website rendering tint is **35.7% RGB interpolation** from `#F3ED87` to README's suggested `#F0DD7B`. Rounded web base colour: `#F2E783` (242,231,131).
- The cropped 800x800 transparent Simple image is recoloured pixel-by-pixel by RGB offset **(-1,-6,-4)** on nontransparent pixels, with its Alpha channel bit-identical to the original extracted Procreate QuickLook image. Source secondary colour `#F2E984` thus becomes `#F1E380`; all native two-tone and antialias variations remain, with no redraw or shape edits.
- Git file `public/amberina-personal-simple.png` is the **web-display copy only**, SHA-256 `a4476f7946aa4d5a5f23e44a74a1b9cf621cd48f17a1760ce6572be79aae4ffb`. Do not replace source masters.
- Every existing `CitizenMark` circular border/inner ring reads its own `--mark` colour. The existing `.citizen-mark.leader` halo/dots use the same `--mark` base instead of hard-coded amber/orange rgba. Alpha differences for subtle lines are allowed; no independent hue.
- Existing circular book-cover and reader-author marks are also bound to the same member `markColor`. This corrects formerly blue rings around the Amberina mark while retaining their original circle shapes.
- Do not recolour the shared eight-colour imperial emblem (`Citizen.accent`), other members' identity colours, or unrelated decorative UI.
