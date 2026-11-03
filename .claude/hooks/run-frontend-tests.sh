#!/bin/sh
# Runs Vitest at the end of a turn when frontend/ has uncommitted changes.
# Failures go back to Claude once. stop_hook_active marks the retry, where a
# second failure warns the user instead, so an unfixable test can't loop forever.
active=$(jq -r '.stop_hook_active // false')
cd "$CLAUDE_PROJECT_DIR/frontend" || exit 1
[ -n "$(git status --porcelain -- .)" ] || exit 0
output=$(mise exec -- npm test --silent 2>&1) && exit 0
if [ "$active" = true ]; then
  jq -n '{systemMessage: "Frontend tests are still failing after one retry."}'
  exit 0
fi
printf '%s\n' "$output" >&2
exit 2
