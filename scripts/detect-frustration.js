#!/usr/bin/env node

/**
 * Hook entry point for UserPromptSubmit.
 * Reads JSON from stdin, checks for frustration patterns,
 * outputs hook response JSON to stdout.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { readTranscript } from './lib/transcript-reader.js';
import { detectFrustration } from './lib/frustration-detector.js';
import { buildContext } from './lib/context-builder.js';

function loadConfig(cwd) {
  const defaults = {
    frustration_threshold: 3,
    auto_trigger: true,
  };

  // Check for .step-back.json in the project root
  const configPath = join(cwd || '.', '.step-back.json');
  if (existsSync(configPath)) {
    try {
      const userConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
      return { ...defaults, ...userConfig };
    } catch {
      return defaults;
    }
  }

  return defaults;
}

/**
 * Core logic — exported for testing.
 */
export function processHookInput(input) {
  const { transcript_path, cwd } = input;
  const config = loadConfig(cwd);
  const response = { continue: true };

  if (!config.auto_trigger) return response;
  if (!transcript_path) return response;

  let turns;
  try {
    turns = readTranscript(transcript_path);
  } catch {
    return response; // Can't read transcript — don't block
  }

  const detection = detectFrustration(turns, { threshold: config.frustration_threshold });

  if (!detection.triggered) return response;

  // Frustration detected — build context and suggest step-back
  let context;
  try {
    context = buildContext(turns);
  } catch {
    return response;
  }

  const contextSummary = formatContextForInjection(context, detection);

  response.systemMessage = `[step-back] Frustration loop detected (${detection.signalCount} signals). Suggesting meta-analysis...`;

  response.additionalContext = contextSummary;

  return response;
}

function formatContextForInjection(context, detection) {
  return `[STEP-BACK: FRUSTRATION LOOP DETECTED]

A pattern of repeated frustration has been detected (${detection.signalCount} frustration signals, ${detection.signalsSinceLastProgress} consecutive without progress).

You MUST now pause your current approach and perform a step-back meta-analysis. Do NOT attempt another fix of the same kind.

Instead, present the following analysis to the user:

## Context Package

**User's original goal:** ${context.userGoal}

**Attempts so far (${context.attempts.length}):**
${context.attempts.map(a => `- Attempt ${a.attemptNumber}: ${a.whatWasTried} (files: ${a.filesModified || 'none'}) — user said: "${a.userSaid}"`).join('\n')}

**Files touched:** ${context.filesTouched.join(', ')}

**Latest user complaint:** ${context.currentIssue}

## Your instructions

1. Identify what ALL the failed attempts have in common (the shared assumption)
2. Hypothesize the root cause — be specific and concrete
3. Suggest 2-3 approaches that have NOT been tried
4. List approaches that should NOT be retried
5. Present this to the user and ask: "Does this match what you're experiencing?"
6. Wait for user confirmation before proceeding with any new approach`;
}

// Main: read stdin and output response
// Only runs when executed directly (not when imported for testing)
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMain || (!process.argv[1] && !process.env.NODE_TEST)) {
  let inputData = '';
  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', (chunk) => { inputData += chunk; });
  process.stdin.on('end', () => {
    try {
      const input = JSON.parse(inputData);
      const result = processHookInput(input);
      console.log(JSON.stringify(result));
    } catch (err) {
      // On error, don't block — output continue: true
      console.log(JSON.stringify({ continue: true }));
    }
  });
}
