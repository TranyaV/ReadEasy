import { splitIntoParagraphs } from "@/lib/text/paragraphs";
import type { DocumentContext } from "./types";

// Conservative, provider-agnostic cap. The real limit depends on whichever model's
// context window is eventually chosen — this just guarantees we never send an
// unbounded blob while that choice is pending.
const MAX_EXCERPT_CHARS = 6000;

/**
 * Bounds a (possibly long) document down to a provider-agnostic excerpt, cutting on
 * paragraph boundaries where possible rather than mid-sentence. Never sends the
 * selection unless there actually is one at the moment this is called.
 */
export function buildDocumentContext(fullText: string, title: string, selection: string): DocumentContext {
  const paragraphs = splitIntoParagraphs(fullText);
  const joined = paragraphs.join("\n\n");

  if (joined.length <= MAX_EXCERPT_CHARS) {
    return {
      title,
      excerpt: joined,
      truncated: false,
      selection: selection.trim() ? selection.trim() : undefined,
    };
  }

  let excerpt = "";
  for (const paragraph of paragraphs) {
    const next = excerpt ? `${excerpt}\n\n${paragraph}` : paragraph;
    if (next.length > MAX_EXCERPT_CHARS) break;
    excerpt = next;
  }

  return {
    title,
    excerpt: excerpt || joined.slice(0, MAX_EXCERPT_CHARS),
    truncated: true,
    selection: selection.trim() ? selection.trim() : undefined,
  };
}
