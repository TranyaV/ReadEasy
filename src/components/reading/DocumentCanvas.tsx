"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { extractPlainTextAndIndex } from "@/lib/richtext/domText";
import { applyHighlight, removeHighlight } from "@/lib/richtext/highlightRange";
import { getAbsoluteSentenceRange, segmentDocument } from "@/lib/text/sentences";
import { FindReplaceBar } from "./FindReplaceBar";
import { FormattingToolbar, type ToolbarState } from "./FormattingToolbar";
import type { AlignOption, HeadingOption } from "./formattingTypes";
import { readingSurface, type ReadingSettings } from "./settings";

const HEADING_TAGS: Record<HeadingOption, string> = {
  paragraph: "p",
  heading1: "h1",
  heading2: "h2",
  heading3: "h3",
};

const ALIGN_COMMANDS: Record<AlignOption, string> = {
  left: "justifyLeft",
  center: "justifyCenter",
  right: "justifyRight",
};

type DocumentCanvasProps = {
  /** Owned by the parent so it can read the live document text on demand (e.g. for Play). */
  editorRef: RefObject<HTMLDivElement | null>;
  initialHtml: string;
  settings: ReadingSettings;
  activeSentenceIndex: number | null;
  /** Fires on every edit — the parent stops speech and schedules an autosave. */
  onContentChange: () => void;
  /** Fires when focus leaves the document — the parent flushes any pending autosave immediately. */
  onBlurFlush: () => void;
  /** Extra controls rendered at the end of the formatting toolbar (e.g. Define). */
  toolbarEnd?: ReactNode;
  /** When true, a plain click on a word is reported instead of placing the caret. */
  defineMode?: boolean;
  onWordClick?: (word: string, rect: DOMRect, context: string) => void;
};

/** Finds the word under a viewport point inside the editor, if any. */
function wordAtPoint(root: HTMLElement, x: number, y: number): { word: string; rect: DOMRect; context: string } | null {
  type CaretPositionDocument = Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const doc = document as CaretPositionDocument;
  let node: Node | null = null;
  let offset = 0;
  if (doc.caretPositionFromPoint) {
    const position = doc.caretPositionFromPoint(x, y);
    if (position) {
      node = position.offsetNode;
      offset = position.offset;
    }
  } else if (doc.caretRangeFromPoint) {
    const range = doc.caretRangeFromPoint(x, y);
    if (range) {
      node = range.startContainer;
      offset = range.startOffset;
    }
  }
  if (!node || node.nodeType !== Node.TEXT_NODE || !root.contains(node)) return null;

  const text = (node as Text).data;
  const isWordChar = (char: string) => /[\p{L}\p{M}'’-]/u.test(char);
  let start = offset;
  let end = offset;
  while (start > 0 && isWordChar(text[start - 1])) start -= 1;
  while (end < text.length && isWordChar(text[end])) end += 1;
  const raw = text.slice(start, end).replace(/^['’-]+|['’-]+$/g, "");
  if (!raw || !/\p{L}/u.test(raw)) return null;

  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  const rect = range.getBoundingClientRect();
  // Make sure the point is actually over the word, not just nearest to it.
  if (x < rect.left - 2 || x > rect.right + 2 || y < rect.top - 2 || y > rect.bottom + 2) return null;

  const block = (node.parentElement?.closest("p, li, h1, h2, h3, div") as HTMLElement | null) ?? root;
  const context = (block.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  return { word: raw, rect, context };
}

/**
 * The single, always-editable document surface: rich-text formatting via native
 * execCommand, reading-personalisation styling, the reading ruler overlay, and
 * sentence highlighting during playback, all on one contentEditable element.
 */
export function DocumentCanvas({
  editorRef,
  initialHtml,
  settings,
  activeSentenceIndex,
  onContentChange,
  onBlurFlush,
  toolbarEnd,
  defineMode = false,
  onWordClick,
}: DocumentCanvasProps) {
  const [draftHtml] = useState(initialHtml);
  const lastRangeRef = useRef<Range | null>(null);
  const highlightRef = useRef<HTMLElement | null>(null);
  const rulerContainerRef = useRef<HTMLDivElement>(null);
  const [ruler, setRuler] = useState<{ top: number; height: number } | null>(null);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [toolbarState, setToolbarState] = useState<ToolbarState>({
    bold: false,
    italic: false,
    underline: false,
    align: "left",
  });

  const surface = readingSurface(settings);
  const highlightClass = surface.isDark ? "bg-white/20" : "bg-accent/20";

  useEffect(() => {
    document.execCommand("defaultParagraphSeparator", false, "p");
    document.execCommand("styleWithCSS", false, "true");
  }, []);

  // Sentence highlighting via the live DOM, same Range-wrap technique as a read-only
  // render would use. Safe on this always-editable surface because every edit calls
  // onContentChange, which the parent uses to stop speech immediately — so by the
  // time a user is actually typing, this effect has nothing active to wrap.
  useEffect(() => {
    const container = editorRef.current;
    if (!container) return;

    if (highlightRef.current && container.contains(highlightRef.current)) {
      removeHighlight(highlightRef.current);
    }
    highlightRef.current = null;

    if (activeSentenceIndex === null) return;

    const { text: renderedText, segments } = extractPlainTextAndIndex(container);
    const documentSegments = segmentDocument(renderedText);
    const range = getAbsoluteSentenceRange(documentSegments, activeSentenceIndex);
    if (!range) return;

    highlightRef.current = applyHighlight(
      segments,
      range.start,
      range.end,
      `rounded transition-colors duration-200 ${highlightClass}`,
    );
    // Keep the sentence being read in view.
    highlightRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [editorRef, activeSentenceIndex, highlightClass]);

  function syncToolbarState() {
    let align: AlignOption = "left";
    if (document.queryCommandState("justifyCenter")) align = "center";
    else if (document.queryCommandState("justifyRight")) align = "right";

    setToolbarState({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      align,
    });
  }

  function captureSelection() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
      lastRangeRef.current = selection.getRangeAt(0).cloneRange();
    }
    syncToolbarState();
  }

  function restoreSelection() {
    const selection = window.getSelection();
    if (!selection || !lastRangeRef.current) return;
    selection.removeAllRanges();
    selection.addRange(lastRangeRef.current);
  }

  // Toolbar controls (buttons AND native <select>s) steal focus from the
  // contentEditable before their handler runs, which would otherwise collapse or
  // lose the user's selection. Re-focus and restore it first so every command acts
  // on what the user actually had selected.
  function withEditorFocus(action: () => void) {
    editorRef.current?.focus();
    restoreSelection();
    action();
    captureSelection();
  }

  function runCommand(command: string, value?: string) {
    withEditorFocus(() => {
      document.execCommand(command, false, value);
    });
    onContentChange();
  }

  /** Line-sized ruler band around a given vertical position (container coordinates). */
  function placeRuler(centerY: number) {
    const height = Math.max(settings.lineSpacing, settings.fontSize * 1.3);
    setRuler({ top: centerY - height / 2, height });
  }

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (!settings.rulerEnabled || !rulerContainerRef.current) return;
    const rect = rulerContainerRef.current.getBoundingClientRect();
    placeRuler(event.clientY - rect.top);
  }

  // Keyboard users: the ruler follows the text cursor while typing or arrowing.
  function followCaret() {
    if (!settings.rulerEnabled || !rulerContainerRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current?.contains(selection.focusNode)) return;
    const caretRect = selection.getRangeAt(0).getClientRects()[0] ?? (selection.focusNode as Element | null)?.getBoundingClientRect?.();
    if (!caretRect) return;
    const containerRect = rulerContainerRef.current.getBoundingClientRect();
    placeRuler(caretRect.top + caretRect.height / 2 - containerRect.top);
  }

  function handleEditorClick(event: MouseEvent<HTMLDivElement>) {
    if (!defineMode || !editorRef.current || !onWordClick) return;
    // Never interfere with a drag-selection the user just made.
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;
    const hit = wordAtPoint(editorRef.current, event.clientX, event.clientY);
    if (hit) onWordClick(hit.word, hit.rect, hit.context);
  }

  const rulerColour = surface.isDark ? "rgba(255,255,255,0.14)" : "rgba(31,95,224,0.12)";

  return (
    <div className={`flex flex-col ${defineMode ? "define-mode" : ""}`}>
      <FormattingToolbar
        state={toolbarState}
        isFindReplaceOpen={isFindReplaceOpen}
        onToggleFindReplace={() => setIsFindReplaceOpen((open) => !open)}
        actions={{
          toggleBold: () => runCommand("bold"),
          toggleItalic: () => runCommand("italic"),
          toggleUnderline: () => runCommand("underline"),
          setAlignment: (align) => runCommand(ALIGN_COMMANDS[align]),
          setHeading: (heading) => runCommand("formatBlock", `<${HEADING_TAGS[heading]}>`),
          insertBulletedList: () => runCommand("insertUnorderedList"),
          insertNumberedList: () => runCommand("insertOrderedList"),
          undo: () => runCommand("undo"),
          redo: () => runCommand("redo"),
        }}
        end={toolbarEnd}
      />

      {isFindReplaceOpen && <FindReplaceBar editorRef={editorRef} onClose={() => setIsFindReplaceOpen(false)} />}

      <div
        ref={rulerContainerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setRuler(null)}
        className="relative overflow-hidden rounded-b-2xl border border-t-0 border-border shadow-sm transition-colors duration-300"
        style={{ backgroundColor: surface.background }}
      >
        {settings.rulerEnabled && ruler && settings.rulerStyle === "line-highlight" && (
          <div className="pointer-events-none absolute inset-x-0" style={{ top: ruler.top, height: ruler.height, backgroundColor: rulerColour }} aria-hidden="true" />
        )}
        {settings.rulerEnabled && ruler && settings.rulerStyle === "underline" && (
          <div
            className="pointer-events-none absolute inset-x-6 h-0.5 rounded-full bg-accent/70"
            style={{ top: ruler.top + ruler.height - 2 }}
            aria-hidden="true"
          />
        )}
        {settings.rulerEnabled && ruler && settings.rulerStyle === "window" && (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-black/35" style={{ height: Math.max(0, ruler.top) }} aria-hidden="true" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-black/35" style={{ top: ruler.top + ruler.height }} aria-hidden="true" />
          </>
        )}
        <article className={`relative mx-auto max-w-[46rem] px-6 py-10 sm:px-12 sm:py-14 ${surface.fontClass}`} style={surface.textStyle}>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck
            dangerouslySetInnerHTML={{ __html: draftHtml }}
            onInput={() => {
              captureSelection();
              onContentChange();
              followCaret();
            }}
            onKeyUp={() => {
              captureSelection();
              followCaret();
            }}
            onMouseUp={captureSelection}
            onClick={handleEditorClick}
            onBlur={() => {
              captureSelection();
              onBlurFlush();
            }}
            aria-label={defineMode ? "Document content — click a word to see its definition" : "Document content — click anywhere to start typing"}
            className="rich-document min-h-[60vh] w-full outline-none [&_h1]:text-[1.6em] [&_h1]:font-semibold [&_h1]:leading-tight [&_h2]:text-[1.3em] [&_h2]:font-semibold [&_h3]:text-[1.12em] [&_h3]:font-semibold [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
            style={{ "--eyeread-paragraph-gap": `${settings.paragraphSpacing}px` } as CSSProperties}
          />
        </article>
      </div>
    </div>
  );
}
