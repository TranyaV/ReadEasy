/**
 * Derives plain text from rich editor content, using exactly the paragraph
 * convention `splitIntoParagraphs` expects (blocks joined by "\n\n", trimmed,
 * no internal newlines) — so segmentDocument() run on the result always
 * reproduces the same paragraph/sentence boundaries recorded here.
 */

export type TextSegment = { node: Text; start: number; end: number };

const BLOCK_TAGS = new Set(["P", "DIV", "H1", "H2", "H3", "LI"]);

type BlockResult = { text: string; segments: Array<{ node: Text; start: number; end: number }> };

function extractBlockText(block: Node): BlockResult {
  let collected = "";
  const raw: Array<{ node: Text; start: number; end: number }> = [];

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text;
      if (textNode.data.length === 0) return;
      raw.push({ node: textNode, start: collected.length, end: collected.length + textNode.data.length });
      collected += textNode.data;
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      if (element.tagName === "BR") {
        collected += " ";
        return;
      }
      element.childNodes.forEach(walk);
    }
  }

  block.childNodes.forEach(walk);

  const leading = collected.match(/^\s*/)?.[0].length ?? 0;
  const trimmed = collected.trim();
  const trimEnd = leading + trimmed.length;

  const segments = raw
    .map(({ node, start, end }) => ({
      node,
      start: Math.max(start, leading) - leading,
      end: Math.min(end, trimEnd) - leading,
    }))
    .filter((segment) => segment.end > segment.start);

  return { text: trimmed, segments };
}

function collectBlocks(root: Node): Node[] {
  const blocks: Node[] = [];
  root.childNodes.forEach((child) => {
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const element = child as Element;
    if (element.tagName === "UL" || element.tagName === "OL") {
      Array.from(element.children).forEach((item) => {
        if (item.tagName === "LI") blocks.push(item);
      });
      return;
    }
    if (BLOCK_TAGS.has(element.tagName)) {
      blocks.push(element);
      return;
    }
    // Unknown wrapper (shouldn't occur post-sanitize) — recurse so its content isn't lost.
    blocks.push(...collectBlocks(element));
  });
  return blocks;
}

/**
 * Walks rich editor content, returning plain text (paragraphs joined by "\n\n",
 * matching splitIntoParagraphs' convention) plus the exact Text-node ranges that
 * make up that text — used to map sentence character offsets back onto the live
 * DOM for highlighting.
 */
export function extractPlainTextAndIndex(root: Node): { text: string; segments: TextSegment[] } {
  const blocks = collectBlocks(root);
  const blockResults = blocks.map(extractBlockText).filter((result) => result.text.length > 0);

  const segments: TextSegment[] = [];
  let absoluteOffset = 0;

  blockResults.forEach((result, index) => {
    result.segments.forEach(({ node, start, end }) => {
      segments.push({ node, start: start + absoluteOffset, end: end + absoluteOffset });
    });
    absoluteOffset += result.text.length;
    if (index < blockResults.length - 1) {
      absoluteOffset += 2; // the "\n\n" paragraph separator
    }
  });

  const text = blockResults.map((result) => result.text).join("\n\n");
  return { text, segments };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Seeds the rich editor from plain text (e.g. a fresh OCR extraction with no prior formatting). */
export function wrapPlainTextAsHtml(paragraphs: string[]): string {
  if (paragraphs.length === 0) return "<p><br></p>";
  return paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
}

/**
 * Seeds the editor from per-page OCR output. Each paragraph carries the page it came
 * from as data-page, which survives sanitizing and is copied by the browser when a
 * paragraph is split while editing — so page navigation keeps working after edits.
 */
export function wrapPagesAsHtml(pages: string[][]): string {
  const blocks: string[] = [];
  pages.forEach((paragraphs, index) => {
    for (const paragraph of paragraphs) {
      blocks.push(`<p data-page="${index + 1}">${escapeHtml(paragraph)}</p>`);
    }
  });
  return blocks.length > 0 ? blocks.join("") : "<p><br></p>";
}
