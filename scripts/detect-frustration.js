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

  // Frustration detected — notify user to invoke /step-back
  response.systemMessage = `[step-back] Frustration loop detected (${detection.signalCount} signals since last progress). Type /step-back to get a fresh root-cause analysis from a separate agent.`;

  return response;
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
