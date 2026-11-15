"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Loader2, Volume2, X } from "lucide-react";
import type { DefineResult } from "@/lib/define/types";

const cache = new Map<string, DefineResult>();
const RATE_LIMIT_MESSAGE = "Too many requests. Please wait a minute and try again.";

type DefinitionPopupProps = {
  word: string;
  /** Viewport rect of the clicked word. */
  anchor: DOMRect;
  onClose: () => void;
  /** False while the document is being read aloud — the device voice is busy then. */
  canUseDeviceVoice: boolean;
};

const POPUP_WIDTH = 340;
const MARGIN = 12;

export function DefinitionPopup({ word, anchor, onClose, canUseDeviceVoice }: DefinitionPopupProps) {
  const key = word.toLowerCase();
  const [result, setResult] = useState<DefineResult | null>(() => cache.get(key) ?? null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [audioError, setAudioError] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (cache.has(key)) return;
    const controller = new AbortController();
    fetch(`/api/define?word=${encodeURIComponent(word)}`, { signal: controller.signal })
      .then((response) =>
        // Rate-limited (e.g. by the hosting firewall) — the body may not be our JSON.
        response.status === 429
          ? ({ status: "error", message: RATE_LIMIT_MESSAGE } satisfies DefineResult)
          : (response.json() as Promise<DefineResult>),
      )
      .then((data) => {
        if (data.status !== "error") cache.set(key, data);
        setResult(data);
      })
      .catch((error: unknown) => {
        if ((error as Error).name === "AbortError") return;
        setResult({ status: "error", message: "Couldn't reach the dictionary. Check your connection." });
      });
    return () => controller.abort();
  }, [key, word]);

  // Place below the word, or above it if there isn't room; keep inside the viewport.
  useLayoutEffect(() => {
    const height = popupRef.current?.offsetHeight ?? 200;
    const width = Math.min(POPUP_WIDTH, window.innerWidth - MARGIN * 2);
    const left = Math.min(Math.max(MARGIN, anchor.left + anchor.width / 2 - width / 2), window.innerWidth - width - MARGIN);
    const below = anchor.bottom + 8;
    const top = below + height + MARGIN > window.innerHeight ? Math.max(MARGIN, anchor.top - height - 8) : below;
    setPosition({ top, left });
  }, [anchor, result]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    function onPointerDown(event: PointerEvent) {
      if (!popupRef.current?.contains(event.target as Node)) onClose();
    }
    window.addEventListener("keydown", onKey);
    // Defer so the click that opened the popup doesn't immediately close it.
    const timer = setTimeout(() => document.addEventListener("pointerdown", onPointerDown), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(timer);
      document.removeEventListener("pointerdown", onPointerDown);
      audioRef.current?.pause();
    };
  }, [onClose]);

  function playPronunciation() {
    setAudioError(false);
    if (result?.status === "ok" && result.audioUrl) {
      audioRef.current?.pause();
      const audio = new Audio(result.audioUrl);
      audioRef.current = audio;
      audio.play().catch(() => setAudioError(true));
      return;
    }
    if (canUseDeviceVoice && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(result?.status === "ok" ? result.word : word);
      utterance.lang = "en";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  }

  const hasRecording = result?.status === "ok" && Boolean(result.audioUrl);
  const canPlay = hasRecording || (canUseDeviceVoice && typeof window !== "undefined" && "speechSynthesis" in window);

  return (
    <div
      ref={popupRef}
      role="dialog"
      aria-label={`Definition of ${word}`}
      className="fixed z-[60] flex max-h-[60vh] flex-col overflow-hidden rounded-2xl border border-border bg-surface text-foreground shadow-xl"
      style={{
        top: position?.top ?? anchor.bottom + 8,
        left: position?.left ?? anchor.left,
        width: Math.min(POPUP_WIDTH, typeof window !== "undefined" ? window.innerWidth - MARGIN * 2 : POPUP_WIDTH),
        visibility: position ? "visible" : "hidden",
      }}
    >
      <div className="flex items-start gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{result?.status === "ok" ? result.word : word}</p>
          {result?.status === "ok" && result.phonetic && <p className="text-sm text-muted">{result.phonetic}</p>}
        </div>
        {result?.status === "ok" && (
          <button
            type="button"
            onClick={playPronunciation}
            disabled={!canPlay}
            aria-label={hasRecording ? "Play pronunciation" : "Say this word with your device's voice"}
            title={
              hasRecording ? "Play pronunciation" : canPlay ? "Say it with your device's voice" : "Pause read aloud to hear this word"
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent hover:bg-accent hover:text-on-accent disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <Volume2 className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close definition"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-y-auto px-4 py-3" aria-live="polite">
        {!result && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Looking up “{word}”…
          </p>
        )}
        {result && result.status !== "ok" && <p className="text-sm text-muted">{result.message}</p>}
        {result?.status === "ok" && (
          <ol className="flex flex-col gap-3">
            {result.senses.map((sense, index) => (
              <li key={index} className="text-sm leading-relaxed">
                {sense.partOfSpeech && <p className="text-xs font-semibold uppercase tracking-wide text-accent">{sense.partOfSpeech}</p>}
                <p className="mt-0.5">{sense.definition}</p>
                {sense.example && <p className="mt-1 border-l-2 border-border pl-3 italic text-muted">“{sense.example}”</p>}
              </li>
            ))}
          </ol>
        )}
        {audioError && <p className="mt-2 text-xs text-error">The pronunciation couldn&apos;t be played.</p>}
      </div>

      {result?.status === "ok" && (
        <p className="border-t border-border px-4 py-2 text-[11px] text-muted">
          From Wiktionary via the Free Dictionary API
          {result.sourceUrl && (
            <>
              {" · "}
              <a href={result.sourceUrl} target="_blank" rel="noreferrer" className="underline hover:text-foreground">
                Source
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
