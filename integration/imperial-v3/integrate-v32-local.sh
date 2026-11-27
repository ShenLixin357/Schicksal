#!/usr/bin/env bash
# Local candidate assembly only. No Actions, remote writes, cloud commands, or migrations.
set -euo pipefail
root="$(git rev-parse --show-toplevel)"
cd "$root"
test "$(git branch --show-current)" = feature/imperial-v32-review
test -z "$(git status --porcelain)"
test "$(git remote get-url origin)" = "https://github.com/ShenLixin357/Schicksal.git" || {
  echo "Check origin explicitly before integration; HTTPS private repository expected."; exit 1;
}
base=e5452b4517435c25004d15299d060c8f149ed0c8
git merge-base --is-ancestor "$base" HEAD
bundle="$(find integration -type f -name 'Schicksal_Integrated_Development_Handoff_V2_5_2026-11-27.zip' -print -quit)"
if test -z "$bundle"; then bundle="$(find . -maxdepth 3 -type f -name 'Schicksal_Integrated_Development_Handoff_V2_5_2026-11-27.zip' -print -quit)"; fi
test -n "$bundle"
test "$(git hash-object "$bundle")" = 0e64e551680f629c6de2ce6590f600c2b867109d
stage="$(mktemp -d)/candidate"
python3 integration/imperial-v3/prepare-intake.py "$bundle" --verify-only
python3 integration/imperial-v3/prepare-intake.py "$bundle" --repo "$root" --worktree "$stage"
git -C "$stage" add --all
git -C "$stage" commit -m 'Assemble canonical cumulative intake from verified repository bundle'
echo "Candidate worktree: $stage"
echo "Merge must preserve R5, V3.1 and V3.2; never overwrite conflict files wholesale."
if ! git merge --no-ff --no-commit local/imperial-v3-intake; then
  git diff --name-only --diff-filter=U
  echo 'STOP: resolve overlapping R5 and cumulative source hooks manually, retaining both sides.'
  exit 2
fi
echo 'Review staged changes, run tests and build before committing. Nothing pushed or deployed.'
