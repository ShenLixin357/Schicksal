# No.2 public mark · Garnet Red integration

Source: supplied `Schicksal_No2_Personal_Symbol_Assets_v1.zip` (README v1.0, 2026-11-22).

## Identity colour contract

The **only** representative colour used by No.2 (`zxy`) is `#D7263D` / Garnet Red / 石榴红.

It applies equally to `representativeColor`, `emblemRayColor`, `webMarkColor`, `officialMarkColor`, `atlasPersonalColor`, CSS `--citizen`, `--mark`, 2D/3D shared-emblem No.2 blade (index 1), personal profiles, greeting and login, Parliament, photos, messaging, sidebar/presence and Atlas member metadata. These UI values must be derived from `app/identity/visual-registry.ts`, never copied as independent No.2 red constants.

**The Eight-Ray common emblem is an independent collective symbol.** Its No.2 ray changes to `#D7263D`; the other seven ray colours and positions do not change. Decorative background palettes such as `ATLAS_DECORATIVE_FACETS` are not member-ID keyed, so arbitrary colour substitutions at position 1 would corrupt independently approved artwork.

## Unmodified original PNG masters

- `public/no2-personal-responsive-garnet.png` — byte-for-byte copy of `No2_Responsive_Logo_D7263D_Transparent.png`. Dimensions 1073×1073; SHA-256 `1dba227636156058944d1293a5e142a20c637f30b1b40ac6714f83cd09cd87ba`.
- `public/no2-personal-full-garnet.png` — byte-for-byte copy of `No2_Personal_Symbol_Full_Transparent.png`. Dimensions 820×994; SHA-256 `c243fd7ee99c859e268cf5b756248bb62ec461936448f0110ae3516f35422157`. Retain the original artistic red tones; do **not** flatten this painting to solid `#D7263D`.
- `app/assets/no2-login-responsive-garnet.png` — the same responsive master duplicated byte-for-byte for the statically inlined, anonymous Cloudflare entry; never replace with an unauthenticated fetch of the protected React bundle.

## Approved placements

Full original: `profile-personal-simple`, `profile-public-simple`, `atlas-personal-detail`.
All other public icon placements: responsive original. See `no2MarkAt(placement)` in `app/identity/mark-placements.ts`. The personal visual system is separate from No.2's private Lounge persona, and elections do not change the personal symbol.

No new motion asset was supplied. Existing page-level animations remain; neither approved PNG is redrawn or animated independently.

Note: `public/atlas/approved-main-emblem.webp` is a separate approved *baked illustration*, not a CSS or registry colour field. The Atlas view is an unapproved placeholder in the current preview. Changing a baked painting must be reviewed as its own artwork edit, not by recolouring pixels blindly. The **live shared emblem 2D/3D renders** are driven by the updated registry and are included in this acceptance build.

## Verification

Run `npm run test:identity-architecture` and build. GitHub Actions preview deployment is only enabled on the separate `feature/no2-garnet-identity-20261122` branch with `[preview-deploy]`; no merge, main Worker or main D1 is involved.
