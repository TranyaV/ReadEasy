"use client";

import { Sparkles } from "lucide-react";

type AssistantLauncherProps = {
  onClick: () => void;
};

/** The small round Ask ReadEase button. Sits bottom-right, clear of the docked reading panel. */
export function AssistantLauncher({ onClick }: AssistantLauncherProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ask ReadEase"
      title="Ask ReadEase"
      style={{ right: "var(--assistant-launcher-right, 1.5rem)" }}
      className="fixed bottom-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-on-accent shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2"
    >
      <Sparkles className="h-6 w-6" />
    </button>
  );
}
