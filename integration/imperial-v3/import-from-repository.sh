#!/usr/bin/env bash
# Run in an authenticated Git checkout, on the isolated branch only.
set -euo pipefail
BRANCH=feature/imperial-integration-v3
BASE=e5452b4517435c25004d15299d060c8f149ed0c8
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
test "$(git branch --show-current)" = "$BRANCH"
test -z "$(git status --porcelain)"
git merge-base --is-ancestor "$BASE" HEAD
case "$(git remote get-url origin)" in
  https://github.com/ShenLixin357/Schicksal|https://github.com/ShenLixin357/Schicksal.git|git@github.com:ShenLixin357/Schicksal.git) ;;
  *) echo "Unexpected origin"; exit 1;;
esac
PUSH=0
case "${1:-}" in
  '') ;;
  --push-candidate) PUSH=1;;
  *) echo "Usage: $0 [--push-candidate]"; exit 1;;
esac
START="$(git rev-parse HEAD)"
git fetch origin "refs/heads/$BRANCH"
test "$(git rev-parse FETCH_HEAD)" = "$START"
git diff --name-only "$BASE" HEAD | python3 -c 'import sys; allowed={".github/workflows/imperial-v3-intake.yml",".github/workflows/imperial-v3-foundation.yml","app/technology/technology-ministry.tsx","app/api/technology/v3-status/route.ts","app/technology/v3/status-panel.tsx","app/technology/v3/status-panel.css","server/imperial-v3/operations.mjs","server/imperial-v3/policy-runtime.mjs"}; assert all(p.startswith("integration/imperial-v3/") or p in allowed for p in sys.stdin.read().splitlines()), "Unexpected existing app changes; reconcile manually"'
PACKAGE="$ROOT/integration/imperial-v3/Schicksal_Integrated_Development_Handoff_V2_5_2026-11-27.zip"
test "$(git hash-object "$PACKAGE")" = 0e64e551680f629c6de2ce6590f600c2b867109d
# Before writing, require Git identity and authenticated confirmation of private visibility.
git var GIT_AUTHOR_IDENT >/dev/null
git var GIT_COMMITTER_IDENT >/dev/null
command -v gh >/dev/null
test "$(gh repo view ShenLixin357/Schicksal --json isPrivate --jq .isPrivate)" = true
WORK="$(mktemp -d -t imperial-v3-intake.XXXXXX)/candidate"
printf 'Local worktree: %s\n' "$WORK"
python3 integration/imperial-v3/prepare-intake.py "$PACKAGE" --repo "$ROOT" --worktree "$WORK"
git -C "$WORK" add -A
git -C "$WORK" diff --cached --check
git -C "$WORK" commit -m "Integrate cumulative V2.5 and unified Gallery; all new gates disabled"
git cherry-pick "$(git -C "$WORK" rev-parse HEAD)"
git diff --check "$START" HEAD
git diff --name-only "$START" HEAD | python3 -c 'import sys; p=sys.stdin.read().splitlines(); assert len(p)>=116 and not any(x.startswith((".github/","drizzle/","wrangler")) for x in p), "Unexpected candidate paths"'
CANDIDATE="$(git rev-parse HEAD)"
printf 'Candidate commit: %s\n' "$CANDIDATE"
# Push only an isolated preserved candidate, never main. Build acceptance follows separately.
if [ "$PUSH" = 1 ]; then
  git fetch origin "refs/heads/$BRANCH"
  test "$(git rev-parse FETCH_HEAD)" = "$START"
  git push origin "HEAD:refs/heads/$BRANCH"
fi
node --test integration/imperial-v3/foundation/*.test.mjs integration/imperial-v3/foundation/events/*.test.mjs
python3 integration/imperial-v3/foundation/domain-events.test.py
npm ci
npm test
npm run build
bash scripts/validate-artifact.sh
test "$(git rev-parse HEAD)" = "$CANDIDATE"
echo "Local checks passed for $CANDIDATE; browser/D1 acceptance remains. No deployment or migration."
