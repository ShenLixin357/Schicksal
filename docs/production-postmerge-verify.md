# Production release — 2026-11-27

Owner approved the cumulative preview and explicitly requested production publication WITHOUT any preview data. Accepted application candidate: `7bc1558d9868d163ff1122ece9dba5490d79505d`. Production-only configuration guards added: exact existing production D1 binding/name, native main-only deployment and source marker. Production read-only rehearsal [run 45885256277](https://github.com/ShenLixin357/Schicksal/actions/runs/45885256277) restored an actual production SQL export in memory, rehearsed pending migrations 0013–0020 and verified every pre-existing row without change. Recovery bookmark retained in the preflight run. Temporary export removed; no production rows or secrets committed. No preview SQL export, preview account passwords, photo objects, vase changes or game saves included. Production storage remains the original private storage. No full object-store backup was made; migrations do not mutate object bytes. Post-publication verification checks production binding, exact release marker, migration head and anonymous access. Rollback must not blindly revert the database or overwrite changes since release.

## Production deployment correction

Native Cloudflare build `0b646a03-1a1e-41a4-bb0d-908fe68b0ad2` compiled successfully but failed before migration: `wrangler d1 info` was given a UUID rather than a database name/binding. The correction uses the reviewed name (or binding `DB`) for lookup and still asserts the returned UUID and production name before any mutation. Test fixture now rejects a UUID in the name argument. No application changes, migration changes, database replacement, or preview state transfer.

## V10 public visual release

Owner approved the V10 standalone motion laboratory. Public 2D marks use shared supersampled canvas, opening 420/230/3/350/900, Loading 4300 ms / 15 beats / 30% white-mixed opaque facets, four-orbit ministry mark 2.5/13; Lounge and both passage directions are excluded. Homepage helical motion is retained with the revised geometry. No migrations, credential changes, or preview data transfer. Postmerge verification uses the proven read-only D1 SELECT API instead of the failing Wrangler execute wrapper.

## Synchronized orbit scatter release

Owner approved the opening orbit starting with blade eight at 1970 ms, preserving the original 650 ms fade and 800 ms scale ease. At the first scatter beat (3290 ms), the ring expands to 140% and fades over 360 ms, fully invisible by 3650 ms. Opening still ends at 4200 ms. Only opening visuals change. This documentation update triggers the production-only read-only release marker and original D1 verification; no preview data is transferred.
