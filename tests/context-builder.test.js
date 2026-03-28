import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildContext } from '../scripts/lib/context-builder.js';
import { readTranscript } from '../scripts/lib/transcript-reader.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => join(__dirname, 'fixtures', name);

describe('buildContext', () => {
  it('extracts the user goal from the first user message', () => {
    const turns = readTranscript(fixture('stuck-loop.jsonl'));
    const ctx = buildContext(turns);
    assert.equal(ctx.userGoal, 'Add JWT authentication to the login endpoint');
  });

  it('lists all attempts with what was tried and what failed', () => {
    const turns = readTranscript(fixture('stuck-loop.jsonl'));
    const ctx = buildContext(turns);
    assert.ok(ctx.attempts.length >= 3, `Expected >= 3 attempts, got ${ctx.attempts.length}`);
    assert.ok(ctx.attempts[0].whatWasTried, 'Expected whatWasTried');
  });

  it('collects unique files touched', () => {
    const turns = readTranscript(fixture('stuck-loop.jsonl'));
    const ctx = buildContext(turns);
    assert.ok(ctx.filesTouched.includes('src/auth.ts'));
    assert.ok(ctx.filesTouched.includes('src/middleware.ts'));
    // No duplicates
    const unique = [...new Set(ctx.filesTouched)];
    assert.equal(ctx.filesTouched.length, unique.length);
  });

  it('captures the current/latest error or complaint', () => {
    const turns = readTranscript(fixture('stuck-loop.jsonl'));
    const ctx = buildContext(turns);
    assert.ok(ctx.currentIssue, 'Expected currentIssue to be set');
    assert.ok(ctx.currentIssue.length > 0);
  });

  it('produces valid JSON-serializable output', () => {
    const turns = readTranscript(fixture('stuck-loop.jsonl'));
    const ctx = buildContext(turns);
    const json = JSON.stringify(ctx);
    const parsed = JSON.parse(json);
    assert.ok(parsed.userGoal);
    assert.ok(parsed.attempts);
    assert.ok(parsed.filesTouched);
  });
});
