export type AssistantMode = "document" | "general";
export type ChatRole = "user" | "assistant";

export type ConversationTurn = {
  role: ChatRole;
  content: string;
};

export type DocumentContext = {
  title: string;
  excerpt: string;
  /** True if the document was too long to include in full — excerpt is a bounded prefix. */
  truncated: boolean;
  /** The user's current text selection within the document, if any, at the moment of sending. */
  selection?: string;
};

export type AssistantRequest = {
  mode: AssistantMode;
  turns: ConversationTurn[];
  /** Present only in document mode. General-mode requests never carry document content. */
  documentContext?: DocumentContext;
};

export type AssistantResult =
  | { status: "ok"; reply: string }
  | { status: "not_configured"; message: string }
  | { status: "error"; message: string };
