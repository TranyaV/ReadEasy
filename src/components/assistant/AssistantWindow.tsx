"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { FileText, Maximize2, Minimize2, Minus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";
import { SuggestedPrompts } from "./SuggestedPrompts";
import type { UseAssistantResult } from "./useAssistant";

type Rect = { x: number; y: number; width: number; height: number };
type Edge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const MIN_WIDTH = 320;
const MIN_HEIGHT = 380;
const MAX_WIDTH = 720;
const MAX_HEIGHT = 860;
const MAXIMISED_WIDTH = 980;
const EDGE_GAP = 12;
const SHEET_BREAKPOINT = 640;

function viewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

/** Keeps a rect within size limits and fully inside the visible viewport. */
function clampRect(rect: Rect, maxWidth = MAX_WIDTH, maxHeight = MAX_HEIGHT): Rect {
  const { width: vw, height: vh } = viewport();
  const width = Math.min(Math.max(MIN_WIDTH, rect.width), maxWidth, vw - EDGE_GAP * 2);
  const height = Math.min(Math.max(MIN_HEIGHT, rect.height), maxHeight, vh - EDGE_GAP * 2);
  const x = Math.min(Math.max(EDGE_GAP, rect.x), vw - width - EDGE_GAP);
  const y = Math.min(Math.max(EDGE_GAP, rect.y), vh - height - EDGE_GAP);
  return { x, y, width, height };
}

function defaultRect(): Rect {
  const { width: vw, height: vh } = viewport();
  const width = 420;
  const height = Math.min(600, vh - 120);
  return clampRect({ x: vw - width - 24, y: vh - height - 24, width, height });
}

function maximisedRect(): Rect {
  const { width: vw, height: vh } = viewport();
  const width = Math.min(MAXIMISED_WIDTH, vw - EDGE_GAP * 4);
  const height = vh - EDGE_GAP * 4;
  return { x: (vw - width) / 2, y: EDGE_GAP * 2, width, height };
}

function useIsNarrow(): boolean {
  const [isNarrow, setIsNarrow] = useState(() => typeof window !== "undefined" && window.innerWidth < SHEET_BREAKPOINT);
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < SHEET_BREAKPOINT);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isNarrow;
}

type AssistantWindowProps = {
  assistant: UseAssistantResult;
  state: "open" | "minimised";
  onMinimise: () => void;
  onRestore: () => void;
  onClose: () => void;
};

export function AssistantWindow({ assistant, state, onMinimise, onRestore, onClose }: AssistantWindowProps) {
  const [rect, setRect] = useState<Rect>(defaultRect);
  const [isMaximised, setIsMaximised] = useState(false);
  const [draft, setDraft] = useState("");
  const isNarrow = useIsNarrow();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const gestureRef = useRef<{ kind: "move" | Edge; startX: number; startY: number; start: Rect } | null>(null);

  // Keep the window inside the viewport when the browser is resized.
  useEffect(() => {
    function onResize() {
      setRect((current) => clampRect(current));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (state === "open") inputRef.current?.focus();
  }, [state]);

  useEffect(() => {
    if (state === "open") messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [state, assistant.messages.length, assistant.isSending, assistant.needsConsent]);

  function startGesture(kind: "move" | Edge, event: ReactPointerEvent<HTMLElement>) {
    if (isNarrow || isMaximised || event.button !== 0) return;
    if (kind === "move" && (event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = { kind, startX: event.clientX, startY: event.clientY, start: rect };
  }

  function moveGesture(event: ReactPointerEvent<HTMLElement>) {
    const gesture = gestureRef.current;
    if (!gesture) return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    const { start } = gesture;

    if (gesture.kind === "move") {
      setRect(clampRect({ ...start, x: start.x + dx, y: start.y + dy }));
      return;
    }
    const next = { ...start };
    if (gesture.kind.includes("e")) next.width = start.width + dx;
    if (gesture.kind.includes("s")) next.height = start.height + dy;
    if (gesture.kind.includes("w")) {
      const width = Math.min(Math.max(MIN_WIDTH, start.width - dx), MAX_WIDTH);
      next.x = start.x + (start.width - width);
      next.width = width;
    }
    if (gesture.kind.includes("n")) {
      const height = Math.min(Math.max(MIN_HEIGHT, start.height - dy), MAX_HEIGHT);
      next.y = start.y + (start.height - height);
      next.height = height;
    }
    setRect(clampRect(next));
  }

  function startResize(event: ReactPointerEvent<HTMLElement>) {
    const edge = event.currentTarget.dataset.edge as Edge | undefined;
    if (edge) startGesture(edge, event);
  }

  function endGesture(event: ReactPointerEvent<HTMLElement>) {
    if (!gestureRef.current) return;
    gestureRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleSend() {
    if (!draft.trim()) return;
    assistant.sendMessage(draft);
    setDraft("");
  }

  const iconButton =
    "flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

  if (state === "minimised") {
    return (
      <div
        role="dialog"
        aria-label="Ask ReadEase (minimised)"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-1 rounded-full border border-border bg-surface py-1.5 pl-4 pr-1.5 shadow-lg"
      >
        <button type="button" onClick={onRestore} className="flex items-center gap-2 text-sm font-medium text-foreground focus-visible:outline-none">
          <Sparkles className="h-4 w-4 text-accent" />
          Ask ReadEase
          {assistant.isSending && <span className="text-xs text-muted">· replying…</span>}
        </button>
        <button type="button" onClick={onRestore} aria-label="Restore chat" className={iconButton}>
          <Maximize2 className="h-4 w-4" />
        </button>
        <button type="button" onClick={onClose} aria-label="Close chat" className={iconButton}>
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const shown = isMaximised ? maximisedRect() : rect;
  const style = isNarrow ? undefined : { left: shown.x, top: shown.y, width: shown.width, height: shown.height };
  const edges: { edge: Edge; className: string }[] = [
    { edge: "n", className: "inset-x-3 top-0 h-1.5 cursor-ns-resize" },
    { edge: "s", className: "inset-x-3 bottom-0 h-1.5 cursor-ns-resize" },
    { edge: "e", className: "inset-y-3 right-0 w-1.5 cursor-ew-resize" },
    { edge: "w", className: "inset-y-3 left-0 w-1.5 cursor-ew-resize" },
    { edge: "ne", className: "right-0 top-0 h-3 w-3 cursor-nesw-resize" },
    { edge: "nw", className: "left-0 top-0 h-3 w-3 cursor-nwse-resize" },
    { edge: "se", className: "bottom-0 right-0 h-3 w-3 cursor-nwse-resize" },
    { edge: "sw", className: "bottom-0 left-0 h-3 w-3 cursor-nesw-resize" },
  ];

  return (
    <div
      role="dialog"
      aria-label="Ask ReadEase"
      className={`fixed z-50 flex flex-col overflow-hidden border border-border bg-surface shadow-2xl ${
        isNarrow ? "inset-x-2 bottom-2 h-[78dvh] rounded-2xl" : "rounded-2xl"
      }`}
      style={style}
    >
      {/* Header — drag handle */}
      <div
        onPointerDown={(event) => startGesture("move", event)}
        onPointerMove={moveGesture}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onDoubleClick={(event) => {
          if (!isNarrow && !(event.target as HTMLElement).closest("button")) setIsMaximised((value) => !value);
        }}
        className={`flex shrink-0 select-none items-center gap-2 border-b border-border px-4 py-3 ${
          isNarrow || isMaximised ? "" : "cursor-grab active:cursor-grabbing"
        }`}
      >
        <Sparkles className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-foreground">Ask ReadEase</p>
          <p className="truncate text-xs text-muted">
            {assistant.hasDocument ? (
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3 w-3" /> Can refer to “{assistant.documentTitle}” when you ask about it
              </span>
            ) : (
              "General questions — open a document to ask about it"
            )}
          </p>
        </div>
        <button type="button" onClick={onMinimise} aria-label="Minimise chat" title="Minimise" className={iconButton}>
          <Minus className="h-4 w-4" />
        </button>
        {!isNarrow && (
          <button
            type="button"
            onClick={() => setIsMaximised((value) => !value)}
            aria-label={isMaximised ? "Restore chat size" : "Maximise chat"}
            title={isMaximised ? "Restore" : "Maximise"}
            className={iconButton}
          >
            {isMaximised ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        )}
        <button type="button" onClick={onClose} aria-label="Close chat" title="Close" className={iconButton}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {assistant.messages.length === 0 && !assistant.needsConsent ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-muted">
              Ask me anything, or ask about your document — I&apos;ll explain things in plain language.
            </p>
            <SuggestedPrompts hasDocument={assistant.hasDocument} onSelect={(prompt) => assistant.sendMessage(prompt)} disabled={assistant.isSending} />
          </div>
        ) : (
          <MessageList messages={assistant.messages} isSending={assistant.isSending} />
        )}

        {assistant.needsConsent && (
          <div className="mt-4 rounded-xl border border-accent/30 bg-accent-soft/60 p-4" role="alertdialog" aria-label="Allow document sharing">
            <p className="text-sm leading-relaxed text-foreground">
              This question is about your document. To answer it, ReadEase will send an excerpt of “{assistant.documentTitle}”
              (and any text you&apos;ve selected) with your question to Google Gemini. Nothing is sent until you choose.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="md" onClick={assistant.confirmConsent}>
                Allow and send
              </Button>
              <Button variant="secondary" size="md" onClick={assistant.declineConsent}>
                Send without document
              </Button>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t border-border p-3">
        {assistant.messages.length > 0 && (
          <div className="mb-2 flex items-center justify-between gap-2">
            <SuggestedPrompts compact hasDocument={assistant.hasDocument} onSelect={(prompt) => assistant.sendMessage(prompt)} disabled={assistant.isSending || assistant.needsConsent} />
            <button
              type="button"
              onClick={assistant.clearConversation}
              disabled={assistant.isSending}
              className="shrink-0 text-xs text-muted transition-colors hover:text-accent disabled:pointer-events-none disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        )}
        <MessageInput
          ref={inputRef}
          value={draft}
          onValueChange={setDraft}
          onSend={handleSend}
          disabled={assistant.isSending || assistant.needsConsent}
        />
      </div>

      {!isNarrow &&
        !isMaximised &&
        edges.map(({ edge, className }) => (
          <div
            key={edge}
            data-edge={edge}
            aria-hidden="true"
            onPointerDown={startResize}
            onPointerMove={moveGesture}
            onPointerUp={endGesture}
            onPointerCancel={endGesture}
            className={`absolute z-10 touch-none ${className}`}
          />
        ))}
    </div>
  );
}
