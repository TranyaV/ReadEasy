"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Search,
  Underline,
  Undo2,
} from "lucide-react";
import type { ReactNode } from "react";
import type { AlignOption, HeadingOption } from "./formattingTypes";

export type ToolbarState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: AlignOption;
};

export type FormattingToolbarActions = {
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleUnderline: () => void;
  setAlignment: (align: AlignOption) => void;
  setHeading: (heading: HeadingOption) => void;
  setFontFamily: (family: string) => void;
  setFontSize: (size: string) => void;
  insertBulletedList: () => void;
  insertNumberedList: () => void;
  undo: () => void;
  redo: () => void;
};

type FormattingToolbarProps = {
  state: ToolbarState;
  actions: FormattingToolbarActions;
  isFindReplaceOpen: boolean;
  onToggleFindReplace: () => void;
};

const HEADING_OPTIONS: { value: HeadingOption; label: string }[] = [
  { value: "paragraph", label: "Normal text" },
  { value: "heading1", label: "Heading 1" },
  { value: "heading2", label: "Heading 2" },
  { value: "heading3", label: "Heading 3" },
];

const FONT_FAMILY_OPTIONS = [
  { label: "Default", value: "var(--font-serif)" },
  { label: "Sans", value: "var(--font-sans)" },
  { label: "Accessible", value: "var(--font-accessible)" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
];

const FONT_SIZE_OPTIONS = ["12", "14", "16", "18", "20", "24", "28", "32", "40"];

const baseButton =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent text-foreground/70 transition-colors hover:border-border hover:bg-sage-soft/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 disabled:pointer-events-none disabled:opacity-40";
const activeButton = "border-border bg-forest/10 text-forest";

const selectClasses =
  "h-8 shrink-0 rounded-md border border-border bg-white/70 px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40";

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 self-center bg-border" aria-hidden="true" />;
}

function ToolbarButton({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`${baseButton} ${active ? activeButton : ""}`}
    >
      {children}
    </button>
  );
}

export function FormattingToolbar({
  state,
  actions,
  isFindReplaceOpen,
  onToggleFindReplace,
}: FormattingToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      className="flex items-center gap-1 overflow-x-auto border border-border bg-white/70 px-2 py-1.5"
    >
      <select
        aria-label="Heading style"
        defaultValue="paragraph"
        onMouseDown={(event) => event.currentTarget.focus()}
        onChange={(event) => actions.setHeading(event.target.value as HeadingOption)}
        className={`${selectClasses} w-32`}
      >
        {HEADING_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Font family"
        defaultValue={FONT_FAMILY_OPTIONS[0].value}
        onChange={(event) => actions.setFontFamily(event.target.value)}
        className={`${selectClasses} w-28`}
      >
        {FONT_FAMILY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Font size"
        defaultValue="16"
        onChange={(event) => actions.setFontSize(`${event.target.value}px`)}
        className={`${selectClasses} w-16`}
      >
        {FONT_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>

      <Divider />

      <ToolbarButton active={state.bold} label="Bold" onClick={actions.toggleBold}>
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={state.italic} label="Italic" onClick={actions.toggleItalic}>
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={state.underline} label="Underline" onClick={actions.toggleUnderline}>
        <Underline className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        active={state.align === "left"}
        label="Align left"
        onClick={() => actions.setAlignment("left")}
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={state.align === "center"}
        label="Align centre"
        onClick={() => actions.setAlignment("center")}
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={state.align === "right"}
        label="Align right"
        onClick={() => actions.setAlignment("right")}
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton label="Bulleted list" onClick={actions.insertBulletedList}>
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Numbered list" onClick={actions.insertNumberedList}>
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton label="Undo" onClick={actions.undo}>
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Redo" onClick={actions.redo}>
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton active={isFindReplaceOpen} label="Find and replace" onClick={onToggleFindReplace}>
        <Search className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}
