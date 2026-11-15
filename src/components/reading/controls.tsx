"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, Minus, Plus } from "lucide-react";
import {
  BACKGROUND_PRESETS,
  CONTRAST_OPTIONS,
  FONT_OPTIONS,
  RULER_STYLE_OPTIONS,
  SPACING_LIMITS,
  type BackgroundPreset,
  type ContrastOption,
  type FontOption,
  type ReadingSettings,
  type RulerStyle,
} from "./settings";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";
export const controlLabel = "text-sm font-medium text-foreground";

export function ControlRow({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        {htmlFor ? (
          <label htmlFor={htmlFor} className={controlLabel}>
            {label}
          </label>
        ) : (
          <span className={controlLabel}>{label}</span>
        )}
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function FontSelect({ value, onChange }: { value: FontOption; onChange: (value: FontOption) => void }) {
  const id = useId();
  return (
    <ControlRow label="Font" htmlFor={id}>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as FontOption)}
        className={`h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground ${focusRing}`}
      >
        {FONT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
            {option.note ? ` — ${option.note}` : ""}
          </option>
        ))}
      </select>
    </ControlRow>
  );
}

/** − [18 px] + stepper for the base text size. */
export function TextSizeStepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const { min, max } = SPACING_LIMITS.fontSize;
  const button = `flex h-10 w-10 items-center justify-center text-foreground/70 hover:bg-subtle disabled:opacity-40 ${focusRing}`;
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={controlLabel} id="text-size-label">
        Text size
      </span>
      <div className="flex items-center overflow-hidden rounded-xl border border-border bg-surface" role="group" aria-labelledby="text-size-label">
        <button type="button" className={button} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Decrease text size">
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-16 border-x border-border text-center text-sm tabular-nums text-foreground" aria-live="polite">
          {value} px
        </span>
        <button type="button" className={button} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Increase text size">
          <Plus className="h-4 w-4" />
        </button>
      </div>
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
export function SpacingControl({ label, value, min, max, step, onChange }: SpacingControlProps) {
  const [draft, setDraft] = useState(String(value));
  const isFocusedRef = useRef(false);
  const inputId = useId();

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
        <label htmlFor={inputId} className={controlLabel}>
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
            className={`w-16 rounded-lg border border-border bg-surface px-2 py-1 text-right text-sm tabular-nums text-foreground ${focusRing}`}
          />
          <span className="text-xs text-muted">px</span>
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
        className="w-full accent-accent"
      />
    </div>
  );
}

/** Text-size stepper plus the four pixel spacing controls. */
export function TextLayoutControls({
  settings,
  onChange,
}: {
  settings: ReadingSettings;
  onChange: (next: Partial<ReadingSettings>) => void;
}) {
  return (
    <>
      <TextSizeStepper value={settings.fontSize} onChange={(fontSize) => onChange({ fontSize })} />
      <SpacingControl label="Line spacing" value={settings.lineSpacing} {...SPACING_LIMITS.lineSpacing} onChange={(lineSpacing) => onChange({ lineSpacing })} />
      <SpacingControl
        label="Letter spacing"
        value={settings.letterSpacing}
        {...SPACING_LIMITS.letterSpacing}
        onChange={(letterSpacing) => onChange({ letterSpacing })}
      />
      <SpacingControl label="Word spacing" value={settings.wordSpacing} {...SPACING_LIMITS.wordSpacing} onChange={(wordSpacing) => onChange({ wordSpacing })} />
      <SpacingControl
        label="Paragraph spacing"
        value={settings.paragraphSpacing}
        {...SPACING_LIMITS.paragraphSpacing}
        onChange={(paragraphSpacing) => onChange({ paragraphSpacing })}
      />
    </>
  );
}

export function ThemeSwatches({ value, onChange, withLabels = false }: { value: BackgroundPreset; onChange: (value: BackgroundPreset) => void; withLabels?: boolean }) {
  return (
    <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Page colour">
      {BACKGROUND_PRESETS.map((preset) => {
        const selected = value === preset.value;
        return (
          <button
            key={preset.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(preset.value)}
            title={preset.label}
            className={`flex items-center justify-center gap-2 border-2 text-sm transition-all ${focusRing} ${
              withLabels ? "h-10 min-w-[4.5rem] rounded-xl px-3" : "h-10 w-10 rounded-full"
            } ${selected ? "border-accent shadow-sm" : "border-border hover:border-accent/50"}`}
            style={{ backgroundColor: preset.swatch, color: preset.dark ? "#F3F5F8" : "#1C2230" }}
          >
            {selected && !withLabels && <Check className="h-4 w-4" aria-hidden="true" />}
            {withLabels ? preset.label : <span className="sr-only">{preset.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col overflow-hidden rounded-xl border border-border bg-surface">
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`px-2 py-2 text-sm transition-colors ${focusRing} ${index > 0 ? "border-l border-border" : ""} ${
              selected ? "bg-accent-soft font-medium text-accent" : "text-foreground/80 hover:bg-subtle"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function ContrastControl({ value, onChange }: { value: ContrastOption; onChange: (value: ContrastOption) => void }) {
  return (
    <ControlRow label="Text contrast">
      <Segmented label="Text contrast" options={CONTRAST_OPTIONS} value={value} onChange={onChange} />
    </ControlRow>
  );
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className={controlLabel}>
          {label}
        </label>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${focusRing} ${checked ? "bg-accent" : "bg-border"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}

export function RulerControls({
  enabled,
  style,
  onChange,
}: {
  enabled: boolean;
  style: RulerStyle;
  onChange: (next: { rulerEnabled?: boolean; rulerStyle?: RulerStyle }) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-3">
      <Toggle
        label="Reading ruler"
        description="Follows your pointer, or the cursor when typing"
        checked={enabled}
        onChange={(rulerEnabled) => onChange({ rulerEnabled })}
      />
      {enabled && (
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={id} className="text-sm text-muted">
            Ruler style
          </label>
          <select
            id={id}
            value={style}
            onChange={(event) => onChange({ rulerStyle: event.target.value as RulerStyle })}
            className={`h-9 rounded-lg border border-border bg-surface px-2 text-sm text-foreground ${focusRing}`}
          >
            {RULER_STYLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
