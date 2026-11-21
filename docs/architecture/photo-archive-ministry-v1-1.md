# Schicksal · 家庭影像馆与科技部部长入口 v1.4 决策纪要
**Date:** 2026-11-21 · **Source:** 用户上传的 `03-Schicksal_Website_Product_Brief_Architecture_v1.md`（2026-08-18）  
**Status:** photo governance discussion; minister role confirmed; branch code is DRAFT only.

## Confirmed (supersedes outdated v1 photo ownership simplifications)

- Family Photo Archive remains a long-lived **collective historical archive**, not a plain uploader-owned social feed.
- Exact person-combination filtering, individual citizen symbols and a distinct imperial group-photo label remain part of the product.
- Original photo bytes and historical attribution are preserved; a deletion action should ordinarily be recoverable.
- Uploaders, pictured subjects, original providers, photographers and moderators are distinct relationships. A person pictured is not automatically the uploader.
- **Confirmed**: a pictured subject may immediately hide a photo involving them; an administrator reviews afterwards. Hidden status must be enforced by the server on lists, previews and original-file endpoints, and recorded in permanent history. **CONFIRMED:** the incumbent Technology Minister has the final authority to republish after review, even over the pictured subject's objection. Every restoration must preserve the objection and record the minister identity, decision, timestamp and written reason. This is not permission for public sharing outside the family archive.
- Subject correction and withdrawal must be designed into the archive; editing history must not disappear.
- The **Technology Minister** has full website administrative authority. The ministry entry uses the **approved eight-ray imperial shared emblem**, never the officeholder's personal mark.
- The ministry direct-login card uses an independent secret stored only as a salted hash in private D1 after enrollment (optional Worker Secret for bootstrap), and resolves the current incumbent; the citizen password must NOT work at that card. The incumbent's existing personal session may long-hold their own sidebar mark to switch modes instantly, without password entry or modal. The ministry console replaces the officeholder's personal page in minister mode; in citizen mode the original personal profile remains. Office rights are server-verified, and this is never a ninth citizen.
- Administrative actions must be auditable; an emblem or a hidden navigation control is not authentication.

## Confirmed privacy right and open design choices — do not silently pick defaults

1. **CONFIRMED (2026-11-21):** A pictured member can immediately hide a photo involving them, before administrator review. The hide must apply to protected image access, not just remove a UI card; the original file and history remain intact. **CONFIRMED:** the Technology Minister may republish over the subject's objection only through reasoned, permanently audited review. **OPEN:** Handling multiple subjects, incorrect tags, identity disputes and appeals.
2. Which metadata may uploaders edit unilaterally, and what requires review? Audit retention and version rules are undecided.
3. Should a historical `empire` group-photo label additionally index actual people pictured at the time, and how are historical rosters recorded?
4. What publication states are needed (draft, under review, published to members, restricted, hidden, trashed), and can future elders see/upload only approved subsets?
5. Separate original download, original viewing, thumbnail viewing and external sharing permissions?
6. Batch uploads, duplicate detection, storage reconciliation, recycle retention and long-term backups?

## v1.4 confirmed two-password routes and automatic role switching

- **Minister DIRECT login:** the separate ministry entry on Login requires the separately configured `SCHICKSAL_MINISTRY_DIRECT_PASSWORD` Cloudflare Worker Secret. The personal password cannot authenticate there. Rotating the D1 hash revokes existing ministry-direct login sessions without revoking the incumbent's personal login sessions. Secret values must not appear in GitHub source, public Markdown or workflow logs.
- **Incumbent QUICK switch:** from an authenticated personal session, a long hold on the incumbent's own sidebar mark immediately sends a server-authorized mode switch. No popup, no retyping either credential, and no separate in-profile ministry entry.
- **Profile replacement:** the minister console replaces the personal page only in minister mode; personal mode retains the normal profile, with the same approved per-citizen mark.
- **Succession:** live appointment records determine who can quick-switch and who the direct ministry credential logs in as. Credential rotation and office audit will be handled by future election/term flow.
- **Release limitation:** a preview Worker without a ministry secret and without an enrolled D1 hash deliberately denies direct ministry login. The incumbent can personally log in, long-hold to the manager dashboard, and set the office-only password there with personal-password confirmation; thereafter direct ministry login becomes available. `SCHICKSAL_PREVIEW_MINISTRY_DIRECT_PASSWORD` is optional, not required for setup.

## v1.3 historical decision (superseded by v1.4)

- DEPRECATED: The earlier one-password proposal has been superseded by the two authentication routes in v1.4. The current Technology Minister's personal password is no longer accepted at the separate direct ministry login.
- Password updates invalidate all existing sessions, and the new personal password applies to the personal entrance only; it never changes the independently configured ministry direct-login secret.
- Future election/appointment transactions must atomically change the single current-office authority source, preserve term history and audit evidence, then invalidate the former minister's privilege. The incoming minister uses their own personal password.
- Office titles, Welcome/profile labels, visible management entry, and server authorization must derive from the same office state. Server authorization rechecks on every privileged request; the client refreshes its snapshot on authenticated navigation/focus.
- The election UI, term-transition write workflow, historical tenure timeline and instant cross-device push updates are NOT implemented in this Draft.

## Current Draft PR implementation boundary

- Draft PR #21 contains a reversible D1 photo-trash migration and uploader/edit/delete plus account-admin restoration checks; **not** the final photo lifecycle or consent policy.
- Draft PR #22 introduced the shared-emblem minister portal and office-scoped permissions. Stacked Draft PR #23 now provides TWO credential paths: a separate Worker Secret for direct ministry login, and passwordless long-hold role switching from the incumbent's already-authenticated citizen session. It adds an additive D1 migration for current officeholders and a time-limited elevated session mode. The obsolete role-switch modal, extra in-profile ministry entry, and use of the citizen password at the direct ministry gate are removed. Photo-admin and member-access endpoints now require the elevated role; an ordinary session owned by the same officeholder is insufficient. Office authority, Welcome titles, public/member-profile office titles, and the minister entry read from the same current-office snapshot. Election/voting/term-writing UI is future work. Complete subject-hide/review and republish lifecycle APIs are **not implemented yet**.
- **All-site admin authority is a product authorization requirement, not a claim that every future administrative API or screen already exists.** No unreviewed server superuser API, direct SQL endpoint, or database credential exposure is provided.
- No production deployment, production D1 migration, permanent file deletion or art substitution is authorized by this document.

## Source authority

User's latest confirmed decisions outrank 2026-08-18 wording. The full user-reviewed updated v1.4 source is distributed separately as `03-Schicksal_Website_Product_Brief_Architecture_v1.4.md`. Other v1 modules are outside the current discussion.
