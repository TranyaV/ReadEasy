import type { TextSegment } from "./domText";

/**
 * Maps a plain-text character range onto the live DOM via a text-segment index,
 * then wraps it in a highlight element — the only way to mark an arbitrary span
 * of arbitrarily-nested rich content (bold/italic runs, list items, headings...)
 * without needing to understand that structure at all.
 */

function findSegmentForStart(segments: TextSegment[], offset: number): TextSegment | null {
  for (const segment of segments) {
    if (offset < segment.end) return segment;
  }
  return segments[segments.length - 1] ?? null;
}

function findSegmentForEnd(segments: TextSegment[], offset: number): TextSegment | null {
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    if (offset > segments[i].start) return segments[i];
  }
  return segments[0] ?? null;
}

/** Maps a plain-text [start, end) range onto the live DOM via the segment index. Returns null on any failure — never throws. */
export function createRangeFromOffsets(segments: TextSegment[], start: number, end: number): Range | null {
  try {
    if (segments.length === 0) return null;

    const startSegment = findSegmentForStart(segments, start);
    const endSegment = findSegmentForEnd(segments, end);
    if (!startSegment || !endSegment) return null;

    const range = document.createRange();
    const startOffset = Math.min(Math.max(start - startSegment.start, 0), startSegment.node.data.length);
    const endOffset = Math.min(Math.max(end - endSegment.start, 0), endSegment.node.data.length);
    range.setStart(startSegment.node, startOffset);
    range.setEnd(endSegment.node, endOffset);
    return range;
  } catch {
    return null;
  }
}

/** Wraps [start, end) in a highlight span, returning it so it can be unwrapped later. Returns null on any failure — never throws. */
export function applyHighlight(
  segments: TextSegment[],
  start: number,
  end: number,
  className: string,
): HTMLElement | null {
  try {
    const range = createRangeFromOffsets(segments, start, end);
    if (!range || range.collapsed) return null;

    const wrapper = document.createElement("span");
    wrapper.className = className;
    wrapper.appendChild(range.extractContents());
    range.insertNode(wrapper);
    return wrapper;
  } catch {
    return null;
  }
}

/** Reverses applyHighlight, merging the surrounding text nodes back together. */
export function removeHighlight(wrapper: HTMLElement): void {
  try {
    const parent = wrapper.parentNode;
    if (!parent) return;
    while (wrapper.firstChild) parent.insertBefore(wrapper.firstChild, wrapper);
    parent.removeChild(wrapper);
    parent.normalize();
  } catch {
    // Best-effort cleanup — a failure here just means the next render re-derives fresh segments.
  }
}
