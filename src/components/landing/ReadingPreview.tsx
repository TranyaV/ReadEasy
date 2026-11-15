"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";

const SNIPPET =
  "Good design removes friction so the words can do their work. EyeRead adapts the page to you, not the other way around.";

export function ReadingPreview() {
  const [personalised, setPersonalised] = useState(true);

  return (
    <Card className="p-6 sm:p-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-foreground/50">
          Personalised preview
        </p>
        <div className="flex rounded-full border border-border bg-white/60 p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setPersonalised(false)}
            className={`rounded-full px-3 py-1 transition-colors ${
              !personalised ? "bg-forest text-background" : "text-foreground/60"
            }`}
          >
            Standard
          </button>
          <button
            type="button"
            onClick={() => setPersonalised(true)}
            className={`rounded-full px-3 py-1 transition-colors ${
              personalised ? "bg-forest text-background" : "text-foreground/60"
            }`}
          >
            Personalised
          </button>
        </div>
      </div>
      <p
        className={`transition-all duration-300 ${
          personalised
            ? "font-serif text-xl leading-[1.9] tracking-[0.01em] text-foreground"
            : "font-sans text-base leading-normal text-foreground/80"
        }`}
      >
        {SNIPPET}
      </p>
    </Card>
  );
}
