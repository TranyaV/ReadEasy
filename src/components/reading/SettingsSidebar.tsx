import { useEffect, useRef, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { BACKGROUND_PRESETS, FONT_OPTIONS, type ReadingSettings } from "./settings";

type SettingsSidebarProps = {
  settings: ReadingSettings;
  onChange: (next: Partial<ReadingSettings>) => void;
};

function SettingGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-foreground/50">{label}</p>
      {children}
    </div>
  );
}

type SpacingControlProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
};

/**
 * Label + precise numeric px input on top, slider underneath — kept in sync in both
 * directions. The input holds its own "draft" text so a user can freely type a
 * multi-digit or decimal value without it being reformatted/clamped mid-keystroke;
 * it only snaps to the clamped value on blur or Enter. Valid in-range values are
 * still applied immediately as typed, so the document preview updates live.
 */
function SpacingControl({ label, value, min, max, step, onChange }: SpacingControlProps) {
  const [draft, setDraft] = useState(String(value));
  const isFocusedRef = useRef(false);
  const inputId = `spacing-${label.toLowerCase().replace(/\s+/g, "-")}`;

  useEffect(() => {
    if (!isFocusedRef.current) {
      setDraft(String(value));
    }
  }, [value]);

  function commit(raw: string) {
    const trimmed = raw.trim();
    const parsed = Number(trimmed);
    const clamped = trimmed !== "" && Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : value;
    setDraft(String(clamped));
    onChange(clamped);
  }

  function handleTextChange(raw: string) {
    setDraft(raw);
    const trimmed = raw.trim();
    const parsed = Number(trimmed);
    if (trimmed !== "" && Number.isFinite(parsed)) {
      onChange(Math.min(max, Math.max(min, parsed)));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={inputId} className="text-xs font-medium uppercase tracking-[0.14em] text-foreground/50">
          {label}
        </label>
        <div className="flex items-center gap-1.5">
          <input
            id={inputId}
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={draft}
            onFocus={() => {
              isFocusedRef.current = true;
            }}
            onChange={(event) => handleTextChange(event.target.value)}
            onBlur={(event) => {
              isFocusedRef.current = false;
              commit(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit(event.currentTarget.value);
            }}
            aria-label={`${label} in pixels`}
            className="w-16 rounded-md border border-border bg-white/70 px-2 py-1 text-right text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40"
          />
          <span className="text-xs text-foreground/50">px</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={`${label}, currently ${value}px`}
        className="w-full accent-forest"
      />
    </div>
  );
}

export function SettingsSidebar({ settings, onChange }: SettingsSidebarProps) {
  return (
    <Card as="aside" className="flex flex-col gap-8 p-6">
      <SettingGroup label="Font">
        <div className="flex flex-wrap gap-2">
          {FONT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ font: option.value })}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${option.className} ${
                settings.font === option.value
                  ? "border-forest bg-forest text-background"
                  : "border-border text-foreground/70 hover:border-forest/50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </SettingGroup>

      <SettingGroup label={`Font size · ${settings.fontSize}px`}>
        <input
          type="range"
          min={15}
          max={30}
          step={1}
          value={settings.fontSize}
          onChange={(event) => onChange({ fontSize: Number(event.target.value) })}
          className="w-full accent-forest"
        />
      </SettingGroup>

      <SpacingControl
        label="Letter spacing"
        value={settings.letterSpacing}
        min={0}
        max={8}
        step={0.1}
        onChange={(value) => onChange({ letterSpacing: value })}
      />

      <SpacingControl
        label="Word spacing"
        value={settings.wordSpacing}
        min={0}
        max={20}
        step={0.5}
        onChange={(value) => onChange({ wordSpacing: value })}
      />

      <SpacingControl
        label="Line spacing"
        value={settings.lineSpacing}
        min={16}
        max={60}
        step={1}
        onChange={(value) => onChange({ lineSpacing: value })}
      />

      <SpacingControl
        label="Paragraph spacing"
        value={settings.paragraphSpacing}
        min={0}
        max={64}
        step={1}
        onChange={(value) => onChange({ paragraphSpacing: value })}
      />

      <SettingGroup label="Background">
        <div className="flex gap-3">
          {BACKGROUND_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange({ background: preset.value })}
              aria-label={preset.label}
              aria-pressed={settings.background === preset.value}
              title={preset.label}
              className={`h-9 w-9 rounded-full border-2 transition-transform ${
                settings.background === preset.value ? "scale-110 border-forest" : "border-border"
              }`}
              style={{ backgroundColor: preset.swatch }}
            />
          ))}
        </div>
      </SettingGroup>

      <SettingGroup label="Reading ruler">
        <button
          type="button"
          onClick={() => onChange({ rulerEnabled: !settings.rulerEnabled })}
          aria-pressed={settings.rulerEnabled}
          className={`relative h-7 w-12 rounded-full transition-colors ${
            settings.rulerEnabled ? "bg-forest" : "bg-border"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-background transition-transform ${
              settings.rulerEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </SettingGroup>
    </Card>
  );
}
