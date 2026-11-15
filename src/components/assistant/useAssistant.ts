"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { buildDocumentContext } from "@/lib/assistant/buildDocumentContext";
import { grantDocumentConsent, hasDocumentConsent } from "@/lib/assistant/consent";
import { mentionsParagraph, needsDocumentContext } from "@/lib/assistant/contextRule";
import { requestAssistantReply } from "@/lib/assistant/providerClient";
import type { ChatRole } from "@/lib/assistant/types";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  /** Set only on assistant messages that aren't a normal reply. */
  kind?: "not_configured" | "error";
  /** On user messages: whether an excerpt of the open document was sent with it. */
  usedDocument?: boolean;
};

/** Registered by the workspace while a document is open. */
export type AssistantDocumentSource = {
  title: string;
  /** Reads the live document DOM — never the debounced sessionStorage snapshot. */
  getDocumentText: () => string;
  /** The user's most recent selection inside the document, or "". */
  getSelectionText: () => string;
  /** The paragraph the text cursor was last in, or "". */
  getCursorParagraph: () => string;
};

export type UseAssistantResult = {
  messages: ChatMessage[];
  isSending: boolean;
  /** True while waiting for the user to allow sending document content. */
  needsConsent: boolean;
  confirmConsent: () => void;
  declineConsent: () => void;
  sendMessage: (content: string) => void;
  clearConversation: () => void;
  hasDocument: boolean;
  documentTitle: string | null;
};

let messageCounter = 0;
function createMessageId(): string {
  messageCounter += 1;
  return `assistant-msg-${messageCounter}`;
}

type DocumentRegistry = {
  register: (source: AssistantDocumentSource) => () => void;
  setTitle: (source: AssistantDocumentSource, title: string) => void;
};

export const AssistantContext = createContext<UseAssistantResult | null>(null);
export const AssistantDocumentContext = createContext<DocumentRegistry | null>(null);

/**
 * One unified conversation for the whole app. Document content is attached only
 * when (a) a document is open, (b) the message needs it — there's a selection or
 * the message refers to the document (see contextRule) — and (c) the user has
 * consented. Otherwise the question is sent on its own, exactly like general mode.
 */
export function useAssistantState(): { assistant: UseAssistantResult; registry: DocumentRegistry } {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [documentTitle, setDocumentTitle] = useState<string | null>(null);
  const pendingMessageRef = useRef<string | null>(null);
  const sourceRef = useRef<AssistantDocumentSource | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const register = useCallback((source: AssistantDocumentSource) => {
    sourceRef.current = source;
    setDocumentTitle(source.title);
    return () => {
      if (sourceRef.current === source) {
        sourceRef.current = null;
        setDocumentTitle(null);
        setNeedsConsent(false);
        pendingMessageRef.current = null;
      }
    };
  }, []);

  const setTitle = useCallback((source: AssistantDocumentSource, title: string) => {
    if (sourceRef.current !== source) return;
    source.title = title;
    setDocumentTitle(title);
  }, []);

  // Stable across renders so document registration only re-runs on mount/unmount.
  const registry = useMemo(() => ({ register, setTitle }), [register, setTitle]);

  async function performSend(content: string, withDocument: boolean) {
    const source = withDocument ? sourceRef.current : null;
    const userMessage: ChatMessage = { id: createMessageId(), role: "user", content, usedDocument: Boolean(source) };
    // Error / not-configured notices are UI status messages, not things the assistant
    // said, so they're never sent back as conversation history.
    const turns = [...messagesRef.current.filter((message) => !message.kind), userMessage].map((message) => ({
      role: message.role,
      content: message.content,
    }));
    setMessages((previous) => [...previous, userMessage]);
    setIsSending(true);

    let documentContext;
    if (source) {
      const selection = source.getSelectionText() || (mentionsParagraph(content) ? source.getCursorParagraph() : "");
      documentContext = buildDocumentContext(source.getDocumentText(), source.title, selection);
    }

    const result = await requestAssistantReply({
      mode: source ? "document" : "general",
      turns,
      documentContext,
    });
    setIsSending(false);

    setMessages((previous) => [
      ...previous,
      result.status === "ok"
        ? { id: createMessageId(), role: "assistant", content: result.reply }
        : { id: createMessageId(), role: "assistant", content: result.message, kind: result.status },
    ]);
  }

  function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isSending || needsConsent) return;

    const source = sourceRef.current;
    const wantsDocument = Boolean(source) && needsDocumentContext(trimmed, Boolean(source?.getSelectionText()));
    if (!wantsDocument) {
      void performSend(trimmed, false);
      return;
    }

    // Document content is never read or sent until consent is explicitly granted.
    if (!hasDocumentConsent()) {
      pendingMessageRef.current = trimmed;
      setNeedsConsent(true);
      return;
    }
    void performSend(trimmed, true);
  }

  function confirmConsent() {
    grantDocumentConsent();
    setNeedsConsent(false);
    const pending = pendingMessageRef.current;
    pendingMessageRef.current = null;
    if (pending) void performSend(pending, true);
  }

  function declineConsent() {
    setNeedsConsent(false);
    const pending = pendingMessageRef.current;
    pendingMessageRef.current = null;
    if (pending) void performSend(pending, false);
  }

  function clearConversation() {
    setMessages([]);
  }

  return {
    assistant: {
      messages,
      isSending,
      needsConsent,
      confirmConsent,
      declineConsent,
      sendMessage,
      clearConversation,
      hasDocument: documentTitle !== null,
      documentTitle,
    },
    registry,
  };
}

export function useAssistant(): UseAssistantResult {
  const context = useContext(AssistantContext);
  if (!context) throw new Error("useAssistant must be used inside <AssistantProvider>.");
  return context;
}

/** Makes the open document available to the assistant while the calling component is mounted. */
export function useRegisterAssistantDocument(source: AssistantDocumentSource) {
  const registry = useContext(AssistantDocumentContext);
  const sourceRef = useRef(source);
  const registeredRef = useRef<AssistantDocumentSource | null>(null);
  useEffect(() => {
    sourceRef.current = source;
  });

  useEffect(() => {
    if (!registry) return;
    // Proxy through the ref so callers can pass fresh closures every render.
    const proxy: AssistantDocumentSource = {
      title: sourceRef.current.title,
      getDocumentText: () => sourceRef.current.getDocumentText(),
      getSelectionText: () => sourceRef.current.getSelectionText(),
      getCursorParagraph: () => sourceRef.current.getCursorParagraph(),
    };
    registeredRef.current = proxy;
    const unregister = registry.register(proxy);
    return () => {
      registeredRef.current = null;
      unregister();
    };
  }, [registry]);

  const title = source.title;
  useEffect(() => {
    if (registry && registeredRef.current) registry.setTitle(registeredRef.current, title);
  }, [registry, title]);
}
