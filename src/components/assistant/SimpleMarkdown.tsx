import type { ReactNode } from "react";

/** **bold** and *italic* inside one line, rendered as React elements (never as HTML). */
function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|\*(\S(?:.*?\S)?)\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(match[1] !== undefined ? <strong key={match.index}>{match[1]}</strong> : <em key={match.index}>{match[2]}</em>);
    last = pattern.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/**
 * Minimal, safe rendering of the Markdown the assistant commonly uses: paragraphs,
 * bullet and numbered lists, bold and italic. Anything else shows as plain text.
 */
export function SimpleMarkdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let paragraph: string[] = [];

  function flushParagraph() {
    if (paragraph.length) {
      blocks.push(
        <p key={`p${blocks.length}`}>
          {paragraph.map((line, index) => (
            <span key={index}>
              {index > 0 && <br />}
              {renderInline(line)}
            </span>
          ))}
        </p>,
      );
      paragraph = [];
    }
  }
  function flushList() {
    if (list) {
      const items = list.items.map((item, index) => <li key={index}>{renderInline(item)}</li>);
      blocks.push(
        list.ordered ? (
          <ol key={`l${blocks.length}`} className="list-decimal pl-5">
            {items}
          </ol>
        ) : (
          <ul key={`l${blocks.length}`} className="list-disc pl-5">
            {items}
          </ul>
        ),
      );
      list = null;
    }
  }

  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[*-]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? numbered)![1]);
    } else if (!line.trim()) {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(line.replace(/^#{1,6}\s+/, ""));
    }
  }
  flushParagraph();
  flushList();

  return <div className="flex flex-col gap-2">{blocks}</div>;
}
