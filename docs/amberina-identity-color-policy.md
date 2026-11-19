# Amberina personal emblem / representative colour — authoritative contract

Status: **current user-approved rule, 2026-11-19**. Supersedes all 35.7%,
75.3%, champagne `#EBDB92` and purple-fog website experiments. History
remains in the Git log, but those are NOT permitted active display colours.

## Source of truth

The official `AvS_Final_Procreate_Only(1).zip/README.md` states:

> Amberina 的正式个人代表色：#F3ED87。

It confirms that Simple and FullSimple–Parhelia Procreate masters are locked
and that Simple is the default emblem. The approved two-tone relationship
must be preserved. The official transparent web-crop image must not be
redrawn or replaced by new synthetic artwork.

| Semantics | Colour | Source of truth / allowed usage |
| --- | --- | --- |
| **Official representative colour** | `#F3ED87` | Permanent, everywhere ordinary member identity colour is used: scores (including PTS), progress bars, identity highlights, metadata, honour credits, statistics and general UI. |
| **Strong display colour** | `#EECF58` | Only Amberina's Simple emblem and any specifically colour-coded name, **if the user approves stronger display for that context**. Current beige/ivory-site contexts approved. |
| **Original Simple emblem** | Original `#F3ED87` main tone plus its original secondary tone | For parliament, dark/non-beige scenes, and every newly introduced context where the user declines deepening. |
| **Strong Simple emblem** | `#EECF58` primary plus the secondary tone moved by the identical RGB offsets | Existing beige/light website contexts only. Not a new master. |

## Mandatory question for future contexts

Before introducing **any new appearance** of Amberina's personal emblem
or a specifically identity-coloured name, always ask:

> 这个位置的 Amberina 个人标识／名字要不要加深？
> **不加深：官方原色 #F3ED87；加深：#EECF58。**

An answer for one page does NOT grant permission to alter all other pages.
For already approved situations, no extra question is needed:

- **Currently approved stronger `#EECF58`:** login chooser, Welcome,
  main ivory/cream pages, member registry and focus card, archive book
  marks, ordinary sidebar, live presence, and personal-profile mark
  when rendered on the normal cream site shell.
- **Currently approved original official colour:** parliament **all**
  marks (Speaker, candidates, seats, commenters, voter marks and
  requests), plus sidebar when the dark Committee Lounge is open.
  Other explicit non-beige/dark surfaces likewise use original artwork.
- **Never strengthen** ordinary identity metadata, points, leaderboards,
  labels, score bars, user highlight backgrounds, or the shared emblem.
  Those always draw their official representative colour independent of
  the chosen personal-emblem variant.

Only two active variants exist:
`public/amberina-personal-simple-official.png` — unchanged Procreate
Simple crop, and `public/amberina-personal-simple-gold-eecf58.png` —
website-only, exact pixel-by-pixel RGB remapping, original Alpha identical,
original shape and secondary-color separation retained. The latter has
SHA256 `eebb12aa5198c44d78aa27be4368855c7ba92ba3113b1e94386bc104f6f49a74`.
The original SHA256 is
`55b230019268fce29feb9011ba2d220f3576ec3d8c4d7659049548228b1e4823`.

Code contracts:
`AMBERINA_OFFICIAL_COLOR`, `AMBERINA_WEB_MARK_COLOR` and
`citizenRepresentativeColor` in `app/citizens.ts`; `CitizenMark`
with `display="web"|"official"` in `app/page.tsx`. The President's
halo is still determined by `hasLeaderInsignia(citizen)` and coloured
with the same per-mark `--mark`. No purple fog or background plate.
The historic `Citizen.accent` for the artistic shared eight-blade
symbol is a separate illustration palette: preserve that artwork,
do not use it as the official representative colour for scores.
