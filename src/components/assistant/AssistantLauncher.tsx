"use client";

import { Sparkles } from "lucide-react";

type AssistantLauncherProps = {
  onClick: () => void;
};

export function AssistantLauncher({ onClick }: AssistantLauncherProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open ReadEase AI"
      className="fixed bottom-6 left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-forest text-background shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:ring-offset-2"
    >
      <Sparkles className="h-6 w-6" />
    </button>
  );
}
