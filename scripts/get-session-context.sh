#!/usr/bin/env bash

# Finds the current session's transcript and serializes it as a context package.
# Used by the /step-back skill via bash injection.
#
# Requires: CLAUDE_SESSION_ID environment variable (set by Claude Code in skill context)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -z "${CLAUDE_SESSION_ID:-}" ]; then
  echo '{"error": "CLAUDE_SESSION_ID not set — cannot locate transcript"}'
  exit 0
fi

# Find the transcript file for this session
TRANSCRIPT=$(find ~/.claude/projects/ -name "${CLAUDE_SESSION_ID}*.jsonl" -not -path "*/subagents/*" 2>/dev/null | head -1)

if [ -z "$TRANSCRIPT" ]; then
  echo '{"error": "Could not find transcript file for session '"${CLAUDE_SESSION_ID}"'"}'
  exit 0
fi

node "${SCRIPT_DIR}/serialize-context.js" "$TRANSCRIPT"
