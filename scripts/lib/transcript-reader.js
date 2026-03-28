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

    const role = entry.type;
    const text = extractText(msg.content);

    // For user messages, only keep genuine human input
    if (role === 'user' && !isRealUserMessage(text)) {
      return null;
    }

    const toolCalls = extractToolCalls(msg.content);
    const timestamp = entry.timestamp;

    return { role, text, toolCalls, timestamp };
  }

  // Format B: { role: "user"|"assistant", content: [...] }
  if (entry.role === 'user' || entry.role === 'assistant') {
    const text = extractText(entry.content);

    if (entry.role === 'user' && !isRealUserMessage(text)) {
      return null;
    }

    const toolCalls = extractToolCalls(entry.content);
    const timestamp = entry.timestamp;

    return { role: entry.role, text, toolCalls, timestamp };
  }

  // Tool results and other types — skip (not a turn)
  return null;
}

/**
 * Determines if a user message is genuine human input vs system noise.
 * Claude Code transcripts are full of system-generated "user" entries:
 * empty messages, command tags, skill loads, system reminders, etc.
 */
function isRealUserMessage(text) {
  // Empty or whitespace-only
  if (!text || !text.trim()) return false;

  const trimmed = text.trim();

  // XML system tags — commands, caveats, reminders, stdout
  if (/^<(command-name|local-command|system-reminder)/.test(trimmed)) return false;
  if (trimmed.startsWith('<local-command-stdout>')) return false;

  // Contains command-name tags anywhere (slash command invocations)
  if (/<command-name>/.test(trimmed)) return false;

  // System markers
  const systemMarkers = [
    'Base directory for this skill:',
    'Successfully loaded skill',
    'CLAUDE_SKILL_DIR',
    'CLAUDE_PLUGIN_ROOT',
    '[Request interrupted by user',
  ];
  if (systemMarkers.some(m => trimmed.includes(m))) return false;

  return true;
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
