/**
 * Patterns that indicate a segment boundary — the user moved on to something new.
 * When we see these, the previous topic is done and a new segment starts.
 */
const SEGMENT_BOUNDARY_PATTERNS = [
  // Progress signals — user acknowledges something worked
  /\b(that\s*)?works?\b/i,
  /\bgreat\b/i,
  /\bnice\b/i,
  /\bgood\b/i,
  /\bthanks?\b/i,
  /\bnow\s*(can|add|let'?s|please)\b/i,
  /\bok(ay)?\s*(that|now|so)\b/i,
  // New problem signals — user hit a different issue
  /\bnew\s*(error|issue|problem|bug)\b/i,
  /\bdifferent\s*(error|issue|problem|bug)\b/i,
  /\banother\s*(error|issue|problem|bug)\b/i,
  /\bnow\s*(i\s*)?(got|get|see|have|hit)\b/i,
  /\bmoving\s*on\b/i,
];

/**
 * Negation indicators — if present, the message is a complaint, not progress.
 * "That didn't work" contains "work" but is NOT progress.
 */
const NEGATION_PATTERNS = [
  /\bnot\s*working\b/i,
  /\bdidn'?t\s*work\b/i,
  /\bdoesn'?t\s*work\b/i,
  /\bstill\b/i,
  /\bbroken\b/i,
  /\bfail/i,
  /\bfix\s*(it|this)\b/i,
  /\btry\s*again\b/i,
  /\bsame\s*(error|issue|problem)\b/i,
  /\bnothing\s*changed\b/i,
];

/**
 * Finds the start of the current segment — the part of the session
 * the user is currently stuck on. Works backwards from the end to find
 * the last segment boundary (progress or new problem signal).
 *
 * @param {Array<{role: string, text: string}>} turns
 * @returns {number} Index of the first turn in the current segment
 */
function findCurrentSegmentStart(turns) {
  // Walk backwards through user messages to find the last boundary
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    if (turn.role !== 'user') continue;

    const isNegated = NEGATION_PATTERNS.some(p => p.test(turn.text));
    if (!isNegated && SEGMENT_BOUNDARY_PATTERNS.some(p => p.test(turn.text))) {
      // The boundary message itself belongs to the OLD segment.
      // The new segment starts at the next turn.
      return i + 1;
    }
  }

  // No boundary found — use everything, but cap at last 30 turns
  return Math.max(0, turns.length - 30);
}

/**
 * Builds a structured context package from transcript turns.
 * Only analyzes the current segment — the part the user is stuck on.
 *
 * @param {Array<{role: string, text: string, toolCalls: Array}>} turns
 * @returns {Object} Context package
 */
export function buildContext(turns) {
  const segmentStart = findCurrentSegmentStart(turns);
  const segment = turns.slice(segmentStart);

  const userGoal = extractUserGoal(segment, turns);
  const attempts = extractAttempts(segment);
  const filesTouched = extractFilesTouched(segment);
  const currentIssue = extractCurrentIssue(segment);

  return {
    userGoal,
    attempts,
    filesTouched,
    currentIssue,
    turnCount: turns.length,
    segmentTurnCount: segment.length,
  };
}

/**
 * The user's goal for this segment — the first user message in the segment.
 * If the segment starts mid-conversation (after a boundary), look for the
 * first user message that describes what they want.
 */
function extractUserGoal(segment, allTurns) {
  const firstUser = segment.find(t => t.role === 'user');
  if (firstUser) return firstUser.text;

  // Fallback: if no user message in segment, grab the closest one before it
  const segmentStartIdx = allTurns.length - segment.length;
  for (let i = segmentStartIdx - 1; i >= 0; i--) {
    if (allTurns[i].role === 'user') return allTurns[i].text;
  }

  return 'Unknown';
}

/**
 * Each attempt is: user complaint → assistant response with tool calls.
 * Only counts attempts within the current segment.
 */
function extractAttempts(segment) {
  const attempts = [];
  let attemptNumber = 0;

  for (let i = 0; i < segment.length; i++) {
    const turn = segment[i];
    if (turn.role !== 'assistant') continue;

    // Find the preceding user message
    let userMsg = '';
    for (let j = i - 1; j >= 0; j--) {
      if (segment[j].role === 'user') {
        userMsg = segment[j].text;
        break;
      }
    }

    // Only count as an attempt if the assistant used tools
    if (turn.toolCalls && turn.toolCalls.length > 0) {
      attemptNumber++;
      const toolNames = turn.toolCalls.map(tc => tc.name).join(', ');
      const files = turn.toolCalls.map(tc => tc.filePath).filter(Boolean).join(', ');

      attempts.push({
        attemptNumber,
        whatWasTried: turn.text || `Used ${toolNames}`,
        tools: toolNames,
        filesModified: files,
        userSaid: userMsg,
      });
    }
  }

  return attempts;
}

/**
 * Collects unique file paths from tool calls in the segment.
 */
function extractFilesTouched(segment) {
  const files = new Set();

  for (const turn of segment) {
    if (turn.role !== 'assistant' || !turn.toolCalls) continue;
    for (const tc of turn.toolCalls) {
      if (tc.filePath) files.add(tc.filePath);
    }
  }

  return [...files];
}

/**
 * The most recent user complaint — this is the "current state".
 */
function extractCurrentIssue(segment) {
  const userTurns = segment.filter(t => t.role === 'user');
  return userTurns.length > 0 ? userTurns[userTurns.length - 1].text : '';
}
