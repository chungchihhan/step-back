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
  it('returns continue:true with no stopReason for low frustration', () => {
    const result = processHookInput({
      prompt: 'Can you add pagination?',
      transcript_path: fixture('productive-session.jsonl'),
      hook_event_name: 'UserPromptSubmit',
    });
    assert.equal(result.continue, true);
    assert.equal(result.stopReason, undefined);
  });

  it('blocks response and returns stopReason when frustration threshold met', () => {
    const result = processHookInput({
      prompt: 'Nothing changed. Fix it please.',
      transcript_path: fixture('stuck-loop.jsonl'),
      hook_event_name: 'UserPromptSubmit',
    });
    assert.equal(result.continue, false);
    assert.ok(result.stopReason, 'Expected stopReason to be set');
    assert.ok(result.stopReason.includes('/step-back'), 'Expected /step-back reference');
  });

  it('does not block /step-back commands even when frustrated', () => {
    const result = processHookInput({
      prompt: '/step-back',
      transcript_path: fixture('stuck-loop.jsonl'),
      hook_event_name: 'UserPromptSubmit',
    });
    assert.equal(result.continue, true);
    assert.equal(result.stopReason, undefined);
  });

  it('does not trigger for mixed session with progress', () => {
    const result = processHookInput({
      prompt: 'Nice, that works. Now add search filtering.',
      transcript_path: fixture('mixed-session.jsonl'),
      hook_event_name: 'UserPromptSubmit',
    });
    assert.equal(result.continue, true);
    assert.equal(result.stopReason, undefined);
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
    assert.equal(result.continue, false);
    assert.ok(result.stopReason, 'Should trigger with default threshold of 3');
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
      assert.equal(result.stopReason, undefined, 'Should NOT trigger when auto_trigger is false');
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
      assert.equal(result.stopReason, undefined, 'Should NOT trigger with high threshold');
    } finally {
      rmSync(tmpDir, { recursive: true });
    }
  });
});
