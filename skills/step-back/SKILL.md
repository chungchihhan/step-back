---
name: step-back
description: Step back from a stuck fix-it loop. Analyzes what has been tried, identifies the root cause at a higher level, and confirms a diagnosis before suggesting a new direction.
user-invocable: true
context: fork
agent: meta-analyst
---

# Step-Back Meta-Analysis

The user is stuck in a loop and needs a fresh perspective.

## Your first step

Find and read the session transcript directly:

1. Find the transcript: `find ~/.claude/projects/ -name "*.jsonl" -not -path "*/subagents/*" 2>/dev/null | xargs ls -t 2>/dev/null | head -1`
2. Read the **last 100 lines** of that file with the Read tool
3. Each line is JSON. Focus on entries with `"type":"user"` — those are user messages. The `message.content` field has the text.
4. Ignore system noise: empty messages, `<command-name>` tags, `<system-reminder>` tags, skill loading text

Find the part where the user got stuck — repeated complaints without real progress. Then analyze according to your agent instructions.
