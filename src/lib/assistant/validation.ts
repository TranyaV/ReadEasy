import type { AssistantRequest, ConversationTurn, DocumentContext } from "./types";

/**
 * Server-side validation and bounding for /api/assistant. Never trust the client's
 * own limits (buildDocumentContext, the input box) — everything is re-checked here
 * before anything reaches a provider.
 */

/** A single message the user typed. Longer is rejected, not silently cut, so the user knows. */
export const MAX_MESSAGE_CHARS = 4000;
/** Only the most recent turns are forwarded as history. */
export const MAX_HISTORY_TURNS = 20;
/** Total characters of conversation forwarded, oldest turns dropped first. */
export const MAX_HISTORY_CHARS = 24000;
/** Prior assistant replies can be long; they are trimmed rather than rejected. */
const MAX_PRIOR_TURN_CHARS = 8000;
/** Hard upper bound for the whole JSON body. */
export const MAX_BODY_BYTES = 64 * 1024;
/** Matches buildDocumentContext's MAX_EXCERPT_CHARS — anything larger didn't come from our client. */
const MAX_EXCERPT_CHARS = 6000;
const MAX_TITLE_CHARS = 200;
const MAX_SELECTION_CHARS = 3000;
const MAX_TURNS_IN_BODY = 200;

export type ValidationResult =
  | { ok: true; request: AssistantRequest }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function invalid(message: string): ValidationResult {
  return { ok: false, message };
}

function validateDocumentContext(value: unknown): DocumentContext | null {
  if (!isRecord(value)) return null;
  const { title, excerpt, truncated, selection } = value;
  if (typeof title !== "string" || typeof excerpt !== "string" || typeof truncated !== "boolean") return null;
  if (selection !== undefined && typeof selection !== "string") return null;
  if (excerpt.length > MAX_EXCERPT_CHARS) return null;

  const trimmedSelection = selection?.trim() ?? "";
  return {
    title: title.trim().slice(0, MAX_TITLE_CHARS) || "Untitled document",
    excerpt,
    truncated,
    // A selection can legitimately be long (select-all); trim it rather than fail the request.
    selection: trimmedSelection ? trimmedSelection.slice(0, MAX_SELECTION_CHARS) : undefined,
  };
}

/** Keeps the newest turns that fit inside the count and character budgets. */
function boundHistory(turns: ConversationTurn[]): ConversationTurn[] {
  const kept: ConversationTurn[] = [];
  let total = 0;
  for (let i = turns.length - 1; i >= 0 && kept.length < MAX_HISTORY_TURNS; i -= 1) {
    const turn = turns[i];
    if (total + turn.content.length > MAX_HISTORY_CHARS) break;
    total += turn.content.length;
    kept.unshift(turn);
  }
  // Conversations must open with the user.
  while (kept.length > 0 && kept[0].role !== "user") kept.shift();
  return kept;
}

/** Merges back-to-back turns from the same speaker, which providers expect to alternate. */
function mergeConsecutive(turns: ConversationTurn[]): ConversationTurn[] {
  const merged: ConversationTurn[] = [];
  for (const turn of turns) {
    const last = merged[merged.length - 1];
    if (last && last.role === turn.role) {
      last.content = `${last.content}\n\n${turn.content}`;
    } else {
      merged.push({ ...turn });
    }
  }
  return merged;
}

export function validateAssistantRequest(value: unknown): ValidationResult {
  if (!isRecord(value)) return invalid("The request was missing required fields.");

  const { mode, turns, documentContext } = value;
  if (mode !== "document" && mode !== "general") return invalid("The request was missing required fields.");
  if (!Array.isArray(turns) || turns.length === 0 || turns.length > MAX_TURNS_IN_BODY) {
    return invalid("The request was missing required fields.");
  }

  const cleanTurns: ConversationTurn[] = [];
  for (const turn of turns) {
    if (!isRecord(turn)) return invalid("The request was missing required fields.");
    if ((turn.role !== "user" && turn.role !== "assistant") || typeof turn.content !== "string") {
      return invalid("The request was missing required fields.");
    }
    const content = turn.content.trim();
    if (!content) continue;
    cleanTurns.push({ role: turn.role, content: content.slice(0, MAX_PRIOR_TURN_CHARS) });
  }

  const latest = turns[turns.length - 1] as ConversationTurn;
  if (latest.role !== "user" || !latest.content.trim()) {
    return invalid("Please type a question for the assistant.");
  }
  if (latest.content.trim().length > MAX_MESSAGE_CHARS) {
    return invalid(
      `That message is too long. Please keep it under ${MAX_MESSAGE_CHARS.toLocaleString()} characters.`,
    );
  }

  const boundedTurns = boundHistory(mergeConsecutive(cleanTurns));
  if (boundedTurns.length === 0) return invalid("Please type a question for the assistant.");

  if (mode === "general") {
    // General mode never forwards document content, even if a client sent some.
    return { ok: true, request: { mode, turns: boundedTurns } };
  }

  const context = validateDocumentContext(documentContext);
  if (!context) return invalid("The document details in the request weren't valid. Please try again.");
  return { ok: true, request: { mode, turns: boundedTurns, documentContext: context } };
}
