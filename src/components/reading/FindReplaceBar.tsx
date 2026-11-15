"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { extractPlainTextAndIndex } from "@/lib/richtext/domText";
import { findMatches, type TextMatch } from "@/lib/richtext/findMatches";
import { applyHighlight, createRangeFromOffsets, removeHighlight } from "@/lib/richtext/highlightRange";

type FindReplaceBarProps = {
  editorRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
};

const inputClasses =
  "h-8 min-w-0 flex-1 rounded-md border border-border bg-white/80 px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40";

const iconButton =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-foreground/70 transition-colors hover:border-forest hover:text-forest disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40";

export function FindReplaceBar({ editorRef, onClose }: FindReplaceBarProps) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [matches, setMatches] = useState<TextMatch[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const wrappersRef = useRef<HTMLElement[]>([]);

  function clearHighlights() {
    wrappersRef.current.forEach((wrapper) => {
      if (editorRef.current?.contains(wrapper)) removeHighlight(wrapper);
    });
    wrappersRef.current = [];
  }

  useEffect(() => {
    return () => clearHighlights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refreshMatches(nextQuery: string, preferredIndex: number) {
    clearHighlights();
    const container = editorRef.current;
    if (!container || !nextQuery.trim()) {
      setMatches([]);
      setActiveMatchIndex(0);
      return;
    }

    const found = findMatches(extractPlainTextAndIndex(container).text, nextQuery);
    const safeIndex = found.length === 0 ? 0 : Math.min(preferredIndex, found.length - 1);
    setMatches(found);
    setActiveMatchIndex(safeIndex);

    found.forEach((match, index) => {
      // Re-walk fresh before each wrap: the previous wrap's extractContents/insertNode
      // splits text nodes, so a segment index computed earlier can't be reused.
      const { segments } = extractPlainTextAndIndex(container);
      const className = index === safeIndex ? "rounded bg-forest text-background" : "rounded bg-forest/25";
      const wrapper = applyHighlight(segments, match.start, match.end, className);
      if (wrapper) wrappersRef.current.push(wrapper);
    });
  }

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery);
    refreshMatches(nextQuery, 0);
  }

  function goTo(delta: number) {
    if (matches.length === 0) return;
    refreshMatches(query, (activeMatchIndex + delta + matches.length) % matches.length);
  }

  function replaceOne() {
    const container = editorRef.current;
    if (!container || matches.length === 0) return;
    const match = matches[activeMatchIndex];

    clearHighlights();
    const { segments } = extractPlainTextAndIndex(container);
    const range = createRangeFromOffsets(segments, match.start, match.end);
    if (!range) return;

    container.focus();
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.execCommand("insertText", false, replacement);

    refreshMatches(query, activeMatchIndex);
  }

  function replaceAll() {
    const container = editorRef.current;
    const trimmedQuery = query.trim();
    if (!container || !trimmedQuery) return;
    clearHighlights();

    const needle = trimmedQuery.toLowerCase();
    let searchFrom = 0;
    let guard = 0;

    // Re-finds the next match from scratch every iteration (not a cached list) so a
    // replacement that itself contains the query — e.g. "cat" -> "cats" — can never
    // loop forever: searchFrom always advances past what was just inserted.
    while (guard < 2000) {
      const { text, segments } = extractPlainTextAndIndex(container);
      const matchStart = text.toLowerCase().indexOf(needle, searchFrom);
      if (matchStart === -1) break;
      const matchEnd = matchStart + needle.length;

      const range = createRangeFromOffsets(segments, matchStart, matchEnd);
      if (!range) break;

      container.focus();
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.execCommand("insertText", false, replacement);

      searchFrom = matchStart + replacement.length;
      guard += 1;
    }

    refreshMatches(query, 0);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border border-t-0 border-border bg-white/70 px-2 py-1.5">
      <input
        type="text"
        value={query}
        onChange={(event) => handleQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") goTo(event.shiftKey ? -1 : 1);
          if (event.key === "Escape") onClose();
        }}
        placeholder="Find"
        aria-label="Find in document"
        className={inputClasses}
      />
      <span className="shrink-0 text-xs text-foreground/50" aria-live="polite">
        {query.trim() ? (matches.length > 0 ? `${activeMatchIndex + 1} of ${matches.length}` : "No matches") : ""}
      </span>
      <button type="button" aria-label="Previous match" onClick={() => goTo(-1)} disabled={matches.length === 0} className={iconButton}>
        <ChevronUp className="h-4 w-4" />
      </button>
      <button type="button" aria-label="Next match" onClick={() => goTo(1)} disabled={matches.length === 0} className={iconButton}>
        <ChevronDown className="h-4 w-4" />
      </button>

      <input
        type="text"
        value={replacement}
        onChange={(event) => setReplacement(event.target.value)}
        placeholder="Replace"
        aria-label="Replace with"
        className={inputClasses}
      />
      <button
        type="button"
        onClick={replaceOne}
        disabled={matches.length === 0}
        className="h-8 shrink-0 rounded-md border border-border px-3 text-sm text-foreground transition-colors hover:border-forest hover:text-forest disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40"
      >
        Replace
      </button>
      <button
        type="button"
        onClick={replaceAll}
        disabled={!query.trim()}
        className="h-8 shrink-0 rounded-md border border-border px-3 text-sm text-foreground transition-colors hover:border-forest hover:text-forest disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40"
      >
        Replace all
      </button>

      <button type="button" aria-label="Close find and replace" onClick={onClose} className={`${iconButton} ml-auto`}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
