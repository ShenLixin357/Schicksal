# Schicksal repository instructions for coding agents

These are **mandatory user-confirmed rules**, not optional style suggestions.
Read this file before touching member identity art, personal marks, names,
scores, parliament insignia, or official colours.

## Amberina von Schicksal — immutable colour distinction

- **REAL / OFFICIAL representative colour: `#F3ED87`.** This colour comes
  directly from the locked Simple/Parhelia Procreate ZIP README
  (2026-11-19). It is the source of truth, NOT a website legibility colour.
- **Approved stronger display colour: `#EECF58`.** Only an opt-in colour
  for Amberina's personal Simple emblem and explicitly colour-coded *name*
  in contexts where the background is beige/ivory/light. It is **not** an
  alternate official representative colour.
- **All other identity-colour use must be `#F3ED87`:** points, score numbers,
  score bars, member identity highlights, statistics, badges not depicting
  her *personal emblem*, archive metadata, UI accents, etc. Never propagate
  `#EECF58` to an entire member card or a generic `--citizen` variable.
- The existing *badge's* inner/outer circles and President-only outer
  points belong to the personal emblem rendering: they must match the
  emblem colour in that rendering. The President dots follow the
  **office**, not the logged-in user, and never appear where no dots existed.
- **At every NEW context where Amberina's personal mark or a specifically
  identity-coloured name will be placed, ASK THE USER FIRST:** "此处要不要加深？
  不加深用官方原色 #F3ED87；加深用 #EECF58。" Do not decide from background,
  code defaults, visual aesthetics, or previous approval for a different
  context. Do not make up a third intermediate colour.
- **OWNER'S REVISED 2026-11-21 APPROVAL OVERRIDES ALL EARLIER BEIGE/WEB DEFAULTS:** The user reviewed 22 places individually. ALL use original `#F3ED87` Simple artwork except **04 — the logged-in Amberina's own avatar in the ordinary MAIN sidebar**, where the original two-tone strong version `#EECF58` is allowed. That same avatar in the dark Lounge sidebar is original, NOT strong.
- The source of truth for this per-location decision is `app/identity/mark-placements.ts`; every `PublicCitizenMark` call must supply an approved `placement`. Adding a new placement is blocked until the user specifically approves its original/strong treatment. Do not use `web` as an implicit synonym for strong, do not infer from beige backgrounds, and do not silently inherit another location's approval.
- The first public login HTML screen is independently rendered by `app/entry-screen.ts` and MUST use the official `/amberina-personal-simple-official.png`; the old bundled strong login PNG is history only. `Citizen.markColor` is now the official representative colour. Authenticated React views use explicit placements.
- The owner requested **one single 4.236:1 / 61.8%-shoulder personal crystal** in the citizen self-profile, coloured with the citizen's official representative colour, alongside the original Simple mark — NEVER the shared eight-ray emblem.
- The **Schicksal Atlas art is not approved**, regardless of asset filenames containing "approved". Keep its public nav entry and visual route gated off pending explicit art approval; preserve source/art for further private revision.
- Preserve Simple master source art, two-tone structure, original Alpha,
  orientation and official PNG. Never AI-redraw, recolour or overwrite the
  two master `.procreate` files. FullSimple-Parhelia is used **only after
  an explicit user request**; never infer use based on page importance.
- Do not recolour the shared eight-blade imperial symbol, approved art
  scenes, other members' marks, or whole-site backgrounds just to make the
  Amberina personal mark stand out.
- The source-of-truth engineering contract and badge implementation notes:
  [docs/amberina-identity-color-policy.md](docs/amberina-identity-color-policy.md).

## Deployment safety

Keep unapproved changes on an isolated preview branch/Worker with its own
preview D1. Never merge into `main`, touch production D1, or overwrite
production secrets without separate, explicit user approval. Prefer a
single consolidated commit for related changes.

## Architecture contract for any NEW public feature (Library, Gallery, government, homepage)

- **Read `docs/architecture/site-audit-2026-11-20.md` and `docs/architecture/lounge-isolation.md`** before adding a new module. Do not clone member colors, personal mark SVG code, approved PNG paths, official titles, or the eight-blade palette into that module.
- **Public identity data:** import `CITIZENS`, `getPublicMemberVisual`, `EMBLEM_BLADES`, `officeHolders`, and `isCurrentPresident` through `app/identity/public.ts` or its lightweight owner files. Approved appearance variants live in `app/identity/visual-registry.ts`.
- **Public mark UI:** use `app/identity/public-mark.tsx` / `PublicCitizenMark` and `app/emblem/compact-emblem.tsx` / `CompactEmpireEmblem` where appropriate. Home's 3D sculpture and Atlas's illustrated emblem are **distinct renderers**: do not silently redraw or recolor those while changing a compact mark. Coordinate all intended variants and obtain separate visual approval.
- **Offices, Presidency and elections:** a current president is determined by a **verified office assignment**, never by `citizen.id === "amberina"`, array index zero, display alias, a member's color, or Lounge mask. In this Draft stage `office-registry.ts` is a static baseline; a live election is **not** implemented. Do not interpret Parliament Speaker elections as Presidential elections, and do not automatically grant site-admin permissions to the elected office holder.
- **Lounge is a different identity domain.** `app/club/lounge-access.ts`, `app/club/mystic-marks.tsx`, private pseudonyms and avatar palettes remain independent from public identity rebrands and office changes. Do not import public marks into private magic art as a shortcut.
- **Module state and resources:** keep new scenes isolated/lazy, preserve authored camera/lighting/animation and CSS source order, use authenticated member-scoped APIs rather than trusting client identity claims. Keep full Gallery originals and art variants outside an ever-growing public Git directory where practicable, with D1 metadata and verified object-store backups.
- **Migrations:** never CREATE/ALTER tables on HTTP request. The additive `0014_briefing_presence.sql` is pending isolated-D1 rehearsal; applying it or publishing its dependent runtime to production needs explicit owner approval. Do not edit old sealed migration bytes.
