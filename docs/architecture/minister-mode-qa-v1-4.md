# Schicksal v1.4 · Technology Minister acceptance checklist

**Scope:** cumulative Draft PR #9–#23. Review-only; no merge/production deploy.
**Isolated preview:** https://schicksal-ui-preview.m17686100216.workers.dev
**Release evidence:** deployed source commit SHA must equal the latest head shown by `GET /api/preview-version` after authenticated preview login.

## Two separate authentication routes (confirmed)

1. At Login, check the *sixth visible identity card* labelled **科技部部长**, decorated with the approved shared eight-ray emblem. The card is an official role, NOT a ninth citizen.
2. The ordinary member card accepts that citizen's personal password; the ministry-only card **must reject the same personal password**.
3. In an incumbent's ordinary signed-in session, long-hold the person's own mark in the sidebar for about 650 ms. This should immediately become ministry mode without a modal, password prompt or reload. The shared emblem replaces their self mark. A normal tap must still open correspondence.
4. The existing sidebar **个人页** destination becomes **科技部管理台** in ministry mode. Its content is the actual validated management dashboard, not the citizen profile plus another entry button. Other sidebar dimensions and logo behavior must remain unchanged.
5. From that management page, open **部长登录密码** and initialize the independent login password using personal-password confirmation and the NEW separate password entered twice. **Enter the intended password only in the private form; never commit it to Git.** This action saves a salted D1 hash, not plaintext.
6. Log out normally, then click the separate minister identity card on Login. It must accept the newly enrolled office password and open as the unique live minister. It must reject the individual citizen password and any previous special password.
7. The direct-minister-login session must not be allowed to convert itself into the minister's private citizen session through long hold or the switch API. Log in separately using their ordinary personal password for the private citizen view.
8. In a normal personal-login session, long-hold again from ministry mode to return to citizen mode. The sidebar label returns to **个人页**, its content is the original citizen profile and the personal emblem returns.
9. Verify the direct ministry password does **not** change when the holder changes the personal password; the latter revokes all previously authenticated sessions. Minister privilege must also be rechecked server-side.
10. When a later election changes the live technology officeholder or term, the former office credential must stop working, old direct office sessions must fail closed, and the new incumbent must initialize a new office password from their personal login.

## Evidence / limitations

- Check full click paths: Opening → Login → Welcome → mandatory Briefing → Home → icon sidebar → profile/minister console → Parliament → Archives → Lounge → games → return. Check desktop/mobile widths.
- Preview data is isolated from production D1. Do not use real sensitive family photos or production passwords.
- Separate photo R2 storage currently cannot be provisioned using the preview Cloudflare token; photo upload/recovery may be unavailable. Photo **subject-hide/minister re-publication lifecycle** is a confirmed product rule, not a completed API.
- Full historical election UI, tenure-writing audit API, and all-site administrative functions are future work. This preview validates the currently implemented foundations and selected management modules.
- Update this record only after comparing the WORKER's authenticated SHA to the exact PR head and confirming actual browser interactions (not merely source tests).
