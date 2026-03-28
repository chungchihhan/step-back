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

Find the current session's transcript and extract a structured context package:

```bash
TRANSCRIPT=$(find ~/.claude/projects/ -name "*.jsonl" -not -path "*/subagents/*" 2>/dev/null | xargs ls -t 2>/dev/null | head -1)
node "$(dirname "$(find ~/.claude/plugins/ -path "*/step-back/*/scripts/serialize-context.js" 2>/dev/null | head -1)")/serialize-context.js" "$TRANSCRIPT"
```

If the node command fails, fall back to reading the last 200 lines of the transcript file directly with the Read tool. Each line is JSON — look for `"type":"user"` and `"type":"assistant"` entries.

Then analyze according to your agent instructions.

After providing your diagnosis, end with: **Does this match what you're experiencing?**

The user will confirm, refine, or reject your diagnosis. Based on their response, adjust your analysis.
