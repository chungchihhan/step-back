# /step-back

> When Claude keeps trying to fix the same thing, `/step-back` steps out of the weeds — diagnoses the real problem, confirms with you, and gets back on track without losing a single turn of context.

A Claude Code plugin that detects when you're stuck in a fix-it loop, spawns a meta-agent to reason about the root cause at a higher level, confirms the diagnosis with you, then injects structured advice back into the original session.

## Installation in Claude Code

```bash
# Add the marketplace
/plugin marketplace add chungchihhan/step-back
```

```bash
# Install the plugin
/plugin install super-resume
```

## Usage

### Manual trigger

Type `/step-back` at any time when you feel stuck. A fresh meta-analyst agent will:

1. Read your session history
2. Identify what all your failed attempts have in common
3. Hypothesize the root cause
4. Suggest approaches you haven't tried
5. Ask you to confirm before proceeding

### Auto-trigger

The plugin automatically detects frustration patterns. When you've said things like "fix it", "still broken", or "try again" multiple times without progress, it will pause and suggest a step-back analysis.

## Configuration

Create `.step-back.json` in your project root:

```json
{
  "frustration_threshold": 3,
  "auto_trigger": true
}
```

| Setting | Options | Default | Description |
|---|---|---|---|
| `frustration_threshold` | 2–10 | 3 | Number of frustration signals before auto-trigger |
| `auto_trigger` | true/false | true | Enable/disable automatic detection |

## How it works

1. **Detection**: A `UserPromptSubmit` hook watches for frustration signals (repeated complaints without progress)
2. **Serialization**: The session transcript is parsed into a structured context package (goal, attempts, errors, files)
3. **Meta-analysis**: A fresh agent receives the context and reasons about root causes from a higher level
4. **Confirmation**: The diagnosis is presented to you for confirmation before any action
5. **Injection**: Confirmed advice flows back into your session as structured context

## License

MIT
