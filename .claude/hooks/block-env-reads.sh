#!/bin/sh
# Blocks Bash commands that name a .env* file. The deny rule in settings.json
# covers Read, Grep and Glob, but it doesn't apply to Bash.
command=$(jq -r '.tool_input.command // empty')
if printf '%s\n' "$command" | grep -Eq '(^|[^[:alnum:]_.-])\.env'; then
  echo "Blocked: this project doesn't let Claude read .env* files. Ask the user for the value you need." >&2
  exit 2
fi
