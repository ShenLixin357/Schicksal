# User-approved preview removal, 2026-11-19

Owner requested moving PR #5 to the main website and deleting the isolated Worker and D1 after successful production verification. PR #5 merged at 8b5de8975183940d1e833204655318d267a020fa. Latest main 8036ebea431cef8af6af222d047c828805de5446 passed Cloudflare Workers Builds and the read-only production D1/endpoint verification.

This branch-only workflow verifies the current main Cloudflare success, exact Worker names, D1 UUID inequality, and production APIs before it deletes ONLY Worker schicksal-briefing-preview and D1 schicksal-briefing-preview-db. Production Worker schicksal, production DB schicksal-db, Supabase and member records must remain intact. This is an irreversible deletion of the isolated preview's test data. The old preview redeployment workflow is also removed from this branch to prevent accidental recreation.
