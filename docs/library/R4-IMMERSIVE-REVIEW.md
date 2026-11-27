# R4 immersive manual review fixes

User acceptance feedback: persistent loading until first painted frame; borderless library with collapsed navigation and only candle/window/dome/original artwork settings behind a circular imperial emblem; A book hover misaligned.

- Persistent React entrance overlay spans lazy chunk, native stylesheet, document index, scene assets, first synchronous canvas render. One overlay, no artificial wait. Native boot timeout 60s, retry and exit without logout. Reduced motion remains honored by existing engine. Scene loading cannot signal ready after disposal/failure.
- Library starts with temporarily collapsed sidebar; user may expand it, other sections retain their previous preference. Full available viewport, correct scene aspect, no header or separate catalog button. In differing aspect ratios the painting fills the surrounding space; never crop book hit locations. Central crest still opens book search. Only 4 public settings. Existing authorized local debug tools preserved. All flag/ladder interactions remain discoverable on the scene.
- A sprite opaque pixels match original painting at (1618,432) with zero RGB error. Its repair origin (1585,420) remains unchanged. Other book art and all approved trajectories unchanged.
- Gentle/strong flag actions remain distinct; recording in future V2.5 exploration requires integration of the existing registry, not client-only reward. No exploration records are invented on R4.
- Branch is isolated from approved R4 and cumulative V3; reconcile this change with V2.5's exact-baseline transforms after intake. No Actions activation, deployment, database changes or production merge.

Acceptance required: cold and warm cache loading, error/exit/reentry, desktop/mobile scene sizing, sidebar restoration, single crest click, original compare, flag short/long press, A hover and roundtrip.
