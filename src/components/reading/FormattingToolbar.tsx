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
  /** Extra controls at the end of the toolbar. */
  end?: ReactNode;
};

const HEADING_OPTIONS: { value: HeadingOption; label: string }[] = [
  { value: "paragraph", label: "Normal text" },
  { value: "heading1", label: "Heading 1" },
  { value: "heading2", label: "Heading 2" },
  { value: "heading3", label: "Heading 3" },
];

const baseButton =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground/75 transition-colors hover:bg-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-40";
const activeButton = "bg-accent-soft text-accent";

const selectClasses =
  "h-9 shrink-0 rounded-lg border border-transparent bg-transparent px-2 text-sm text-foreground hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 self-center bg-border" aria-hidden="true" />;
}

export function ToolbarButton({
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
  end,
}: FormattingToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      className="sticky top-0 z-20 flex items-center gap-1 overflow-x-auto rounded-t-2xl border border-border bg-surface px-2 py-1.5"
    >
      <ToolbarButton label="Undo" onClick={actions.undo}>
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Redo" onClick={actions.redo}>
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

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

      <ToolbarButton active={isFindReplaceOpen} label="Find and replace" onClick={onToggleFindReplace}>
        <Search className="h-4 w-4" />
      </ToolbarButton>

      {end && (
        <>
          <Divider />
          {end}
        </>
      )}
    </div>
  );
}
