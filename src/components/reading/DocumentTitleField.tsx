"use client";

type DocumentTitleFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
};

export function DocumentTitleField({ value, onChange, onCommit }: DocumentTitleFieldProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onCommit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      placeholder="Untitled document"
      aria-label="Document title"
      maxLength={200}
      className="w-full min-w-0 max-w-md truncate rounded-lg border border-transparent bg-transparent px-2 py-1 text-[15px] font-medium text-foreground placeholder:text-muted hover:border-border focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
    />
  );
}
