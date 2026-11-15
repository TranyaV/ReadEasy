import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { PageContainer, PageHeading } from "@/components/layout/AppShell";

export const metadata: Metadata = { title: "Help & Support · ReadEase" };

const TOPICS: { title: string; body: ReactNode }[] = [
  {
    title: "Which files can I upload?",
    body: "PDF, PNG, JPG and JPEG files up to 25 MB. Text is recognised with OCR in your browser, so scanned pages and photos work too. Clear, well-lit, straight scans give the best results — you can correct any mistakes before you start reading.",
  },
  {
    title: "Where are my documents saved?",
    body: "In this browser only. ReadEase keeps your library (original files, edits, folders, stars and reading position) in your browser's local storage. There's no account and nothing is uploaded to a cloud. Clearing site data or switching browsers means the library won't be there.",
  },
  {
    title: "Editing a document",
    body: "The document is always editable — click anywhere and type. Use the toolbar for headings, bold, italic, underline, lists, alignment, undo/redo and find & replace. Changes save automatically.",
  },
  {
    title: "Making text easier to read",
    body: (
      <>
        Open the Reading &amp; Accessibility panel in the workspace to change the font, text size, line, letter, word and paragraph
        spacing, page colour, text contrast and reading ruler. Changes there apply to that document. To use settings for every new
        document, save them in your <Link href="/profile" className="text-accent underline">Reading Profile</Link>.
      </>
    ),
  },
  {
    title: "Listening to a document",
    body: "Press Read aloud in the workspace. Each sentence is highlighted as it's read. Choose a voice and speed in the Listen tab. Voices come from your device, so the list differs between computers and browsers.",
  },
  {
    title: "Looking up a word",
    body: "Turn on Define (the book icon at the end of the document toolbar), then click any word to see its pronunciation and meaning. Definitions come from Wiktionary via the Free Dictionary API; some words have no example sentence or recording. Turn Define off to go back to normal editing.",
  },
  {
    title: "Asking ReadEase AI",
    body: "Use the round Ask ReadEase button. You can ask general questions anywhere. In the workspace, ask about the document (for example “Summarise this page” or “Explain this paragraph”) or select some text first — ReadEase will ask before sending an excerpt of your document to Google Gemini. AI answers can be wrong, so check anything important.",
  },
  {
    title: "Keyboard shortcuts",
    body: "⌘K / Ctrl+K: search your documents and folders. Enter in the chat sends a message; Shift+Enter adds a new line. Escape closes menus, dialogs and definitions.",
  },
];

export default function HelpPage() {
  return (
    <PageContainer className="max-w-4xl">
      <PageHeading title="Help & Support" description="Answers to common questions about using ReadEase." />
      <div className="flex flex-col gap-3">
        {TOPICS.map((topic) => (
          <details key={topic.title} className="group rounded-2xl border border-border bg-surface px-5 py-4 open:pb-5">
            <summary className="cursor-pointer list-none text-base font-medium text-foreground marker:hidden">
              <span className="flex items-center justify-between gap-4">
                {topic.title}
                <span className="text-muted transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">{topic.body}</p>
          </details>
        ))}
      </div>
    </PageContainer>
  );
}
