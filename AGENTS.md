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
- Current *already-approved* display exceptions: on existing beige/light
  standard website surfaces use `#EECF58` for her Simple emblem + its
  own circle/leader decorations; on the parliament (including all seat,
  candidate, commenter and Speaker insignia) and other non-beige/dark
  surfaces use the exact **original `#F3ED87`** art and matching rings.
  A dark Committee Lounge sidebar likewise uses the official original.
  Other members' original colours are unaffected.
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
