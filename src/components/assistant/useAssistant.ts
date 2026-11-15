"use client";

import { useRef, useState } from "react";
import { buildDocumentContext } from "@/lib/assistant/buildDocumentContext";
import { grantDocumentConsent, hasDocumentConsent } from "@/lib/assistant/consent";
import { requestAssistantReply } from "@/lib/assistant/providerClient";
import type { AssistantMode, ChatRole } from "@/lib/assistant/types";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  /** Set only on assistant messages that aren't a normal reply. */
  kind?: "not_configured" | "error";
};

type UseAssistantOptions = {
  /** Reads the live document DOM — never the debounced sessionStorage snapshot. */
  getDocumentText: () => string;
  getSelectionText: () => string;
  documentTitle: string;
};

export type UseAssistantResult = {
  mode: AssistantMode;
  setMode: (mode: AssistantMode) => void;
  messages: ChatMessage[];
  isSending: boolean;
  needsConsent: boolean;
  confirmConsent: () => void;
  cancelConsent: () => void;
  sendMessage: (content: string) => void;
  clearConversation: () => void;
};

let messageCounter = 0;
function createMessageId(): string {
  messageCounter += 1;
  return `assistant-msg-${messageCounter}`;
}

export function useAssistant({
  getDocumentText,
  getSelectionText,
  documentTitle,
}: UseAssistantOptions): UseAssistantResult {
  const [mode, setModeState] = useState<AssistantMode>("general");
  // Kept as two separate threads, not one tagged list — this is what actually
  // guarantees document context can never leak into a general-mode request: a
  // general-mode send only ever reads generalMessages, never documentMessages.
  const [documentMessages, setDocumentMessages] = useState<ChatMessage[]>([]);
  const [generalMessages, setGeneralMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [needsConsent, setNeedsConsent] = useState(false);
  const pendingMessageRef = useRef<string | null>(null);

  const messages = mode === "document" ? documentMessages : generalMessages;

  function appendMessage(targetMode: AssistantMode, message: ChatMessage) {
    const setter = targetMode === "document" ? setDocumentMessages : setGeneralMessages;
    setter((previous) => [...previous, message]);
  }

  async function performSend(targetMode: AssistantMode, content: string) {
    const userMessage: ChatMessage = { id: createMessageId(), role: "user", content };
    const priorTurns = targetMode === "document" ? documentMessages : generalMessages;
    appendMessage(targetMode, userMessage);
    setIsSending(true);

    const turns = [...priorTurns, userMessage].map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const documentContext =
      targetMode === "document"
        ? buildDocumentContext(getDocumentText(), documentTitle, getSelectionText())
        : undefined;

    const result = await requestAssistantReply({ mode: targetMode, turns, documentContext });
    setIsSending(false);

    if (result.status === "ok") {
      appendMessage(targetMode, { id: createMessageId(), role: "assistant", content: result.reply });
    } else {
      appendMessage(targetMode, {
        id: createMessageId(),
        role: "assistant",
        content: result.message,
        kind: result.status,
      });
    }
  }

  function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    // Document content is never read or sent until consent is explicitly granted —
    // buildDocumentContext() is only ever called from inside performSend, which this
    // guard prevents reaching until confirmConsent() lets it through.
    if (mode === "document" && !hasDocumentConsent()) {
      pendingMessageRef.current = trimmed;
      setNeedsConsent(true);
      return;
    }

    void performSend(mode, trimmed);
  }

  function confirmConsent() {
    grantDocumentConsent();
    setNeedsConsent(false);
    const pending = pendingMessageRef.current;
    pendingMessageRef.current = null;
    if (pending) {
      void performSend("document", pending);
    }
  }

  function cancelConsent() {
    pendingMessageRef.current = null;
    setNeedsConsent(false);
  }

  function setMode(nextMode: AssistantMode) {
    setNeedsConsent(false);
    pendingMessageRef.current = null;
    setModeState(nextMode);
  }

  function clearConversation() {
    if (mode === "document") {
      setDocumentMessages([]);
    } else {
      setGeneralMessages([]);
    }
  }

  return {
    mode,
    setMode,
    messages,
    isSending,
    needsConsent,
    confirmConsent,
    cancelConsent,
    sendMessage,
    clearConversation,
  };
}
