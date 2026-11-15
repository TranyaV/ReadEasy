"use client";

import { useId, useState, type ReactNode } from "react";
import { AudioLines, Monitor, Type, X } from "lucide-react";
import { ContrastControl, ControlRow, FontSelect, RulerControls, TextLayoutControls, ThemeSwatches, Toggle } from "./controls";
import type { ReadingSettings } from "./settings";

type Tab = "text" | "display" | "listen";

const TABS: { id: Tab; label: string; icon: typeof Type }[] = [
  { id: "text", label: "Text", icon: Type },
  { id: "display", label: "Display", icon: Monitor },
  { id: "listen", label: "Listen", icon: AudioLines },
];

type ReadingPanelProps = {
  settings: ReadingSettings;
  onChange: (next: Partial<ReadingSettings>) => void;
  focusMode: boolean;
  onFocusModeChange: (value: boolean) => void;
  /** The audio reader (voice, speed, playback). */
  audio: ReactNode;
  onSaveAsDefault: () => void;
  defaultSaveState: "idle" | "saved" | "failed";
  onClose: () => void;
};

/** Right-hand Reading & Accessibility panel: personalisation only — no editing controls. */
export function ReadingPanel({
  settings,
  onChange,
  focusMode,
  onFocusModeChange,
  audio,
  onSaveAsDefault,
  defaultSaveState,
  onClose,
}: ReadingPanelProps) {
  const [tab, setTab] = useState<Tab>("text");
  const baseId = useId();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-5">
        <h2 className="text-lg font-semibold text-foreground">Reading &amp; Accessibility</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close reading panel"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div role="tablist" aria-label="Reading settings" className="flex border-b border-border px-3">
        {TABS.map(({ id, label, icon: Icon }) => {
          const selected = tab === id;
          return (
            <button
              key={id}
              id={`${baseId}-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${id}`}
              onClick={() => setTab(id)}
              className={`flex flex-1 flex-col items-center gap-1 border-b-2 px-2 pb-2 pt-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                selected ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      <div
        id={`${baseId}-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${tab}`}
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5"
      >
        {tab === "text" && (
          <>
            <FontSelect value={settings.font} onChange={(font) => onChange({ font })} />
            <TextLayoutControls settings={settings} onChange={onChange} />
          </>
        )}

        {tab === "display" && (
          <>
            <ControlRow label="Page colour">
              <ThemeSwatches value={settings.background} onChange={(background) => onChange({ background })} />
            </ControlRow>
            <ContrastControl value={settings.contrast} onChange={(contrast) => onChange({ contrast })} />
            <div className="h-px bg-border" />
            <RulerControls enabled={settings.rulerEnabled} style={settings.rulerStyle} onChange={(next) => onChange(next)} />
            <Toggle label="Focus mode" description="Hide navigation and panels" checked={focusMode} onChange={onFocusModeChange} />
          </>
        )}

        {tab === "listen" && audio}
      </div>

      {tab !== "listen" && (
        <div className="border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onSaveAsDefault}
            className="text-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            Save these settings to my Reading Profile
          </button>
          <p className="mt-0.5 min-h-4 text-xs text-muted" aria-live="polite">
            {defaultSaveState === "saved" && "Saved — new documents will open with these settings."}
            {defaultSaveState === "failed" && "Couldn't save to this browser."}
            {defaultSaveState === "idle" && "Changes here apply to this document only."}
          </p>
        </div>
      )}
    </div>
  );
}
