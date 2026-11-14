# Regression and release baseline

`npm run check` generates pinned local Cloudflare types, performs strict whole-project type checking, and discovers every `tests/*.test.mjs` and `tests/*.test.ts`. The CI baseline is Node 24. New tests no longer need manual additions to a long script chain. Generated types stay untracked.

Coverage includes private login/assets/session revocation; election roles and results; photo storage; public chat/history; game engines and score synchronization; fan/room mechanics and star catalogue; original aquarium and native file saves; cello audio, scores, media, permissions and melodies; migrations, deployment and backup/recovery. Missing committed assets are failures, not silently skipped checks. The obsolete starter preview-meta assertion is replaced by actual private-entry tests.

`Schicksal quality` checks every PR and main push, with no path filters. Core regression does not depend on native compilation; production build follows core. The separate native-engine workflow remains scoped to engine changes. No CI workflow here publishes the Worker or migrates production.

Workflow files do not configure repository rulesets. If supported by the existing repository plan, require **Core regression** and **Production build** before merging. No paid setting is enabled. The release build command also runs the check gate independently of branch protection.

Parliament's general document/vote commands still need atomic state/audit and concurrency work in a later phase; election tests do not imply those issues are fixed. Real-device visual checks and a production-data isolated restore remain separate tasks.
