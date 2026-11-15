"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpenText, FolderOpen, Play, Plus, Star, Upload } from "lucide-react";
import { PageContainer } from "@/components/layout/AppShell";
import { FileTypeIcon } from "@/components/library/DocumentBits";
import { DocumentTable } from "@/components/library/DocumentTable";
import { FolderCard, NewFolderButton, countByFolder } from "@/components/library/Folders";
import { useCreateDocument } from "@/components/library/useCreateDocument";
import { useOpenDocument } from "@/components/library/useOpenDocument";
import { Button } from "@/components/ui/Button";
import { clearDocumentForReading } from "@/lib/documentHandoff";
import { formatRelativeTime } from "@/lib/format";
import type { LibraryDocument } from "@/lib/library/types";
import { byLastActivity, byLastOpened, useLibrary } from "@/lib/library/useLibrary";
import { useNow } from "@/lib/useNow";

function SectionHeader({ id, title, action }: { id: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <h2 id={id} className="text-xl font-semibold text-foreground">
        {title}
      </h2>
      {action}
    </div>
  );
}

function ContinueReadingCard({ document, now }: { document: LibraryDocument; now: number }) {
  const openDocument = useOpenDocument();
  const page = document.readingProgress?.page ?? 1;
  return (
    <button
      type="button"
      onClick={() => void openDocument(document.id)}
      className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-3.5 text-left transition-colors hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <span className="flex h-[88px] w-[68px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-subtle">
        {document.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element -- locally generated data URL
          <img src={document.thumbnail} alt="" className="h-full w-full object-cover object-top" />
        ) : (
          <FileTypeIcon document={document} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm font-semibold text-foreground">{document.title}</span>
        <span className="mt-1.5 block text-xs text-muted">
          Page {Math.min(page, document.pageCount)} of {document.pageCount} ·{" "}
          {document.lastOpenedAt ? formatRelativeTime(document.lastOpenedAt, now) : ""}
        </span>
      </span>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-accent transition-colors group-hover:bg-accent group-hover:text-on-accent">
        <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden="true" />
        <span className="sr-only">Continue reading</span>
      </span>
    </button>
  );
}

export function HomeDashboard() {
  const router = useRouter();
  const library = useLibrary();
  const now = useNow();
  const { create, isCreating } = useCreateDocument();

  const readyDocuments = library.documents.filter((document) => document.status === "ready");
  const continueReading = readyDocuments.filter((document) => document.lastOpenedAt).sort(byLastOpened).slice(0, 4);
  const recent = [...library.documents].sort(byLastActivity).slice(0, 6);
  const folderCounts = countByFolder(library.documents);
  const starredCount = library.documents.filter((document) => document.starred).length;
  const hasDocuments = library.documents.length > 0;

  return (
    <PageContainer>
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2.1rem]">
        {hasDocuments ? "Welcome back" : "Welcome to ReadEase"}
      </h1>
      <p className="mt-2 text-base text-muted">Read, edit and listen to your documents with a dyslexia-friendly experience.</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button href="/upload" size="lg">
          <Upload className="h-4 w-4" /> Upload document
        </Button>
        <Button variant="secondary" size="lg" onClick={() => void create()} disabled={isCreating}>
          <Plus className="h-4 w-4" /> New document
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => {
            clearDocumentForReading();
            router.push("/workspace");
          }}
        >
          <BookOpenText className="h-4 w-4" /> Try a sample
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        <Link href="/library" className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-foreground/80 hover:border-accent/40 hover:text-accent">
          <FolderOpen className="h-4 w-4" /> My Library · {library.documents.length}
        </Link>
        <Link href="/starred" className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-foreground/80 hover:border-accent/40 hover:text-accent">
          <Star className="h-4 w-4" /> Starred · {starredCount}
        </Link>
      </div>

      {library.status === "unavailable" && (
        <p className="mt-8 rounded-2xl border border-dashed border-border bg-surface px-6 py-6 text-sm text-muted">
          This browser isn&apos;t allowing local storage (for example in some private windows), so your library can&apos;t be
          saved here. You can still upload and read documents.
        </p>
      )}

      {library.status === "loading" && <div className="mt-10 h-40 animate-pulse rounded-2xl bg-subtle" />}

      {library.status === "ready" && (
        <>
          <section className="mt-10" aria-labelledby="continue-reading">
            <SectionHeader id="continue-reading" title="Continue reading" />
            {continueReading.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {continueReading.map((document) => (
                  <ContinueReadingCard key={document.id} document={document} now={now} />
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-border bg-surface px-6 py-8 text-center text-sm text-muted">
                Documents you open will appear here so you can pick up where you left off.
              </p>
            )}
          </section>

          <section className="mt-10" aria-labelledby="folders">
            <SectionHeader
              id="folders"
              title="Folders"
              action={
                <div className="flex items-center gap-2">
                  <NewFolderButton variant="ghost" />
                  {library.folders.length > 0 && (
                    <Link href="/library" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
                      View all <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              }
            />
            {library.folders.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {library.folders.slice(0, 4).map((folder) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    count={folderCounts.get(folder.id) ?? 0}
                    onSelect={() => router.push(`/library#folder=${encodeURIComponent(folder.id)}`)}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-border bg-surface px-6 py-8 text-center text-sm text-muted">
                No folders yet. Create one to organise your documents.
              </p>
            )}
          </section>

          <section className="mt-10" aria-labelledby="recent-documents">
            <SectionHeader
              id="recent-documents"
              title="Recent documents"
              action={
                hasDocuments ? (
                  <Link href="/recent" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
                    View all <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : undefined
              }
            />
            <DocumentTable
              documents={recent}
              folders={library.folders}
              columns={["type", "lastOpened", "size"]}
              caption="Recent documents"
              emptyMessage="No documents yet. Upload a PDF or image, or create a new document to get started."
            />
          </section>
        </>
      )}
    </PageContainer>
  );
}
