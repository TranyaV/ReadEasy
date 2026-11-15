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
      className="w-full max-w-md rounded border border-transparent bg-transparent font-serif text-2xl font-semibold text-foreground placeholder:text-foreground/40 hover:border-border focus:border-forest focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/40"
    />
  );
}
