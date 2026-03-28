---
name: step-back
description: Step back from a stuck fix-it loop. Analyzes what has been tried, identifies the root cause at a higher level, and confirms a diagnosis before suggesting a new direction.
user-invocable: true
context: fork
agent: meta-analyst
---

# Step-Back Meta-Analysis

A frustration loop has been detected or the user has manually requested a step-back analysis.

Below is the serialized context package from the current session. Analyze it according to your instructions.

## Session Context Package

!`bash ${CLAUDE_SKILL_DIR}/../../scripts/get-session-context.sh`

**Note:** If the bash injection syntax above doesn't work, try these alternatives and commit the one that works:
- `!`${CLAUDE_SKILL_DIR}/../../scripts/get-session-context.sh`` (without `bash` prefix)
- `!`"${CLAUDE_SKILL_DIR}/../../scripts/get-session-context.sh"`` (quoted path)
- Inline the script directly in the skill file

## Additional Instructions

If the context package above shows an error or is empty, you still have access to the Read, Grep, and Glob tools. Look at the files in the project to understand what has been worked on and provide your best diagnosis based on what you find.

After providing your diagnosis, end with: **Does this match what you're experiencing?**

The user will confirm, refine, or reject your diagnosis. Based on their response, adjust your analysis.
