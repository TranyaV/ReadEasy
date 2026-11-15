"use client";

import { BookOpenText, Layers, ListChecks, MessageCircleQuestion, Type } from "lucide-react";

type SuggestedPromptsProps = {
  hasDocument: boolean;
  onSelect: (prompt: string) => void;
  disabled?: boolean;
  /** One-line chip row under an ongoing conversation. */
  compact?: boolean;
};

const DOCUMENT_PROMPTS = [
  { icon: BookOpenText, label: "Explain this paragraph", prompt: "Explain this paragraph in a simpler way." },
  { icon: Type, label: "Simplify this text", prompt: "Simplify this text so it is easier to read." },
  { icon: Layers, label: "Summarise this page", prompt: "Summarise this document in a few short points." },
  { icon: ListChecks, label: "Explain difficult words", prompt: "Explain the difficult words in this text." },
];

const GENERAL_PROMPTS = [
  { icon: MessageCircleQuestion, label: "What can you help with?", prompt: "What can you help me with?" },
  { icon: Type, label: "Tips for reading", prompt: "Give me some tips to make reading long texts easier." },
  { icon: BookOpenText, label: "Explain a concept", prompt: "Explain photosynthesis in simple terms." },
];

export function SuggestedPrompts({ hasDocument, onSelect, disabled = false, compact = false }: SuggestedPromptsProps) {
  const prompts = hasDocument ? DOCUMENT_PROMPTS : GENERAL_PROMPTS;

  if (compact) {
    return (
      <div className="flex min-w-0 gap-1.5 overflow-x-auto">
        {prompts.slice(0, 3).map(({ label, prompt }) => (
          <button
            key={label}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(prompt)}
            className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs text-foreground/75 hover:border-accent/50 hover:text-accent disabled:opacity-40"
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {prompts.map(({ icon: Icon, label, prompt }) => (
        <li key={label}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelect(prompt)}
            className="flex w-full items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:border-accent/50 hover:bg-accent-soft/50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            {label}
          </button>
        </li>
      ))}
    </ul>
  );
}
