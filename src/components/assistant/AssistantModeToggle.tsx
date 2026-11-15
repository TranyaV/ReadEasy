"use client";

import type { AssistantMode } from "@/lib/assistant/types";

type AssistantModeToggleProps = {
  mode: AssistantMode;
  onChange: (mode: AssistantMode) => void;
};

const OPTIONS: { value: AssistantMode; label: string }[] = [
  { value: "document", label: "Document" },
  { value: "general", label: "General" },
];

export function AssistantModeToggle({ mode, onChange }: AssistantModeToggleProps) {
  return (
    <div role="radiogroup" aria-label="Assistant mode" className="flex rounded-full border border-border bg-white/60 p-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={mode === option.value}
          onClick={() => onChange(option.value)}
          className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === option.value ? "bg-forest text-background" : "text-foreground/60 hover:text-forest"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
