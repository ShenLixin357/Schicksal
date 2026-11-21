# Schicksal · 家庭影像馆与科技部部长入口 v1.1 决策纪要
**Date:** 2026-11-21 · **Source:** 用户上传的 `03-Schicksal_Website_Product_Brief_Architecture_v1.md`（2026-08-18）  
**Status:** photo governance discussion; minister role confirmed; branch code is DRAFT only.

## Confirmed (supersedes outdated v1 photo ownership simplifications)

- Family Photo Archive remains a long-lived **collective historical archive**, not a plain uploader-owned social feed.
- Exact person-combination filtering, individual citizen symbols and a distinct imperial group-photo label remain part of the product.
- Original photo bytes and historical attribution are preserved; a deletion action should ordinarily be recoverable.
- Uploaders, pictured subjects, original providers, photographers and moderators are distinct relationships. A person pictured is not automatically the uploader.
- **Confirmed**: a pictured subject may immediately hide a photo involving them; an administrator reviews afterwards. Hidden status must be enforced by the server on lists, previews and original-file endpoints, and recorded in permanent history. The administrative decision on re-publication without the subject's consent is **not yet approved**.
- Subject correction and withdrawal must be designed into the archive; editing history must not disappear.
- The **Technology Minister** has full website administrative authority. The ministry entry uses the **approved eight-ray imperial shared emblem**, never the officeholder's personal mark.
- The admin role belongs to the office held by an authenticated citizen; it is not a new account or a ninth citizen. Office changes must transfer authorization.
- Administrative actions must be auditable; an emblem or a hidden navigation control is not authentication.

## Confirmed privacy right and open design choices — do not silently pick defaults

1. **CONFIRMED (2026-11-21):** A pictured member can immediately hide a photo involving them, before administrator review. The hide must apply to protected image access, not just remove a UI card; the original file and history remain intact. **OPEN:** May an administrator ever republish over the subject's objection? How to handle multiple subjects or missing/incorrect subject tags?
2. Which metadata may uploaders edit unilaterally, and what requires review? Audit retention and version rules are undecided.
3. Should a historical `empire` group-photo label additionally index actual people pictured at the time, and how are historical rosters recorded?
4. What publication states are needed (draft, under review, published to members, restricted, hidden, trashed), and can future elders see/upload only approved subsets?
5. Separate original download, original viewing, thumbnail viewing and external sharing permissions?
6. Batch uploads, duplicate detection, storage reconciliation, recycle retention and long-term backups?

## Current Draft PR implementation boundary

- Draft PR #21 contains a reversible D1 photo-trash migration and uploader/edit/delete plus account-admin restoration checks; **not** the final photo lifecycle or consent policy.
- The technology-minister Draft PR switches the implemented photo-management and member-access checks to the current `technology` office and adds an entry through the officeholder's personal profile. It renders the approved shared emblem and checks the server-side session at `GET /api/technology`.
- **All-site admin authority is a product authorization requirement, not a claim that every future administrative API or screen already exists.** No unreviewed server superuser API, direct SQL endpoint, or database credential exposure is provided.
- No production deployment, production D1 migration, permanent file deletion or art substitution is authorized by this document.

## Source authority

User's latest confirmed decisions outrank 2026-08-18 wording. The full user-reviewed updated v1.1 source is distributed separately as `03-Schicksal_Website_Product_Brief_Architecture_v1.1.md`. Other v1 modules are outside the current discussion.
