> **CURRENT RULES (2026-11-21):** See the authoritative [Amberina identity colour policy](amberina-identity-color-policy.md) and `app/identity/mark-placements.ts`. The owner re-reviewed 22 locations: **all original Simple #F3ED87 except the logged-in Amberina's own ordinary-site sidebar avatar (#EECF58)**. Every other old beige/web auto-strong treatment below is historical only, NOT active. New locations require asking the owner first.

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

## Current decision: 75.3% for the *glyph only*, official identity colour elsewhere (2026-11-19)

This supersedes the 35.7% temporary web display documented above.

- Official representative colour: `#F3ED87` — all personal representative UI accents, including Amberina's Honors & Scoreboard row, selection/highlight tint, and other member-representative decoration. The main shared eight-colour emblem retains the existing `Citizen.accent` entry: do **not** alter the shared design.
- New website Simple glyph colour: `#F1E17E` (75.3% RGB interpolation from `#F3ED87` toward `#F0DD7B`). This tint is **only** applied to the personal mark graphic, its pre-existing circular border/ring, and the President office halo/dots shown with that mark. Other UI colours are not darkened just because they relate to Amberina.
- Derived web asset: `public/amberina-personal-simple-web753.png` (800 × 800 transparent); SHA-256 `6f2b94be6c80df63fe0a97fd216b68aa6099d975a5ea7798cbb3841ebb7ef3e4`. From the official Procreate QuickLook crop, non-transparent RGB channels get offset (-2,-12,-9) with original alpha intact. Two-tone relationships and shape preserved.
- Original-colour asset for explicitly suitable dark scenes: `public/amberina-personal-simple-official.png` (800 × 800, SHA-256 `55b230019268fce29feb9011ba2d220f3576ec3d8c4d7659049548228b1e4823`) copied unchanged from the extracted Procreate QuickLook crop.
- `CitizenMark` is the only central renderer. Default `display="web"` uses the web asset and web `--mark` for its surrounding rings and President halo; `display="official"` (used at the elected meeting Speaker's dark parliament stage) switches **both** artwork and ring/halo to `#F3ED87`.
- Login selector and post-login Welcome both use the shared CitizenMark, now with a **new asset URL** so the browser does not reuse a cached old PNG. The empire's eight-blade symbol in the login header and opening remains unchanged.
- `citizenRepresentativeColor` selects official colour for Amberina's non-glyph UI accents and preserves every other member's existing accent. The personal Profile layout and style are expressly deferred.
- The earlier `public/amberina-personal-simple.png` 35.7% asset is retired to prevent accidental fallback.

## Current user-approved design: official original + navy-violet transparent fog (2026-11-19)

This **supersedes the earlier 35.7% and 75.3% tint decisions** for the active site renderer.

- **Actual visible PNG** is ONLY `/amberina-personal-simple-official.png`, exact 800×800 crop of the official unmodified Procreate Simple QuickLook source, SHA-256 `55b230019268fce29feb9011ba2d220f3576ec3d8c4d7659049548228b1e4823`. Neither pixel nor alpha channel is changed, and Parhelia is not activated.
- Amberina `CITIZENS.markColor` and the existing circle, inner ring and President office outer points are all **official `#F3ED87`**, not the old 75.3% website tint. Other members' marks and the imperial emblem are unchanged.
- Behind this original image only: independent CSS `app/amberina-personal-fog.css`, fog RGB `#000A4C`, center alpha **56%**, diameter **270px**, blur **32px**, fading to fully transparent at **77%** radial stop. Exact independent visual lab source: 218px mark + 270px spread + 32px blur. Relative-size CSS with container query units re-scales the fog to 270/218 = 123.8532% badge width, and blur to 32/218 = 14.6789% badge width; on a 38px icon, this produces ~47px fog with ~5.6px blur, instead of uncontrolled 270px clouds in sidebars. Alpha gradient stops at 0% (0.56), 28% (0.4312), 53% (0.1792), 77% (0).
- Fog is a new **transparent DOM/CSS layer behind artwork** `<span className="citizen-mark-mist"/>` inside the shared `CitizenMark`, not a circle/solid background plate, not a raster change, and not a replacement for the existing leader halo/rings.
- The same official snowflake now renders at login identity selector, welcome, online sidebar, archives, honors (if the mark appears), regular parliament seats and dark meeting Speaker; only its adaptive fog responds to badge size. The existing dark Speaker exception no longer needs a separate graphic source because all contexts use the official art.
- Original website V2.6 color palette remains intact; no oat/green site theme is reintroduced. No changes to profile-specific layout.
- The legacy `web753` PNG is retained as unused historical asset, to avoid destructive changes to source references; no active renderer points to it.

## Finalized champagne-gold web badge (2026-11-19; supersedes purple-fog prototype)

- Web-only Amberina personal Simple main colour: **`#EBDB92`**, computed in RGB as **70% `#EAD98C` + 30% `#EEDFA1`**. RGB channels (235,219,146).
- `public/amberina-personal-simple-champagne.png` derived **pixel-exactly** from original 800×800 transparent Procreate Simple preview crop `public/amberina-personal-simple-official.png` by applying per-channel delta (-8,-18,+11) to nontransparent pixels. This keeps the exact untouched alpha channel, the original two-tone differences and the official shape/orientation. Derived image SHA-256: `ee49a02590aaf230dbfd22e04df5d910350c238abbad43309fd2344e679c406a`.
- For all *ordinary* Amberina `CitizenMark` renderings — login/member picker, welcome, sidebar, presence, archives, seats etc. — `markColor`/`--mark` is `#EBDB92`. Existing badge outer circle, inner circle, and President-office-only halo/dots get that same web shade, with prior line opacity values preserved.
- The **meeting's elected Speaker badge** (dark parliament background) explicitly uses `display="official"`; this switches both artwork and the circle/President halo to **unmodified official colour `#F3ED87`**. Other meeting seat badges continue to use ordinary web marks.
- All non-badge identity accents (member highlights, Honors & Scoreboard, etc.) remain at official representative `#F3ED87` via `citizenRepresentativeColor`. Other members' colours and the imperial eight-colour emblem are not changed.
- Remove the experimental `#000A4C` fog completely: CSS import and fog file removed, fog child element removed. The remaining personal badge has transparent backing; no new disk, plate, haze or artwork filter. The official Procreate masters and `public/amberina-personal-simple-official.png` are never edited.
- The earlier 35.7%/75.3% assets may remain in Git history, but are **not** selected in the active CitizenMark renderer. Original V2.6 page palette and personal Profile layout continue unchanged.
