# Imperial V3 — isolated cumulative intake

Status: **awaiting original bundle upload; application integration has not yet run.**

Accepted baseline: `e5452b4517435c25004d15299d060c8f149ed0c8`.
Target: `feature/imperial-integration-v3` only.

Upload the original, unchanged `Schicksal_Integrated_Development_Handoff_V2_5_2026-11-27.zip` to this directory on this branch, not main. It contains four exact packages; R4 is already present on the base. The intake workflow verifies their SHA-256 digests and ZIP integrity, then runs the original guarded overlay transforms in a separate worktree. It commits the integrated candidate only to this branch and starts an independent whole-repository regression and build job. A failed test must not be represented as accepted. If the intake itself fails, no application candidate is pushed.

No production database, Worker, migration, AI model, bucket or deployment operation is authorized. No Cloudflare environment or credentials are supplied to these jobs. All new feature gates remain disabled; separate preview setup and browser acceptance still require review. The archive includes source material and private designs, so keep the repository private. The bundle is retained as source provenance, not served in public assets. Never use a force push, merge main or run deploy commands. Keep the approved R4 branch intact.

If GitHub Actions is disabled, workflow creation is blocked, or the run fails, use a connected coding workspace with a real authenticated Git checkout. Run `python3 integration/imperial-v3/prepare-intake.py /absolute/path/to/bundle.zip --repo /path/to/checkout --worktree /path/to/new-worktree`. Review the changes and preserve them on the target branch only. The support SQL files are proposals, not numbered production migrations. The original package tests/tools remain in the unchanged archive.
