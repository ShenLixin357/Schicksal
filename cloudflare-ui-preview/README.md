# Cloudflare Workers Builds root — isolated Schicksal preview

This directory is used only as the **Builds root directory** to satisfy Cloudflare's requirement that the Wrangler `name` equals the connected Worker `schicksal-ui-preview`. **Do not** rename the repository-root `wrangler.json`; it belongs to the main Schicksal Worker.

Set these for the connected `schicksal-ui-preview` Worker:

- Production branch: `feature/minister-dual-account-switch-20261121`
- Root directory: `cloudflare-ui-preview`
- Build command: `cd .. && npm ci && npm run test:privacy && npm run test:identity && npm run db:check && npm run build`
- Deploy command: `cd .. && node scripts/cloudflare/deploy-ui-preview-builds.mjs`

Configure BUILD variables `CLOUDFLARE_ACCOUNT_ID`, `SCHICKSAL_PREVIEW_D1_ID`, `SCHICKSAL_PROD_D1_ID` before enabling builds. All deployment/migration operations are checked again by the deploy script before execution. Its Wrangler config is separately generated with the preview Worker name, preview-only D1 binding and assets path.

The local `fallback-gate.mjs` is intentionally nonfunctional: if someone accidentally uses the default `npx wrangler deploy` command within this directory it can at worst serve HTTP 503 on the *preview Worker*; no personal data or production binding is accessible.

Never enable automatic Builds until the correct deploy command, environment variables, and permissions are reviewed.
