"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Header } from "@/components/layout/Header";
import { Shell } from "@/components/layout/Shell";
import { AssistantLauncher } from "@/components/assistant/AssistantLauncher";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { useAssistant } from "@/components/assistant/useAssistant";
import { AudioControls } from "@/components/reading/AudioControls";
import { DocumentCanvas } from "@/components/reading/DocumentCanvas";
import { DocumentTitleField } from "@/components/reading/DocumentTitleField";
import { SAMPLE_TEXT } from "@/components/reading/sampleText";
import { SettingsSidebar } from "@/components/reading/SettingsSidebar";
import { DEFAULT_SETTINGS, type ReadingSettings } from "@/components/reading/settings";
import { useSpeech } from "@/components/reading/useSpeech";
import { saveDocumentForReading, useStoredDocument, type StoredDocument } from "@/lib/documentHandoff";
import { extractPlainTextAndIndex, wrapPlainTextAsHtml } from "@/lib/richtext/domText";
import { sanitizeEditableContent } from "@/lib/richtext/sanitize";
import { splitIntoParagraphs } from "@/lib/text/paragraphs";

function subscribeToNothing() {
  return () => {};
}
function getTrue() {
  return true;
}
function getFalse() {
  return false;
}

/**
 * The document canvas now seeds itself once, permanently, on mount — unlike the old
 * read-only preview, it never gets a second chance to pick up the "real" stored
 * document if it mounted too early. useStoredDocument() returns null during SSR and
 * on the very first client render (by design, to match server markup), resolving to
 * the real value only once React re-checks after mount. This flips false -> true on
 * that same re-check, so gating the editor's mount on it guarantees the editor only
 * ever seeds from the correct, fully-resolved document — never a placeholder that
 * autosave could then overwrite the real one with.
 */
function useHasHydrated(): boolean {
  return useSyncExternalStore(subscribeToNothing, getTrue, getFalse);
}

export default function WorkspacePage() {
  const hasHydrated = useHasHydrated();
  const storedDocument = useStoredDocument();

  return (
    <div className="flex flex-1 flex-col">
      <Shell>
        <Header action={{ label: "Back to EyeRead", href: "/" }} />
      </Shell>
      <main className="flex-1 pb-16">
        <Shell>{hasHydrated ? <WorkspaceEditor storedDocument={storedDocument} /> : <WorkspaceSkeleton />}</Shell>
      </main>
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-56 rounded bg-sage-soft/40" />
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="h-[60vh] rounded-xl border border-border bg-sage-soft/20" />
        <div className="h-64 rounded-3xl border border-border bg-sage-soft/20" />
      </div>
    </div>
  );
}

type WorkspaceEditorProps = {
  storedDocument: StoredDocument | null;
};

function WorkspaceEditor({ storedDocument }: WorkspaceEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileNameRef = useRef(storedDocument?.fileName ?? null);

  const [settings, setSettings] = useState<ReadingSettings>(DEFAULT_SETTINGS);
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

  function getCurrentSelectionText(): string {
    if (!editorRef.current) return "";
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return "";
    if (!editorRef.current.contains(selection.anchorNode)) return "";
    return selection.toString();
  }

  const speech = useSpeech(getCurrentDocumentText);

  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const assistant = useAssistant({
    getDocumentText: getCurrentDocumentText,
    getSelectionText: getCurrentSelectionText,
    documentTitle: title,
  });

  function writeDocumentToStorage() {
    if (!editorRef.current) return;
    const sanitized = sanitizeEditableContent(editorRef.current);
    const { text } = extractPlainTextAndIndex(sanitized);
    saveDocumentForReading({
      fileName: fileNameRef.current,
      text,
      html: sanitized.innerHTML,
      title: titleRef.current,
    });
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
    };
  }, []);

  function updateSettings(next: Partial<ReadingSettings>) {
    setSettings((previous) => ({ ...previous, ...next }));
  }

  function handleDocumentChange() {
    // Every edit stops playback immediately — TTS must never keep reading content
    // that's about to change out from under it.
    speech.stop();
    setHasContent((editorRef.current?.textContent ?? "").trim().length > 0);
    scheduleSave();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DocumentTitleField value={title} onChange={setTitle} onCommit={flushSave} />
        <p className="shrink-0 text-xs text-foreground/50" aria-live="polite">
          {saveStatus === "saving" ? "Saving…" : "All changes saved"}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-6">
          <DocumentCanvas
            editorRef={editorRef}
            initialHtml={initialHtml}
            settings={settings}
            activeSentenceIndex={speech.activeSentenceIndex}
            onContentChange={handleDocumentChange}
            onBlurFlush={flushSave}
          />
        </div>
        <div className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
          <SettingsSidebar settings={settings} onChange={updateSettings} />
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
        </div>
      </div>

      {!isAssistantOpen && <AssistantLauncher onClick={() => setIsAssistantOpen(true)} />}
      <AssistantPanel isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} assistant={assistant} />
    </div>
  );
}
