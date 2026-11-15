"use client";

import { useEffect, useRef, useState } from "react";
import { BookA, ChevronLeft, ChevronRight, Maximize2, Menu, Minimize2, PanelLeft, PanelRight, Pause, Play, Star, X } from "lucide-react";
import { useRegisterAssistantDocument } from "@/components/assistant/useAssistant";
import { Logo } from "@/components/layout/Logo";
import { SideNav } from "@/components/layout/SideNav";
import { AudioControls } from "@/components/reading/AudioControls";
import { DefinitionPopup } from "@/components/reading/DefinitionPopup";
import { DocumentCanvas } from "@/components/reading/DocumentCanvas";
import { DocumentTitleField } from "@/components/reading/DocumentTitleField";
import { ToolbarButton } from "@/components/reading/FormattingToolbar";
import { ReadingPanel } from "@/components/reading/ReadingPanel";
import { SAMPLE_TEXT } from "@/components/reading/sampleText";
import { normalizeSettings, type ReadingSettings } from "@/components/reading/settings";
import { useSpeech } from "@/components/reading/useSpeech";
import { saveDocumentForReading, type StoredDocument } from "@/lib/documentHandoff";
import { getDocument, saveDocumentContent, setStarred, updateDocument } from "@/lib/library/store";
import type { LibraryDocument } from "@/lib/library/types";
import { readReadingProfile, saveReadingProfile } from "@/lib/profile/readingProfile";
import { extractPlainTextAndIndex, wrapPlainTextAsHtml } from "@/lib/richtext/domText";
import { sanitizeEditableContent } from "@/lib/richtext/sanitize";
import { splitIntoParagraphs } from "@/lib/text/paragraphs";
import { PagesPanel, type OutlineItem } from "./PagesPanel";

const iconButton =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-40";

function isWideScreen(query: string): boolean {
  return typeof window !== "undefined" && window.matchMedia(query).matches;
}

type WorkspaceEditorProps = {
  storedDocument: StoredDocument | null;
};

export function WorkspaceEditor({ storedDocument }: WorkspaceEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const structureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileNameRef = useRef(storedDocument?.fileName ?? null);
  const documentIdRef = useRef(storedDocument?.documentId);
  const documentId = storedDocument?.documentId;

  // New documents open with the saved Reading Profile; a document's own adjustments
  // (stored in the library) replace these once its metadata has loaded.
  const [profile] = useState(() => readReadingProfile());
  const [settings, setSettings] = useState<ReadingSettings>(profile.settings);
  const settingsTouchedRef = useRef(false);
  const [focusMode, setFocusMode] = useState(profile.settings.focusMode);
  const [defaultSaveState, setDefaultSaveState] = useState<"idle" | "saved" | "failed">("idle");

  const [isLeftOpen, setIsLeftOpen] = useState(() => isWideScreen("(min-width: 1024px)"));
  const [isRightOpen, setIsRightOpen] = useState(() => isWideScreen("(min-width: 1280px)"));
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [defineMode, setDefineMode] = useState(false);
  const [definition, setDefinition] = useState<{ word: string; anchor: DOMRect } | null>(null);

  const [meta, setMeta] = useState<LibraryDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [navigablePages, setNavigablePages] = useState<Set<number>>(() => new Set());
  const [outline, setOutline] = useState<OutlineItem[]>([]);

  const [title, setTitle] = useState(
    () => storedDocument?.title ?? storedDocument?.fileName ?? "Untitled document",
  );
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");

  const [initialHtml] = useState(() => {
    if (storedDocument?.html) return storedDocument.html;
    const fallbackText = storedDocument?.text ?? SAMPLE_TEXT;
    return wrapPlainTextAsHtml(splitIntoParagraphs(fallbackText));
  });
  const [hasContent, setHasContent] = useState(
    () => initialHtml.replace(/<[^>]*>/g, "").trim().length > 0,
  );

  const titleRef = useRef(title);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  function getCurrentDocumentText(): string {
    if (!editorRef.current) return "";
    return extractPlainTextAndIndex(editorRef.current).text;
  }

  // The chat box takes focus (and the browser's selection) when the user types a
  // question, so remember the last selection / cursor paragraph inside the document.
  const lastSelectionRef = useRef("");
  const cursorParagraphRef = useRef("");
  useEffect(() => {
    function onSelectionChange() {
      const editor = editorRef.current;
      const selection = window.getSelection();
      if (!editor || !selection || selection.rangeCount === 0 || !editor.contains(selection.anchorNode)) return;
      if (selection.isCollapsed) {
        lastSelectionRef.current = "";
        const block = selection.anchorNode?.parentElement?.closest("p, li, h1, h2, h3");
        cursorParagraphRef.current = block && editor.contains(block) ? (block.textContent ?? "").trim() : "";
      } else {
        lastSelectionRef.current = selection.toString().trim();
      }
    }
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  const speech = useSpeech(getCurrentDocumentText, profile.readAloud);

  useRegisterAssistantDocument({
    title,
    getDocumentText: getCurrentDocumentText,
    getSelectionText: () => lastSelectionRef.current,
    getCursorParagraph: () => cursorParagraphRef.current,
  });

  /* ------------------------------------------------------------ document structure */

  /** Re-reads page markers and headings from the live document. */
  function refreshStructure() {
    const editor = editorRef.current;
    if (!editor) return;
    const pages = new Set<number>();
    editor.querySelectorAll<HTMLElement>("[data-page]").forEach((element) => {
      const page = Number(element.dataset.page);
      if (Number.isInteger(page) && page > 0) pages.add(page);
    });
    setNavigablePages(pages);
    const headings = Array.from(editor.querySelectorAll<HTMLElement>("h1, h2, h3"));
    setOutline(
      headings
        .map((heading, index) => ({
          index,
          level: Number(heading.tagName[1]) as 1 | 2 | 3,
          text: (heading.textContent ?? "").trim(),
        }))
        .filter((item) => item.text),
    );
  }

  function scheduleStructureRefresh() {
    if (structureTimeoutRef.current) clearTimeout(structureTimeoutRef.current);
    structureTimeoutRef.current = setTimeout(refreshStructure, 400);
  }

  /** Current page = the page marker of the first block visible below the toolbar. */
  function computeCurrentPage(): number {
    const editor = editorRef.current;
    const container = scrollRef.current;
    if (!editor || !container) return 1;
    const threshold = container.getBoundingClientRect().top + 90;
    const blocks = editor.querySelectorAll<HTMLElement>("[data-page]");
    for (const block of blocks) {
      if (block.getBoundingClientRect().bottom > threshold) return Number(block.dataset.page) || 1;
    }
    return blocks.length ? Number(blocks[blocks.length - 1].dataset.page) || 1 : 1;
  }

  function scrollRatio(): number {
    const container = scrollRef.current;
    if (!container) return 0;
    const max = container.scrollHeight - container.clientHeight;
    return max > 0 ? Math.min(1, Math.max(0, container.scrollTop / max)) : 0;
  }

  function handleScroll() {
    if (definition) setDefinition(null);
    const page = computeCurrentPage();
    setCurrentPage(page);
    if (!documentIdRef.current) return;
    if (progressSaveRef.current) clearTimeout(progressSaveRef.current);
    progressSaveRef.current = setTimeout(() => {
      const id = documentIdRef.current;
      if (id) {
        void updateDocument(id, { readingProgress: { page: computeCurrentPage(), ratio: scrollRatio() } }, { touch: false, silent: true }).catch(() => {});
      }
    }, 800);
  }

  function goToPage(page: number) {
    const target = editorRef.current?.querySelector<HTMLElement>(`[data-page="${page}"]`);
    if (target) {
      target.scrollIntoView({ block: "start", behavior: "smooth" });
      setCurrentPage(page);
    }
  }

  function goToHeading(index: number) {
    const headings = editorRef.current?.querySelectorAll<HTMLElement>("h1, h2, h3");
    headings?.[index]?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  // Initial structure read (after the editor has its content), then library metadata:
  // per-document settings, page count and the saved reading position.
  useEffect(() => {
    const frame = requestAnimationFrame(refreshStructure);
    if (!documentId) return () => cancelAnimationFrame(frame);
    let cancelled = false;
    getDocument(documentId)
      .then((document) => {
        if (cancelled || !document) return;
        setMeta(document);
        if (document.readingSettings && !settingsTouchedRef.current) {
          setSettings(normalizeSettings(document.readingSettings, profile.settings));
        }
        const progress = document.readingProgress;
        if (progress) {
          requestAnimationFrame(() => {
            const container = scrollRef.current;
            if (!container) return;
            const marker = editorRef.current?.querySelector<HTMLElement>(`[data-page="${progress.page}"]`);
            if (marker && progress.ratio === 0) marker.scrollIntoView({ block: "start" });
            else container.scrollTop = progress.ratio * (container.scrollHeight - container.clientHeight);
            setCurrentPage(computeCurrentPage());
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
    // Runs once for the document this editor was seeded with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------ autosave */

  function writeDocumentToStorage() {
    if (!editorRef.current) return;
    const sanitized = sanitizeEditableContent(editorRef.current);
    const { text } = extractPlainTextAndIndex(sanitized);
    saveDocumentForReading({
      documentId: documentIdRef.current,
      fileName: fileNameRef.current,
      text,
      html: sanitized.innerHTML,
      title: titleRef.current,
    });
    // Library documents also autosave to IndexedDB so they survive closing the tab.
    if (documentIdRef.current) {
      void saveDocumentContent(documentIdRef.current, { html: sanitized.innerHTML, text, title: titleRef.current }).catch(() => {});
    }
  }

  function persistNow() {
    writeDocumentToStorage();
    setSaveStatus("saved");
  }

  function scheduleSave() {
    setSaveStatus("saving");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      persistNow();
    }, 600);
  }

  function flushSave() {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    persistNow();
  }

  // Flush a pending debounced save if the page goes away mid-type. Calls the
  // state-free write directly (not persistNow) — setting React state during an
  // unmounting component's cleanup is something to avoid, and there's no UI left
  // to show "Saved" to anyway.
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        writeDocumentToStorage();
      }
      if (structureTimeoutRef.current) clearTimeout(structureTimeoutRef.current);
      if (settingsSaveRef.current) clearTimeout(settingsSaveRef.current);
      if (progressSaveRef.current) clearTimeout(progressSaveRef.current);
    };
  }, []);

  function updateSettings(next: Partial<ReadingSettings>) {
    settingsTouchedRef.current = true;
    setDefaultSaveState("idle");
    const merged = { ...settings, ...next };
    setSettings(merged);
    const id = documentIdRef.current;
    if (id) {
      if (settingsSaveRef.current) clearTimeout(settingsSaveRef.current);
      settingsSaveRef.current = setTimeout(() => {
        void updateDocument(id, { readingSettings: merged }, { touch: false, silent: true }).catch(() => {});
      }, 500);
    }
  }

  function saveSettingsAsDefault() {
    const current = readReadingProfile();
    const ok = saveReadingProfile({ ...current, settings: { ...settings, focusMode: current.settings.focusMode } });
    setDefaultSaveState(ok ? "saved" : "failed");
  }

  function handleDocumentChange() {
    // Every edit stops playback immediately — TTS must never keep reading content
    // that's about to change out from under it.
    speech.stop();
    setHasContent((editorRef.current?.textContent ?? "").trim().length > 0);
    scheduleSave();
    scheduleStructureRefresh();
  }

  function toggleReadAloud() {
    if (speech.state === "playing") speech.pause();
    else if (speech.state === "paused") speech.resume();
    else speech.play();
  }

  async function toggleStar() {
    if (!meta) return;
    const next = !meta.starred;
    setMeta({ ...meta, starred: next });
    await setStarred(meta.id, next).catch(() => setMeta((current) => (current ? { ...current, starred: !next } : current)));
  }

  /* ------------------------------------------------------------ render */

  const pageCount = meta?.pageCount ?? Math.max(1, navigablePages.size);
  const hasPageNav = pageCount > 1 && navigablePages.size > 0;
  const showLeft = !focusMode && isLeftOpen;
  const showRight = !focusMode && isRightOpen;

  // Keep the floating Ask ReadEase button clear of the docked reading panel.
  useEffect(() => {
    const root = document.documentElement;
    const query = window.matchMedia("(min-width: 1280px)");
    function apply() {
      if (showRight && query.matches) root.style.setProperty("--assistant-launcher-right", "calc(22rem + 1.5rem)");
      else root.style.removeProperty("--assistant-launcher-right");
    }
    apply();
    query.addEventListener("change", apply);
    return () => {
      query.removeEventListener("change", apply);
      root.style.removeProperty("--assistant-launcher-right");
    };
  }, [showRight]);

  const audio = (
    <AudioControls
      state={speech.state}
      isSupported={speech.isSupported}
      hasContent={hasContent}
      rate={speech.rate}
      onPlay={speech.play}
      onPause={speech.pause}
      onResume={speech.resume}
      onStop={speech.stop}
      onRateChange={speech.setRate}
      voices={speech.voices}
      selectedVoice={speech.selectedVoice}
      onVoiceChange={speech.setVoice}
      onPreviewVoice={speech.previewVoice}
    />
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-surface px-3 sm:px-4">
        {!focusMode && (
          <button type="button" className={`${iconButton} lg:hidden`} aria-label="Open navigation" onClick={() => setIsNavOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="hidden sm:block">
          <Logo compact />
        </div>
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <DocumentTitleField value={title} onChange={setTitle} onCommit={flushSave} />
          <p className="hidden shrink-0 text-xs text-muted md:block" aria-live="polite">
            {saveStatus === "saving" ? "Saving…" : documentId ? "All changes saved" : "Saved for this session"}
          </p>
        </div>

        {hasPageNav && (
          <div className="hidden items-center gap-1 md:flex" role="group" aria-label="Page navigation">
            <button type="button" className={iconButton} onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[4.5rem] rounded-lg border border-border px-2 py-1 text-center text-sm tabular-nums text-foreground">
              {currentPage} of {pageCount}
            </span>
            <button
              type="button"
              className={iconButton}
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= pageCount}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {meta && (
          <button
            type="button"
            className={iconButton}
            onClick={() => void toggleStar()}
            aria-pressed={meta.starred}
            aria-label={meta.starred ? "Remove from Starred" : "Add to Starred"}
            title={meta.starred ? "Starred" : "Star this document"}
          >
            <Star className={`h-4 w-4 ${meta.starred ? "fill-amber-400 text-amber-500" : ""}`} />
          </button>
        )}

        {speech.isSupported && (
          <button
            type="button"
            onClick={toggleReadAloud}
            disabled={!hasContent && speech.state === "idle"}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-accent px-3 text-sm font-medium text-on-accent shadow-sm hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50 sm:px-4"
          >
            {speech.state === "playing" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
            <span className="hidden sm:inline">{speech.state === "playing" ? "Pause" : speech.state === "paused" ? "Resume" : "Read aloud"}</span>
          </button>
        )}

        {!focusMode && (
          <>
            <button
              type="button"
              className={`${iconButton} ${isLeftOpen ? "text-accent" : ""}`}
              onClick={() => setIsLeftOpen((open) => !open)}
              aria-pressed={isLeftOpen}
              aria-label="Pages and outline"
              title="Pages and outline"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={`${iconButton} ${isRightOpen ? "text-accent" : ""}`}
              onClick={() => setIsRightOpen((open) => !open)}
              aria-pressed={isRightOpen}
              aria-label="Reading and accessibility settings"
              title="Reading & Accessibility"
            >
              <PanelRight className="h-4 w-4" />
            </button>
          </>
        )}
        <button
          type="button"
          className={`${iconButton} ${focusMode ? "text-accent" : ""}`}
          onClick={() => setFocusMode((value) => !value)}
          aria-pressed={focusMode}
          aria-label={focusMode ? "Exit focus mode" : "Focus mode"}
          title={focusMode ? "Exit focus mode" : "Focus mode"}
        >
          {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Main navigation as a compact rail (same navigation as every other page). */}
        {!focusMode && (
          <aside className="hidden w-16 shrink-0 border-r border-border bg-surface lg:block">
            <SideNav compact />
          </aside>
        )}

        {/* Pages / outline: docked on large screens, overlay below that. */}
        {showLeft && (
          <>
            <button
              type="button"
              aria-label="Close pages panel"
              className="fixed inset-0 z-30 bg-foreground/20 lg:hidden"
              onClick={() => setIsLeftOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-surface shadow-xl lg:static lg:z-auto lg:w-56 lg:shadow-none">
              <PagesPanel
                documentId={documentId}
                kind={meta?.kind ?? null}
                pageCount={pageCount}
                currentPage={currentPage}
                navigablePages={navigablePages}
                onSelectPage={goToPage}
                outline={outline}
                onSelectHeading={goToHeading}
              />
            </aside>
          </>
        )}

        {/* Document */}
        <div ref={scrollRef} onScroll={handleScroll} className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-4xl px-3 py-4 sm:px-6 sm:py-6">
            <DocumentCanvas
              editorRef={editorRef}
              initialHtml={initialHtml}
              settings={settings}
              activeSentenceIndex={speech.activeSentenceIndex}
              onContentChange={handleDocumentChange}
              onBlurFlush={flushSave}
              defineMode={defineMode}
              onWordClick={(word, anchor) => setDefinition({ word, anchor })}
              toolbarEnd={
                <ToolbarButton
                  active={defineMode}
                  label={defineMode ? "Define mode on — click a word for its meaning" : "Define words"}
                  onClick={() => {
                    setDefineMode((value) => !value);
                    setDefinition(null);
                  }}
                >
                  <BookA className="h-4 w-4" />
                </ToolbarButton>
              }
            />
            {defineMode && (
              <p className="mt-2 text-center text-xs text-muted" role="status">
                Define mode is on — click any word to see its meaning. Turn it off in the toolbar to go back to editing.
              </p>
            )}
          </div>
        </div>

        {/* Reading & accessibility: docked + sticky on wide screens, overlay below that. */}
        {showRight && (
          <>
            <button
              type="button"
              aria-label="Close reading panel"
              className="fixed inset-0 z-30 bg-foreground/20 xl:hidden"
              onClick={() => setIsRightOpen(false)}
            />
            <aside
              aria-label="Reading and accessibility"
              className="fixed inset-y-0 right-0 z-40 w-[22rem] max-w-[90vw] border-l border-border bg-surface shadow-xl xl:static xl:z-auto xl:max-w-none xl:shadow-none"
            >
              <ReadingPanel
                settings={settings}
                onChange={updateSettings}
                focusMode={focusMode}
                onFocusModeChange={setFocusMode}
                audio={audio}
                onSaveAsDefault={saveSettingsAsDefault}
                defaultSaveState={defaultSaveState}
                onClose={() => setIsRightOpen(false)}
              />
            </aside>
          </>
        )}
      </div>

      {/* Mobile navigation drawer */}
      {isNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-foreground/30" onClick={() => setIsNavOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <Logo />
              <button type="button" className={iconButton} aria-label="Close navigation" onClick={() => setIsNavOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SideNav onNavigate={() => setIsNavOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {definition && (
        <DefinitionPopup
          key={`${definition.word}-${definition.anchor.top}-${definition.anchor.left}`}
          word={definition.word}
          anchor={definition.anchor}
          onClose={() => setDefinition(null)}
          canUseDeviceVoice={speech.state === "idle"}
        />
      )}

    </div>
  );
}
