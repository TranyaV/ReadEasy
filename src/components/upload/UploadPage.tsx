"use client";

import Link from "next/link";
import { ArrowRight, AudioLines, Layers, ScanText, Type } from "lucide-react";
import { UploadFlow } from "@/components/landing/UploadFlow";
import { PageContainer, PageHeading } from "@/components/layout/AppShell";
import { DocumentTable } from "@/components/library/DocumentTable";
import { useLibrary } from "@/lib/library/useLibrary";

const FEATURES = [
  {
    icon: ScanText,
    title: "OCR text recognition",
    body: "Text in scanned PDFs and photos is recognised in your browser and turned into editable text. Accuracy depends on scan quality, so you can review and correct it before reading.",
  },
  {
    icon: Type,
    title: "Dyslexia-friendly reading",
    body: "Choose a readable font, text size, letter, word and line spacing, and a calm page colour that works for you.",
  },
  {
    icon: AudioLines,
    title: "Read aloud",
    body: "Listen to your document with your device's voices while each sentence is highlighted as it's read.",
  },
  {
    icon: Layers,
    title: "Keep your work organised",
    body: "Uploads are saved in My Library in this browser, so you can reopen, rename, star and sort them into folders.",
  },
];

const MAX_RECENT = 5;

export function UploadPage() {
  const library = useLibrary();
  const uploads = library.documents
    .filter((document) => document.hasOriginal)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_RECENT);

  return (
    <PageContainer>
      <PageHeading
        title="Upload a document"
        description="Turn a PDF or image into a personalised, dyslexia-friendly reading experience with OCR, custom fonts and read aloud."
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-12">
        <UploadFlow />

        <ul className="flex flex-col gap-6 lg:border-l lg:border-border lg:pl-10">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-semibold text-foreground">{title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <section className="mt-12" aria-labelledby="recent-uploads">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 id="recent-uploads" className="text-xl font-semibold text-foreground">
            Recent uploads
          </h2>
          <Link href="/library" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {library.status === "loading" ? (
          <div className="h-32 animate-pulse rounded-2xl bg-subtle" />
        ) : library.status === "unavailable" ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface px-6 py-8 text-center text-sm text-muted">
            This browser isn&apos;t allowing local storage, so uploads can be read but not saved to your library.
          </p>
        ) : (
          <DocumentTable
            documents={uploads}
            folders={library.folders}
            columns={["status", "type", "uploaded", "size"]}
            caption="Recent uploads"
            emptyMessage="Nothing uploaded yet. Files you upload will appear here."
          />
        )}
      </section>
    </PageContainer>
  );
}
