/**
 * Decides whether a chat message should carry the current document's excerpt.
 * The rule is deliberately simple and predictable (chosen over an extra model call):
 * attach the document only when the user has text selected in it, or when the
 * message refers to the document. Everything else goes to the AI without it.
 */
const DOCUMENT_REFERENCE =
  /\b(this|these|document|doc|text|page|pages|paragraph|paragraphs|passage|section|chapter|article|pdf|file|sentence|sentences|summari[sz]e|summary|above|below)\b/i;

export function needsDocumentContext(message: string, hasSelection: boolean): boolean {
  return hasSelection || DOCUMENT_REFERENCE.test(message);
}

/** True when the message is about one specific paragraph (used to fall back to the cursor's paragraph). */
export function mentionsParagraph(message: string): boolean {
  return /\b(paragraph|this part|this bit|here)\b/i.test(message);
}
