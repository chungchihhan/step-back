import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectFrustration } from '../scripts/lib/frustration-detector.js';
import { readTranscript } from '../scripts/lib/transcript-reader.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => join(__dirname, 'fixtures', name);

describe('detectFrustration', () => {
  it('detects frustration in a stuck-loop transcript', () => {
    const turns = readTranscript(fixture('stuck-loop.jsonl'));
    const result = detectFrustration(turns, { threshold: 3 });
    assert.equal(result.triggered, true);
    assert.ok(result.signalCount >= 3, `Expected >= 3 signals, got ${result.signalCount}`);
  });

  it('does not trigger for a productive session', () => {
    const turns = readTranscript(fixture('productive-session.jsonl'));
    const result = detectFrustration(turns, { threshold: 3 });
    assert.equal(result.triggered, false);
    assert.equal(result.signalCount, 0);
  });

  it('does not trigger for mixed session with real progress', () => {
    const turns = readTranscript(fixture('mixed-session.jsonl'));
    const result = detectFrustration(turns, { threshold: 3 });
    assert.equal(result.triggered, false);
  });

  it('respects configurable threshold', () => {
    const turns = readTranscript(fixture('stuck-loop.jsonl'));
    const highThreshold = detectFrustration(turns, { threshold: 10 });
    assert.equal(highThreshold.triggered, false);

    const lowThreshold = detectFrustration(turns, { threshold: 2 });
    assert.equal(lowThreshold.triggered, true);
  });

  it('identifies frustration signal messages', () => {
    const turns = readTranscript(fixture('stuck-loop.jsonl'));
    const result = detectFrustration(turns, { threshold: 3 });
    assert.ok(result.signals.length >= 3);
    assert.ok(result.signals.every(s => typeof s.text === 'string'));
    assert.ok(result.signals.every(s => typeof s.turnIndex === 'number'));
  });

  it('returns signal count even when not triggered', () => {
    const turns = readTranscript(fixture('productive-session.jsonl'));
    const result = detectFrustration(turns, { threshold: 3 });
    assert.equal(typeof result.signalCount, 'number');
    assert.equal(typeof result.triggered, 'boolean');
  });
});
