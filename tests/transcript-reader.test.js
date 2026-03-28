import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readTranscript } from '../scripts/lib/transcript-reader.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => join(__dirname, 'fixtures', name);

describe('readTranscript', () => {
  it('parses user messages from JSONL transcript', () => {
    const turns = readTranscript(fixture('stuck-loop.jsonl'));
    const userTurns = turns.filter(t => t.role === 'user');
    assert.ok(userTurns.length >= 5, `Expected >= 5 user turns, got ${userTurns.length}`);
    assert.equal(userTurns[0].text, 'Add JWT authentication to the login endpoint');
  });

  it('parses assistant messages with tool calls', () => {
    const turns = readTranscript(fixture('stuck-loop.jsonl'));
    const assistantTurns = turns.filter(t => t.role === 'assistant');
    assert.ok(assistantTurns.length >= 4);
    assert.ok(assistantTurns[0].toolCalls.length > 0, 'Expected tool calls');
    assert.equal(assistantTurns[0].toolCalls[0].name, 'Edit');
  });

  it('extracts files touched from tool calls', () => {
    const turns = readTranscript(fixture('stuck-loop.jsonl'));
    const assistantTurns = turns.filter(t => t.role === 'assistant');
    const filesTouched = assistantTurns.flatMap(t =>
      t.toolCalls.map(tc => tc.filePath).filter(Boolean)
    );
    assert.ok(filesTouched.includes('src/auth.ts'));
    assert.ok(filesTouched.includes('src/middleware.ts'));
  });

  it('parses a productive session without errors', () => {
    const turns = readTranscript(fixture('productive-session.jsonl'));
    assert.ok(Array.isArray(turns));
    assert.ok(turns.length > 0);
    const userTurns = turns.filter(t => t.role === 'user');
    assert.ok(userTurns.length >= 3);
  });

  it('returns structured turn objects', () => {
    const turns = readTranscript(fixture('stuck-loop.jsonl'));
    const userTurn = turns.find(t => t.role === 'user');
    assert.ok('role' in userTurn);
    assert.ok('text' in userTurn);
    assert.ok('timestamp' in userTurn || userTurn.timestamp === undefined);
  });
});
