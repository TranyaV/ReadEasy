"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AssistantModeToggle } from "./AssistantModeToggle";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";
import { SuggestedPrompts } from "./SuggestedPrompts";
import type { UseAssistantResult } from "./useAssistant";

type AssistantPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  assistant: UseAssistantResult;
};

export function AssistantPanel({ isOpen, onClose, assistant }: AssistantPanelProps) {
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ block: "end" });
    }
  }, [isOpen, assistant.messages.length, assistant.isSending]);

  function handleSend() {
    if (!draft.trim()) return;
    assistant.sendMessage(draft);
    setDraft("");
  }

  function handleCancelConsent() {
    assistant.cancelConsent();
    assistant.setMode("general");
  }

  return (
    <div
      aria-hidden={!isOpen}
      className={`fixed inset-y-0 left-0 z-50 flex w-full flex-col border-r border-border bg-background shadow-2xl transition-transform duration-300 ease-out sm:w-[420px] ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest text-background">
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="font-serif text-lg text-foreground">ReadEase AI</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close assistant"
          className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/60 transition-colors hover:bg-sage-soft/60 hover:text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-border px-5 py-3">
        <AssistantModeToggle mode={assistant.mode} onChange={assistant.setMode} />
      </div>

      {assistant.needsConsent && (
        <div className="border-b border-border bg-sage-soft/50 px-5 py-4">
          <p className="text-sm leading-relaxed text-foreground">
            Document mode sends an excerpt of your document — and your question — to an external
            AI provider to generate an answer. Nothing is sent until you confirm.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button size="md" onClick={assistant.confirmConsent}>
              Continue
            </Button>
            <Button variant="ghost" size="md" onClick={handleCancelConsent}>
              Stay in General mode
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {assistant.messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-foreground/50">
            <Sparkles className="h-5 w-5 text-forest/50" />
            <p>
              {assistant.mode === "document"
                ? "Ask about this document — summaries, explanations, vocabulary, or a quiz."
                : "Ask anything — this mode doesn't use your document."}
            </p>
          </div>
        ) : (
          <MessageList messages={assistant.messages} isSending={assistant.isSending} />
        )}
        <div ref={messagesEndRef} />
      </div>

      <SuggestedPrompts mode={assistant.mode} onSelect={setDraft} />

      <div className="border-t border-border p-4">
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={assistant.clearConversation}
            disabled={assistant.messages.length === 0}
            className="text-xs text-foreground/50 transition-colors hover:text-forest disabled:pointer-events-none disabled:opacity-40"
          >
            Clear conversation
          </button>
        </div>
        <MessageInput value={draft} onValueChange={setDraft} onSend={handleSend} disabled={assistant.isSending} />
      </div>
    </div>
  );
}
