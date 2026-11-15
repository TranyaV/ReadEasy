"use client";

import { Loader2 } from "lucide-react";
import type { ChatMessage } from "./useAssistant";

type MessageListProps = {
  messages: ChatMessage[];
  isSending: boolean;
};

export function MessageList({ messages, isSending }: MessageListProps) {
  return (
    <div className="flex flex-col gap-3">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isSending && (
        <div className="flex items-center gap-2 text-sm text-foreground/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Thinking…
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const toneClass = isUser
    ? "ml-auto bg-forest text-background"
    : message.kind === "error"
      ? "border border-error/30 bg-error/10 text-foreground"
      : message.kind === "not_configured"
        ? "border border-border bg-sage-soft/60 text-foreground/80"
        : "border border-border bg-sage-soft/40 text-foreground";

  return (
    <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${toneClass}`}>
      {message.content}
    </div>
  );
}
