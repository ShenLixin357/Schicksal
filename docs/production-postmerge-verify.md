# Production post-merge read-only verification

After the owner's authorized PR #5 merge, inspect Cloudflare production Worker deployments, confirm the production D1 core rows remain, and probe newly added unauthenticated API route signatures. This workflow does not migrate, publish, or mutate any D1 or Worker. If the former preview-scoped credential cannot inspect the production Worker, fail closed. Do not delete preview resources until it is confirmed that the production deployment is updated and operational.
