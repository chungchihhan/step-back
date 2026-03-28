import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { processHookInput } from '../scripts/detect-frustration.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => join(__dirname, 'fixtures', name);

describe('processHookInput (unit)', () => {
  it('returns continue:true with no action for low frustration', () => {
    const result = processHookInput({
      prompt: 'Can you add pagination?',
      transcript_path: fixture('productive-session.jsonl'),
      hook_event_name: 'UserPromptSubmit',
    });
    assert.equal(result.continue, true);
    assert.equal(result.additionalContext, undefined);
  });

  it('returns additionalContext when frustration threshold met', () => {
    const result = processHookInput({
      prompt: 'Nothing changed. Fix it please.',
      transcript_path: fixture('stuck-loop.jsonl'),
      hook_event_name: 'UserPromptSubmit',
    });
    assert.equal(result.continue, true);
    assert.ok(result.additionalContext, 'Expected additionalContext to be set');
    assert.ok(result.additionalContext.includes('step-back'), 'Expected step-back reference');
  });

  it('includes systemMessage to alert user', () => {
    const result = processHookInput({
      prompt: 'Nothing changed. Fix it please.',
      transcript_path: fixture('stuck-loop.jsonl'),
      hook_event_name: 'UserPromptSubmit',
    });
    assert.ok(result.systemMessage, 'Expected systemMessage');
  });

  it('does not trigger for mixed session with progress', () => {
    const result = processHookInput({
      prompt: 'Nice, that works. Now add search filtering.',
      transcript_path: fixture('mixed-session.jsonl'),
      hook_event_name: 'UserPromptSubmit',
    });
    assert.equal(result.additionalContext, undefined);
  });
});

describe('processHookInput with config', () => {
  it('uses default threshold when no config file exists', () => {
    const result = processHookInput({
      prompt: 'Nothing changed. Fix it please.',
      transcript_path: fixture('stuck-loop.jsonl'),
      hook_event_name: 'UserPromptSubmit',
      cwd: '/nonexistent',
    });
    assert.equal(result.continue, true);
    assert.ok(result.additionalContext, 'Should trigger with default threshold of 3');
  });

  it('respects auto_trigger: false from config file', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'step-back-test-'));
    try {
      writeFileSync(join(tmpDir, '.step-back.json'), JSON.stringify({ auto_trigger: false }));
      const result = processHookInput({
        prompt: 'Nothing changed. Fix it please.',
        transcript_path: fixture('stuck-loop.jsonl'),
        hook_event_name: 'UserPromptSubmit',
        cwd: tmpDir,
      });
      assert.equal(result.additionalContext, undefined, 'Should NOT trigger when auto_trigger is false');
    } finally {
      rmSync(tmpDir, { recursive: true });
    }
  });

  it('respects custom threshold from config file', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'step-back-test-'));
    try {
      writeFileSync(join(tmpDir, '.step-back.json'), JSON.stringify({ frustration_threshold: 10 }));
      const result = processHookInput({
        prompt: 'Nothing changed. Fix it please.',
        transcript_path: fixture('stuck-loop.jsonl'),
        hook_event_name: 'UserPromptSubmit',
        cwd: tmpDir,
      });
      assert.equal(result.additionalContext, undefined, 'Should NOT trigger with high threshold');
    } finally {
      rmSync(tmpDir, { recursive: true });
    }
  });
});
