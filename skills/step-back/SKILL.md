---
name: step-back
description: Step back from a stuck fix-it loop. Analyzes what has been tried, identifies the root cause at a higher level, and confirms a diagnosis before suggesting a new direction.
user-invocable: true
context: fork
agent: meta-analyst
---

# Step-Back Meta-Analysis

A frustration loop has been detected or the user has manually requested a step-back analysis.

## Your first step

Find and read the current session's transcript to understand what has been tried:

1. Use Bash to find the most recent transcript: `find ~/.claude/projects/ -name "*.jsonl" -not -path "*/subagents/*" -newer ~/.claude/projects/ 2>/dev/null | xargs ls -t 2>/dev/null | head -1`
2. Read the last 200 lines of that transcript file to see recent activity
3. Look for the pattern: user complaints → assistant fix attempts → user says it still doesn't work

Then analyze according to your agent instructions.

After providing your diagnosis, end with: **Does this match what you're experiencing?**

The user will confirm, refine, or reject your diagnosis. Based on their response, adjust your analysis.
