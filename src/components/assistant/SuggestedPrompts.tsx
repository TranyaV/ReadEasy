"use client";

import type { AssistantMode } from "@/lib/assistant/types";

type SuggestedPromptsProps = {
  mode: AssistantMode;
  onSelect: (prompt: string) => void;
};

const PROMPTS: Record<AssistantMode, string[]> = {
  document: ["Summarise this document", "Explain this in simpler terms", "Quiz me on this document"],
  general: ["What can you help me with?", "Explain a concept to me", "Help me brainstorm an idea"],
};

export function SuggestedPrompts({ mode, onSelect }: SuggestedPromptsProps) {
  return (
    <div className="flex flex-wrap gap-2 border-t border-border px-5 py-3">
      {PROMPTS[mode].map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => onSelect(prompt)}
          className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground/70 transition-colors hover:border-forest hover:text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
