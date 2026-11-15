"use client";

import { Send } from "lucide-react";

type MessageInputProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
};

export function MessageInput({ value, onValueChange, onSend, disabled }: MessageInputProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSend();
      }}
      className="flex items-end gap-2"
    >
      <textarea
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSend();
          }
        }}
        rows={1}
        placeholder="Ask ReadEase AI…"
        aria-label="Message"
        disabled={disabled}
        className="min-h-[2.5rem] max-h-32 flex-1 resize-none rounded-xl border border-border bg-white/70 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 disabled:opacity-60"
      />
      <button
        type="submit"
        aria-label="Send message"
        disabled={disabled || !value.trim()}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest text-background transition-transform hover:scale-105 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}
