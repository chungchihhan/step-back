/**
 * Builds a structured context package from transcript turns.
 * This is what the meta-analyst agent receives to reason about.
 *
 * @param {Array<{role: string, text: string, toolCalls: Array}>} turns
 * @returns {Object} Context package
 */
export function buildContext(turns) {
  const userGoal = extractUserGoal(turns);
  const attempts = extractAttempts(turns);
  const filesTouched = extractFilesTouched(turns);
  const currentIssue = extractCurrentIssue(turns);

  return {
    userGoal,
    attempts,
    filesTouched,
    currentIssue,
    turnCount: turns.length,
  };
}

/**
 * The user's original goal is their first message.
 */
function extractUserGoal(turns) {
  const firstUser = turns.find(t => t.role === 'user');
  return firstUser?.text ?? 'Unknown';
}

/**
 * Each attempt is: user complaint → assistant response with tool calls.
 * We pair user frustration messages with the subsequent assistant action.
 */
function extractAttempts(turns) {
  const attempts = [];
  let attemptNumber = 0;

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    if (turn.role !== 'assistant') continue;

    // Find the preceding user message
    let userMsg = '';
    for (let j = i - 1; j >= 0; j--) {
      if (turns[j].role === 'user') {
        userMsg = turns[j].text;
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
 * Collects unique file paths from all tool calls.
 */
function extractFilesTouched(turns) {
  const files = new Set();

  for (const turn of turns) {
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
function extractCurrentIssue(turns) {
  const userTurns = turns.filter(t => t.role === 'user');
  return userTurns.length > 0 ? userTurns[userTurns.length - 1].text : '';
}
