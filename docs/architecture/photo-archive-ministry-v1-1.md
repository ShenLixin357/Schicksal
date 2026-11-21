# Schicksal · 家庭影像馆与科技部部长入口 v1.3 决策纪要
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
- The minister maintains a **separate session mode with the SAME personal-account password** from their personal citizen account; this is still one citizen, not a ninth citizen. Administrative rights follow the current officeholder and require the elevated session. Long pressing own login card or sidebar avatar opens a switcher; the gesture does not grant authority.
- Administrative actions must be auditable; an emblem or a hidden navigation control is not authentication.

## Confirmed privacy right and open design choices — do not silently pick defaults

1. **CONFIRMED (2026-11-21):** A pictured member can immediately hide a photo involving them, before administrator review. The hide must apply to protected image access, not just remove a UI card; the original file and history remain intact. **CONFIRMED:** the Technology Minister may republish over the subject's objection only through reasoned, permanently audited review. **OPEN:** Handling multiple subjects, incorrect tags, identity disputes and appeals.
2. Which metadata may uploaders edit unilaterally, and what requires review? Audit retention and version rules are undecided.
3. Should a historical `empire` group-photo label additionally index actual people pictured at the time, and how are historical rosters recorded?
4. What publication states are needed (draft, under review, published to members, restricted, hidden, trashed), and can future elders see/upload only approved subsets?
5. Separate original download, original viewing, thumbnail viewing and external sharing permissions?
6. Batch uploads, duplicate detection, storage reconciliation, recycle retention and long-term backups?

## v1.3 confirmed single-password and election policy

- A person has one personal password and two separately authorized account modes. The current Technology Minister's personal password is the minister password; no duplicate password hash is stored or administered.
- Password updates invalidate all existing sessions, and the new personal password applies immediately to both login modes.
- Future election/appointment transactions must atomically change the single current-office authority source, preserve term history and audit evidence, then invalidate the former minister's privilege. The incoming minister uses their own personal password.
- Office titles, Welcome/profile labels, visible management entry, and server authorization must derive from the same office state. Server authorization rechecks on every privileged request; the client refreshes its snapshot on authenticated navigation/focus.
- The election UI, term-transition write workflow, historical tenure timeline and instant cross-device push updates are NOT implemented in this Draft.

## Current Draft PR implementation boundary

- Draft PR #21 contains a reversible D1 photo-trash migration and uploader/edit/delete plus account-admin restoration checks; **not** the final photo lifecycle or consent policy.
- Draft PR #22 introduced the shared-emblem minister portal and office-scoped permissions. Stacked Draft PR #23 shares the incumbent citizen password, adds an additive D1 migration for live current officeholders and time-limited elevated session mode, and supports long-hold identity switching. Photo-admin and member-access endpoints now require the elevated role; an ordinary session owned by the same officeholder is insufficient. Office authority, Welcome titles, public/member-profile office titles, and the minister entry read from the same current-office snapshot. Election/voting/term-writing UI is future work. Complete subject-hide/review and republish lifecycle APIs are **not implemented yet**.
- **All-site admin authority is a product authorization requirement, not a claim that every future administrative API or screen already exists.** No unreviewed server superuser API, direct SQL endpoint, or database credential exposure is provided.
- No production deployment, production D1 migration, permanent file deletion or art substitution is authorized by this document.

## Source authority

User's latest confirmed decisions outrank 2026-08-18 wording. The full user-reviewed updated v1.3 source is distributed separately as `03-Schicksal_Website_Product_Brief_Architecture_v1.3.md`. Other v1 modules are outside the current discussion.
