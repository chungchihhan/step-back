import { readFileSync } from 'node:fs';

/**
 * Reads a Claude Code JSONL transcript file and returns structured turns.
 *
 * NOTE: The JSONL format is based on observed transcripts. User message content
 * can be a plain string or an array of content blocks. Both are handled.
 *
 * @param {string} filePath - Absolute path to the .jsonl transcript file
 * @returns {Array<{role: string, text: string, toolCalls: Array, timestamp?: string}>}
 */
export function readTranscript(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n').filter(Boolean);
  const turns = [];

  for (const line of lines) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue; // Skip malformed lines
    }

    const turn = parseLine(entry);
    if (turn) {
      turns.push(turn);
    }
  }

  return turns;
}

/**
 * Parses a single JSONL entry into a structured turn.
 * Handles multiple possible transcript formats.
 */
function parseLine(entry) {
  // Format A: { type: "user"|"assistant", message: { role, content: [...] } }
  if (entry.type === 'user' || entry.type === 'assistant') {
    const msg = entry.message;
    if (!msg) return null;

    // Skip system-generated "user" messages (skill loads, hooks, etc.)
    // Real user messages have userType: "external"
    if (entry.type === 'user' && entry.userType && entry.userType !== 'external') {
      return null;
    }

    const role = entry.type;
    const text = extractText(msg.content);

    // Skip messages that look like system/skill content
    if (role === 'user' && isSystemContent(text)) {
      return null;
    }

    const toolCalls = extractToolCalls(msg.content);
    const timestamp = entry.timestamp;

    return { role, text, toolCalls, timestamp };
  }

  // Format B: { role: "user"|"assistant", content: [...] }
  if (entry.role === 'user' || entry.role === 'assistant') {
    const text = extractText(entry.content);
    const toolCalls = extractToolCalls(entry.content);
    const timestamp = entry.timestamp;

    return { role: entry.role, text, toolCalls, timestamp };
  }

  // Tool results and other types — skip (not a turn)
  return null;
}

/**
 * Detects system-generated content that shouldn't be treated as real user messages.
 * E.g. skill loading prompts, hook outputs, system reminders.
 */
function isSystemContent(text) {
  if (!text) return false;
  const markers = [
    'Base directory for this skill:',
    '<system-reminder>',
    '<local-command-caveat>',
    'Successfully loaded skill',
    'CLAUDE_SKILL_DIR',
    'CLAUDE_PLUGIN_ROOT',
  ];
  return markers.some(marker => text.includes(marker));
}

/**
 * Extracts plain text from content blocks.
 * Handles: string | array of {type: "text", text: string}
 */
function extractText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n');
}

/**
 * Extracts tool calls from content blocks.
 * Returns array of { name, input, filePath? }
 */
function extractToolCalls(content) {
  if (!Array.isArray(content)) return [];

  return content
    .filter(block => block.type === 'tool_use')
    .map(block => ({
      name: block.name,
      input: block.input || {},
      filePath: block.input?.file_path || block.input?.filePath || null,
    }));
}
