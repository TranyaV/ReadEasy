"use client";

import { useState, type ReactNode } from "react";
import { AssistantLauncher } from "./AssistantLauncher";
import { AssistantWindow } from "./AssistantWindow";
import { AssistantContext, AssistantDocumentContext, useAssistantState } from "./useAssistant";

/**
 * App-wide assistant: one conversation that survives page navigation and minimising,
 * one floating window, and the launcher button on every page.
 */
export function AssistantProvider({ children }: { children: ReactNode }) {
  const { assistant, registry } = useAssistantState();
  const [windowState, setWindowState] = useState<"closed" | "open" | "minimised">("closed");

  return (
    <AssistantDocumentContext.Provider value={registry}>
      <AssistantContext.Provider value={assistant}>
        {children}
        {windowState === "closed" ? (
          <AssistantLauncher onClick={() => setWindowState("open")} />
        ) : (
          <AssistantWindow
            assistant={assistant}
            state={windowState}
            onMinimise={() => setWindowState("minimised")}
            onRestore={() => setWindowState("open")}
            onClose={() => setWindowState("closed")}
          />
        )}
      </AssistantContext.Provider>
    </AssistantDocumentContext.Provider>
  );
}
