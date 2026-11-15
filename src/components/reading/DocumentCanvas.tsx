"use client";

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type RefObject } from "react";
import { extractPlainTextAndIndex } from "@/lib/richtext/domText";
import { applyHighlight, removeHighlight } from "@/lib/richtext/highlightRange";
import { getAbsoluteSentenceRange, segmentDocument } from "@/lib/text/sentences";
import { FindReplaceBar } from "./FindReplaceBar";
import { FormattingToolbar, type ToolbarState } from "./FormattingToolbar";
import type { AlignOption, HeadingOption } from "./formattingTypes";
import { BACKGROUND_PRESETS, FONT_OPTIONS, type ReadingSettings } from "./settings";

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
};

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
}: DocumentCanvasProps) {
  const [draftHtml] = useState(initialHtml);
  const lastRangeRef = useRef<Range | null>(null);
  const highlightRef = useRef<HTMLElement | null>(null);
  const rulerContainerRef = useRef<HTMLDivElement>(null);
  const [rulerY, setRulerY] = useState<number | null>(null);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [toolbarState, setToolbarState] = useState<ToolbarState>({
    bold: false,
    italic: false,
    underline: false,
    align: "left",
  });

  const fontClass = FONT_OPTIONS.find((option) => option.value === settings.font)?.className ?? "font-serif";
  const preset =
    BACKGROUND_PRESETS.find((option) => option.value === settings.background) ?? BACKGROUND_PRESETS[0];
  const highlightClass = preset.value === "charcoal" ? "bg-background/25" : "bg-forest/15";

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

  // execCommand's own fontName/fontSize produce legacy <font> tags with a crude
  // 1-7 size scale — this wraps the selection in a plain styled <span> instead,
  // still routed through execCommand("insertHTML") so it's one native undo step.
  // Requires a non-collapsed selection (a known, intentional scope limit).
  function applyInlineStyle(cssProperty: "font-family" | "font-size", value: string) {
    withEditorFocus(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
      const range = selection.getRangeAt(0);
      if (!editorRef.current || !editorRef.current.contains(range.commonAncestorContainer)) return;

      const fragment = range.cloneContents();
      const container = document.createElement("div");
      container.appendChild(fragment);
      document.execCommand(
        "insertHTML",
        false,
        `<span style="${cssProperty}:${value}">${container.innerHTML}</span>`,
      );
    });
    onContentChange();
  }

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (!settings.rulerEnabled || !rulerContainerRef.current) return;
    const rect = rulerContainerRef.current.getBoundingClientRect();
    setRulerY(event.clientY - rect.top);
  }

  return (
    <div className="flex flex-col">
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
          setFontFamily: (family) => applyInlineStyle("font-family", family),
          setFontSize: (size) => applyInlineStyle("font-size", size),
          insertBulletedList: () => runCommand("insertUnorderedList"),
          insertNumberedList: () => runCommand("insertOrderedList"),
          undo: () => runCommand("undo"),
          redo: () => runCommand("redo"),
        }}
      />

      {isFindReplaceOpen && <FindReplaceBar editorRef={editorRef} onClose={() => setIsFindReplaceOpen(false)} />}

      <div
        ref={rulerContainerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setRulerY(null)}
        className="relative overflow-hidden rounded-b-xl border border-t-0 border-border transition-colors duration-300"
        style={{ backgroundColor: preset.swatch }}
      >
        {settings.rulerEnabled && rulerY !== null && (
          <div
            className="pointer-events-none absolute left-0 right-0 border-y border-forest/30 bg-forest/15"
            style={{ top: rulerY - 18, height: 36 }}
          />
        )}
        <article
          className={`relative px-8 py-10 sm:px-12 sm:py-14 ${fontClass} ${preset.textClass}`}
          style={{
            fontSize: `${settings.fontSize}px`,
            letterSpacing: `${settings.letterSpacing}px`,
            wordSpacing: `${settings.wordSpacing}px`,
            lineHeight: `${settings.lineSpacing}px`,
          }}
        >
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            dangerouslySetInnerHTML={{ __html: draftHtml }}
            onInput={() => {
              captureSelection();
              onContentChange();
            }}
            onKeyUp={captureSelection}
            onMouseUp={captureSelection}
            onBlur={() => {
              captureSelection();
              onBlurFlush();
            }}
            aria-label="Document content — click anywhere to start typing"
            className="rich-document min-h-[60vh] w-full outline-none [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
            style={{ "--eyeread-paragraph-gap": `${settings.paragraphSpacing}px` } as CSSProperties}
          />
        </article>
      </div>
    </div>
  );
}
