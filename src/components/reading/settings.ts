import type { CSSProperties } from "react";

export type FontOption = "sans" | "serif" | "accessible" | "lexend";
export type BackgroundPreset = "white" | "cream" | "mint" | "blue" | "dark";
export type ContrastOption = "standard" | "high" | "extra-high";
export type RulerStyle = "line-highlight" | "underline" | "window";

export type ReadingSettings = {
  font: FontOption;
  fontSize: number;
  /** All four spacing settings below are stored and applied in pixels, exclusively. */
  letterSpacing: number;
  wordSpacing: number;
  lineSpacing: number;
  paragraphSpacing: number;
  background: BackgroundPreset;
  contrast: ContrastOption;
  rulerEnabled: boolean;
  rulerStyle: RulerStyle;
  /** Hides navigation and side panels so only the document is shown. */
  focusMode: boolean;
};

export const DEFAULT_SETTINGS: ReadingSettings = {
  font: "serif",
  fontSize: 19,
  letterSpacing: 0.2,
  wordSpacing: 0,
  lineSpacing: 32,
  paragraphSpacing: 24,
  background: "cream",
  contrast: "standard",
  rulerEnabled: false,
  rulerStyle: "line-highlight",
  focusMode: false,
};

export const SPACING_LIMITS = {
  fontSize: { min: 14, max: 36, step: 1 },
  letterSpacing: { min: 0, max: 8, step: 0.1 },
  wordSpacing: { min: 0, max: 20, step: 0.5 },
  lineSpacing: { min: 16, max: 60, step: 1 },
  paragraphSpacing: { min: 0, max: 64, step: 1 },
} as const;

export const FONT_OPTIONS: { value: FontOption; label: string; className: string; note?: string }[] = [
  { value: "lexend", label: "Lexend", className: "font-lexend", note: "Designed to reduce visual stress" },
  { value: "accessible", label: "Atkinson Hyperlegible", className: "font-accessible", note: "Clear, distinct letter shapes" },
  { value: "sans", label: "Geist Sans", className: "font-sans" },
  { value: "serif", label: "Lora (serif)", className: "font-serif" },
];

export const BACKGROUND_PRESETS: {
  value: BackgroundPreset;
  label: string;
  swatch: string;
  dark: boolean;
}[] = [
  { value: "white", label: "White", swatch: "#FFFFFF", dark: false },
  { value: "cream", label: "Cream", swatch: "#FBF5E6", dark: false },
  { value: "mint", label: "Mint", swatch: "#E7F3EA", dark: false },
  { value: "blue", label: "Blue", swatch: "#E5EEFB", dark: false },
  { value: "dark", label: "Dark", swatch: "#1E2129", dark: true },
];

export const CONTRAST_OPTIONS: { value: ContrastOption; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "high", label: "High" },
  { value: "extra-high", label: "Extra high" },
];

export const RULER_STYLE_OPTIONS: { value: RulerStyle; label: string; description: string }[] = [
  { value: "line-highlight", label: "Line highlight", description: "Tints the line you're reading" },
  { value: "underline", label: "Underline ruler", description: "A guide line under the current line" },
  { value: "window", label: "Reading window", description: "Dims the text above and below" },
];

const TEXT_COLOURS: Record<"light" | "dark", Record<ContrastOption, string>> = {
  light: { standard: "#2B3140", high: "#111418", "extra-high": "#000000" },
  dark: { standard: "#D6DAE2", high: "#F3F5F8", "extra-high": "#FFFFFF" },
};

export function getBackgroundPreset(value: BackgroundPreset) {
  return BACKGROUND_PRESETS.find((preset) => preset.value === value) ?? BACKGROUND_PRESETS[1];
}

export function getFontClass(font: FontOption): string {
  return FONT_OPTIONS.find((option) => option.value === font)?.className ?? "font-serif";
}

/** Colours + typography for any surface that shows document text (editor, previews). */
export function readingSurface(settings: ReadingSettings): {
  background: string;
  isDark: boolean;
  fontClass: string;
  textStyle: CSSProperties;
} {
  const preset = getBackgroundPreset(settings.background);
  return {
    background: preset.swatch,
    isDark: preset.dark,
    fontClass: getFontClass(settings.font),
    textStyle: {
      color: TEXT_COLOURS[preset.dark ? "dark" : "light"][settings.contrast],
      fontWeight: settings.contrast === "extra-high" ? 500 : undefined,
      fontSize: `${settings.fontSize}px`,
      letterSpacing: `${settings.letterSpacing}px`,
      wordSpacing: `${settings.wordSpacing}px`,
      lineHeight: `${settings.lineSpacing}px`,
    },
  };
}

const LEGACY_BACKGROUNDS: Record<string, BackgroundPreset> = {
  ivory: "cream",
  sage: "mint",
  "soft-white": "white",
  charcoal: "dark",
};

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === "string" && (options as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Accepts anything read back from storage and returns a complete, valid settings object. */
export function normalizeSettings(raw: unknown, fallback: ReadingSettings = DEFAULT_SETTINGS): ReadingSettings {
  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const background =
    typeof input.background === "string" && input.background in LEGACY_BACKGROUNDS
      ? LEGACY_BACKGROUNDS[input.background]
      : oneOf(input.background, BACKGROUND_PRESETS.map((preset) => preset.value), fallback.background);

  return {
    font: oneOf(input.font, FONT_OPTIONS.map((option) => option.value), fallback.font),
    fontSize: clampNumber(input.fontSize, fallback.fontSize, SPACING_LIMITS.fontSize.min, SPACING_LIMITS.fontSize.max),
    letterSpacing: clampNumber(input.letterSpacing, fallback.letterSpacing, SPACING_LIMITS.letterSpacing.min, SPACING_LIMITS.letterSpacing.max),
    wordSpacing: clampNumber(input.wordSpacing, fallback.wordSpacing, SPACING_LIMITS.wordSpacing.min, SPACING_LIMITS.wordSpacing.max),
    lineSpacing: clampNumber(input.lineSpacing, fallback.lineSpacing, SPACING_LIMITS.lineSpacing.min, SPACING_LIMITS.lineSpacing.max),
    paragraphSpacing: clampNumber(
      input.paragraphSpacing,
      fallback.paragraphSpacing,
      SPACING_LIMITS.paragraphSpacing.min,
      SPACING_LIMITS.paragraphSpacing.max,
    ),
    background,
    contrast: oneOf(input.contrast, CONTRAST_OPTIONS.map((option) => option.value), fallback.contrast),
    rulerEnabled: typeof input.rulerEnabled === "boolean" ? input.rulerEnabled : fallback.rulerEnabled,
    rulerStyle: oneOf(input.rulerStyle, RULER_STYLE_OPTIONS.map((option) => option.value), fallback.rulerStyle),
    focusMode: typeof input.focusMode === "boolean" ? input.focusMode : fallback.focusMode,
  };
}
