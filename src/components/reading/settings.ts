export type FontOption = "sans" | "serif" | "accessible";
export type BackgroundPreset = "ivory" | "sage" | "soft-white" | "charcoal";

export type ReadingSettings = {
  font: FontOption;
  fontSize: number;
  /** All four spacing settings below are stored and applied in pixels, exclusively. */
  letterSpacing: number;
  wordSpacing: number;
  lineSpacing: number;
  paragraphSpacing: number;
  background: BackgroundPreset;
  rulerEnabled: boolean;
};

export const DEFAULT_SETTINGS: ReadingSettings = {
  font: "serif",
  fontSize: 19,
  letterSpacing: 0.2,
  wordSpacing: 0,
  lineSpacing: 32,
  paragraphSpacing: 24,
  background: "ivory",
  rulerEnabled: false,
};

export const FONT_OPTIONS: { value: FontOption; label: string; className: string }[] = [
  { value: "sans", label: "Sans", className: "font-sans" },
  { value: "serif", label: "Serif", className: "font-serif" },
  { value: "accessible", label: "Accessible", className: "font-accessible" },
];

export const BACKGROUND_PRESETS: {
  value: BackgroundPreset;
  label: string;
  swatch: string;
  textClass: string;
}[] = [
  { value: "ivory", label: "Ivory", swatch: "#FAF6EC", textClass: "text-foreground" },
  { value: "sage", label: "Sage", swatch: "#E6E9DD", textClass: "text-foreground" },
  { value: "soft-white", label: "Soft white", swatch: "#FFFFFF", textClass: "text-foreground" },
  { value: "charcoal", label: "Charcoal", swatch: "#2A2924", textClass: "text-background" },
];
