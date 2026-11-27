# Imperial V3 event outbox — isolated candidate
Status: code and local SQLite tests; NOT integrated into application runtime.
This directory is intentionally within the existing intake allowlist. It does not replace any V2.5 files, active migrations, Workers, CI or user interfaces.

## Contract
- Internal authoritative producers only. Use a stable opaque resource ID and monotonic domain revision, not a query, manuscript, chat, password, asset URL or user-entered text.
- Insert the event and its fanout in the domain transaction (D1 batch). A rejected/no-op conditional domain write must not emit a success event. Use an authoritative postcondition or a domain trigger when implementing a producer.
- Book/collection/permission changes notify search and observatory; discoveries notify exploration and observatory; health changes notify observatory only.
- Each consumer has separate delivery state, lease, retry backoff and dead-letter state. A stale lease cannot acknowledge another worker's delivery.
- Delivery is at-least-once, NOT exactly-once side effects. Consumer actions must themselves be idempotent by event ID, and validate current authoritative state and access. A queue entry never authorizes a privileged action, reveals a locked secret or grants an award.
- Summary reports only counts by consumer and state. A future minister-only endpoint must use actual elevated-session auth. No public endpoint or background worker included.

## Adoption order
1. Complete V2.5 intake and review actual domain schemas. Review D1 transaction, clock and primary-read behavior; run independent preview database migration and concurrent integration tests.
2. Wire book publish, collection changes, permission changes and verified discoveries to authoritative transactions. Do not emit on failed CAS. Use current-state authorization and revision guards.
3. Bind bounded consumer handlers, then scheduled preview delivery; verify retries and idempotent side effects. Use opaque events for reconciliation, not copied private content.
4. Expose count-based diagnostics to the technology minister. Review authenticated retry/replay, retention, storage quotas, rate limits, leases and fencing at side-effect boundary before live activation.
5. Keep all activation disabled pending user approval. No automatic rewards, external notifications or model calls.

## Test
From repository root: node --test integration/imperial-v3/foundation/events/outbox.test.mjs
Node 22.16 local SQLite: 9 tests passed. This is not real D1, whole-site, remote CI or deployment acceptance.
SQL is a proposal only. Do not add to production migration manifest.
