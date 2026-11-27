# Imperial V3 foundations (V3.0.2–V3.0.8)

Candidate modules, intentionally outside app runtime. No imports from main app, no active migration, no model call, no scheduled job, no production change. These files survive the V2.5 intake because they reside within the existing integration allowlist.

| Module | Implemented | Required before activation |
|---|---|---|
| scheduler | bounded round-robin dispatch, per-consumer leases and retry through existing outbox | authoritative domain handlers, idempotent/fenced side effects, real D1 scheduler, persisted cursor |
| incidents | durable fault/acknowledge/resolve/reopen, audit, stale sample rejection | minister API, live office/session conditional guard, trusted probes, UI and notification delivery |
| permissions | batch snapshot CAS, templates, expiry, restrictive evaluation | merge with V2.0 policy, live term/session CAS in same SQL, registry/template assignments, preview all routes; no expansion beyond base grants |
| monitor | fixed GitHub branch/runs and Cloudflare Worker settings GET adapters | least-privilege secrets and server authorization, production-safe account allowlist; no billing or traffic metrics |
| evaluation | graded recall@K, precision@K, MRR@K, nDCG@K, failure and timing | approved benchmark cases, real model quality and privacy review; no real service invoked |
| exploration | ordered stages, timed windows, hidden layers, one-time completion | immutable server-only registry and proof resolvers; authoritative eligibility in transaction; no reward grants |
| art-relations | version lineage, dependency graph, cycle checks, permission-filtered timeline | persistent collection-specific schema, version lookup, authorized edit API, UI |

Safety: the functions are internal building blocks, not authorization endpoints. Any caller must revalidate actual current permissions and live minister term, and guard side effects with authoritative transactions. Do not pass untrusted client evidence or resource IDs as proof. Scheduler abort is cooperative; a handler that ignores it can overrun a tick. At-least-once delivery requires idempotent consumers. Temporary member rules override only that member's permanent restriction until expiry. They cannot override restrictive templates or original denied capabilities. Incident acknowledgement is not resolution. No query, secret clue, chat, manuscript, token, billing data or private content is returned by external monitoring adapters. Hidden exploration totals are excluded until discovery and never alter normal completion percentage.

Run node --test integration/imperial-v3/foundation/*.test.mjs integration/imperial-v3/foundation/events/*.test.mjs on Node 24. SQL is a proposal for an isolated D1 migration review. Existing intake workflow remains gated on bundle upload. Separate foundation CI is read-only and never deploys.
