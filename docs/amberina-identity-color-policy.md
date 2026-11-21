# Amberina public identity, personal mark and placement policy

**Status: user-reviewed 2026-11-21 authoritative rule.** This supersedes all older
site-wide "light/beige means strong" assumptions and the previous 2026-11-19
placement allowlist. The historical asset experiments remain in Git only.

## Immutable source of truth
The locked `AvS_Final_Procreate_Only(1).zip` README confirms the official
Amberina personal representative colour is **#F3ED87**. The original
Simple / FullSimple–Parhelia masters are locked. The **Simple** snowflake is
the normal public identity mark; FullSimple–Parhelia is never selected unless
the owner separately requests it. All official Simple PNG pixels, alpha,
two-tone relationships and orientation must remain unchanged.

| Identity use | Colour | Constraint |
| --- | --- | --- |
| Official representative colour, scores, PTS, metadata, highlights, progress bars, leaderboard, decorative background accents | `#F3ED87` | ALWAYS original; never darken just for contrast |
| Official original Simple icon and its matching existing circles/office halo | original `#F3ED87` plus original secondary colour | Approved for 21 of 22 explicit placements |
| Strong *Simple icon only* + its existing circle and office halo | base `#EECF58` with the same RGB offset applied to original secondary pixels | Only approved for **04: logged-in Amberina's own avatar in the normal site sidebar** |
| Shared imperial eight-ray emblem | original established independent blade palette | Unrelated to Amberina badge tint; never recolour |
| Lounge mystical avatar/mask | separate private art palette | Never replace with official Simple without a separate request |

### Approved Amberina placement registry (22 exact positions)

| # | Placement key | Visible usage | Decision |
| --- | --- | --- | --- |
| 01 | `login-entry-picker` | Isolated public entrance login chooser | Original |
| 02 | `login-react-picker` | React login chooser fallback | Original |
| 03 | `welcome-identity` | Post-login Welcome | Original |
| **04** | `sidebar-main-self` | Logged-in Amberina's own online avatar on regular site | **STRONG** |
| 05 | `sidebar-lounge-self` | Own avatar on dark Committee Lounge sidebar | Original |
| 06 | `citizen-registry-card` | Citizen register identity card | Original |
| 07 | `citizen-registry-focus` | Top focused citizen card | Original |
| 08 | `profile-personal-simple` | Personal profile official Simple snowflake | Original |
| 09 | `profile-single-crystal` | Single personal crystal (not a PNG emblem) | Official representative colour |
| 10 | `profile-public-simple` | Public citizen profile | Original |
| 11 | `atlas-personal-detail` | Unapproved Atlas personal detail | Original; Atlas still hidden |
| 12 | `archive-book-cover` | Archives book cover | Original |
| 13 | `archive-reader-author` | Archives reader author mark | Original |
| 14 | `photos-filter-subject` | Photos filter controls | Original |
| 15 | `photos-upload-subject` | Photos upload person selector | Original |
| 16 | `photos-card-subject` | Photo card people markers | Original |
| 17 | `parliament-seat-speaker` | Parliament seats and person currently speaking | Original |
| 18 | `parliament-speaker-election` | Speaker candidates and elected Speaker | Original |
| 19 | `parliament-comment-request` | Comments, floor requests | Original |
| 20 | `parliament-votes-results` | Parliament ballots, voter lists, result feedback | Original |
| 21 | `messenger-contact` | Correspondence contact list, currently placeholder route | Original |
| 22 | `messenger-peer` | Correspondence thread header, currently placeholder route | Original |

A separately named `sidebar-main-other-member` guard keeps Amberina's mark
original when another member sees Amberina in their own sidebar. This is
not a new approval to darken any placement.

**Every new personal emblem or identity-coloured name occurrence requires
ASK THE USER FIRST.** Ask in Chinese:

> 这个位置的 Amberina 个人标识／名字要不要加深？
> 不加深：官方原色 #F3ED87；加深：#EECF58。

An answer for one position NEVER authorizes other positions. New locations
must be added to `app/identity/mark-placements.ts` after the user has chosen;
unknown placements must fail loudly. Existing authorized variations are
selected by placement, not by a background colour or a generic `display="web"`.

### Verified source PNG files
- Official untouched Simple 800×800 transparent crop:
  `public/amberina-personal-simple-official.png`,
  SHA256 `55b230019268fce29feb9011ba2d220f3576ec3d8c4d7659049548228b1e4823`.
- Strong web-only Simple 800×800 transparent crop:
  `public/amberina-personal-simple-gold-eecf58.png`,
  SHA256 `eebb12aa5198c44d78aa27be4368855c7ba92ba3113b1e94386bc104f6f49a74`.
  It preserves the original Alpha and two-tone offset. Never overwrite masters.

`app/identity/visual-registry.ts` holds both asset paths. Its historical
`webMarkColor`/`webMarkAsset` property names refer only to the **strong
variant**, NOT to a global web default. `app/identity/public-mark.tsx` is
the single React renderer, governed by `mark-placements.ts`. The public
login entrance is a separate HTML renderer using the same placement registry.

The original President-only circular points/halo follow the **office**,
not Amberina or logged-in state. Where they already exist, they use the
selected mark colour; never create new office points in unrelated art.
The single self-profile crystal is separate from Simple: length/width
4.236; widest at 61.8% from outward tip; upper/lower approximately 1.618.
It is a single, standalone prism in the official citizen representative
colour, NOT the shared eight-ray emblem.

**Atlas art status:** not approved. Keep navigation and visual route hidden
until a separate owner art review. Its original-colour marker decision in
row 11 is NOT permission to publish Atlas art.
