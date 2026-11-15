"use client";

import { FileText, Loader2 } from "lucide-react";
import { SimpleMarkdown } from "./SimpleMarkdown";
import type { ChatMessage } from "./useAssistant";

type MessageListProps = {
  messages: ChatMessage[];
  isSending: boolean;
};

export function MessageList({ messages, isSending }: MessageListProps) {
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isSending && (
        <div className="flex items-center gap-2 text-sm text-muted">
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
    ? "ml-auto bg-accent-soft text-foreground"
    : message.kind === "error"
      ? "border border-error/30 bg-error/10 text-foreground"
      : message.kind === "not_configured"
        ? "border border-border bg-subtle text-foreground/80"
        : "border border-border bg-subtle/60 text-foreground";

  return (
    <div className={`flex max-w-[88%] flex-col gap-1 ${isUser ? "ml-auto items-end" : ""}`}>
      <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${toneClass} ${isUser || message.kind ? "whitespace-pre-wrap" : ""}`}>
        {isUser || message.kind ? message.content : <SimpleMarkdown text={message.content} />}
      </div>
      {isUser && message.usedDocument && (
        <span className="inline-flex items-center gap-1 text-[11px] text-muted">
          <FileText className="h-3 w-3" /> Sent with a document excerpt
        </span>
      )}
    </div>
  );
}
