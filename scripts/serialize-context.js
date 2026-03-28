#!/usr/bin/env node

/**
 * CLI: reads a transcript file path from argv, outputs a context package as JSON.
 *
 * Usage: node serialize-context.js <path-to-transcript.jsonl>
 */

import { readTranscript } from './lib/transcript-reader.js';
import { buildContext } from './lib/context-builder.js';

const transcriptPath = process.argv[2];

if (!transcriptPath) {
  console.error('Usage: serialize-context.js <transcript-path>');
  process.exit(1);
}

try {
  const turns = readTranscript(transcriptPath);
  const context = buildContext(turns);
  console.log(JSON.stringify(context, null, 2));
} catch (err) {
  console.error(`Error reading transcript: ${err.message}`);
  process.exit(1);
}
