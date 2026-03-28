/**
 * Frustration signal patterns.
 * These match common phrases users say when stuck in a fix-it loop.
 * Case-insensitive matching.
 */
const FRUSTRATION_PATTERNS = [
  /\bfix\s*(it|this)\b/i,
  /\bstill\s*(broken|failing|not\s*working)\b/i,
  /\bnot\s*working\b/i,
  /\btry\s*again\b/i,
  /\bsame\s*(error|issue|problem|bug)\b/i,
  /\bthat\s*didn'?t\s*work\b/i,
  /\bnothing\s*changed\b/i,
  /\bstill\s*(the\s*)?same\b/i,
  /\bdoesn'?t\s*(fix|solve|help)\b/i,
  /\bstill\s*(gets?|getting|shows?|showing|throws?|throwing)\b/i,
];

/**
 * Progress signal patterns.
 * These indicate the user acknowledges progress — resets the frustration counter.
 */
const PROGRESS_PATTERNS = [
  /\b(that\s*)?works?\b/i,
  /\bgreat\b/i,
  /\bnice\b/i,
  /\bgood\b/i,
  /\bthanks?\b/i,
  /\bnow\s*(can|add|let'?s|please)\b/i,
  /\bok(ay)?\s*(that|now|so)\b/i,
];

/**
 * Detects frustration patterns in a sequence of turns.
 *
 * @param {Array<{role: string, text: string}>} turns - Structured turns from transcript
 * @param {Object} options
 * @param {number} options.threshold - Number of consecutive frustration signals to trigger (default: 3)
 * @returns {{triggered: boolean, signalCount: number, signals: Array<{text: string, turnIndex: number}>}}
 */
export function detectFrustration(turns, options = {}) {
  const threshold = options.threshold ?? 3;
  const signals = [];
  let signalsSinceLastProgress = 0;

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    if (turn.role !== 'user') continue;

    const text = turn.text;
    if (isFrustrationSignal(text)) {
      signalsSinceLastProgress++;
      signals.push({ text, turnIndex: i });
    } else if (isProgressSignal(text)) {
      signalsSinceLastProgress = 0; // Reset — user acknowledged progress
    }
    // Neutral messages (questions, new requests) don't reset the counter.
    // The counter tracks frustration signals since the last time the user
    // acknowledged progress, not strictly consecutive signals.
  }

  return {
    triggered: signalsSinceLastProgress >= threshold,
    signalCount: signals.length,
    signalsSinceLastProgress,
    signals,
  };
}

function isFrustrationSignal(text) {
  return FRUSTRATION_PATTERNS.some(pattern => pattern.test(text));
}

function isProgressSignal(text) {
  return PROGRESS_PATTERNS.some(pattern => pattern.test(text));
}
