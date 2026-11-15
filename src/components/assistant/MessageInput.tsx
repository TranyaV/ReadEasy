"use client";

import type { Ref } from "react";
import { Send } from "lucide-react";

type MessageInputProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  ref?: Ref<HTMLTextAreaElement>;
};

export function MessageInput({ value, onValueChange, onSend, disabled, ref }: MessageInputProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSend();
      }}
      className="flex items-end gap-2"
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSend();
          }
        }}
        rows={1}
        maxLength={4000}
        placeholder="Ask a question…"
        aria-label="Message"
        disabled={disabled}
        className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-60"
      />
      <button
        type="submit"
        aria-label="Send message"
        disabled={disabled || !value.trim()}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-on-accent transition-colors hover:bg-accent-strong disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}
