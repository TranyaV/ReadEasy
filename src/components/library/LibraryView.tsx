"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { PageContainer, PageHeading } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { useCreateDocument } from "@/components/library/useCreateDocument";
import type { LibraryDocument } from "@/lib/library/types";
import { byLastActivity, lastActivity, useLibrary } from "@/lib/library/useLibrary";
import { DocumentTable } from "./DocumentTable";
import { FolderCard, NewFolderButton, countByFolder } from "./Folders";

type View = "library" | "starred" | "recent";
type SortKey = "activity" | "name" | "created" | "size";

const COPY: Record<View, { title: string; description: string; empty: string }> = {
  library: {
    title: "My Library",
    description: "Every document saved in this browser. Organise them into folders, star the ones you use most, and reopen any time.",
    empty: "Your library is empty. Upload a PDF or image, or create a new document.",
  },
  starred: {
    title: "Starred",
    description: "Documents you've starred. Starring keeps the same document in your library — nothing is copied.",
    empty: "No starred documents yet. Use the star next to any document to add it here.",
  },
  recent: {
    title: "Recent",
    description: "Documents ordered by when you last opened, edited or uploaded them.",
    empty: "No recent activity yet.",
  },
};

const RECENT_LIMIT = 30;

function readFolderFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const match = window.location.hash.match(/^#folder=(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function sortDocuments(documents: LibraryDocument[], key: SortKey): LibraryDocument[] {
  const sorted = [...documents];
  switch (key) {
    case "name":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "created":
      return sorted.sort((a, b) => b.createdAt - a.createdAt);
    case "size":
      return sorted.sort((a, b) => b.size - a.size);
    default:
      return sorted.sort(byLastActivity);
  }
}

export function LibraryView({ view }: { view: View }) {
  const library = useLibrary();
  const { create, isCreating } = useCreateDocument();
  const [folderId, setFolderId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("activity");

  // Folder links from search and Home use #folder=<id>.
  useEffect(() => {
    if (view !== "library") return;
    function sync() {
      setFolderId(readFolderFromHash());
    }
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [view]);

  function selectFolder(id: string | null) {
    setFolderId(id);
    const url = id ? `#folder=${encodeURIComponent(id)}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }

  const activeFolder = library.folders.find((folder) => folder.id === folderId) ?? null;
  const folderCounts = countByFolder(library.documents);

  const documents = useMemo(() => {
    let list = library.documents;
    if (view === "starred") list = list.filter((document) => document.starred);
    if (view === "library" && activeFolder) list = list.filter((document) => document.folderId === activeFolder.id);
    const needle = query.trim().toLowerCase();
    if (needle) {
      list = list.filter(
        (document) => document.title.toLowerCase().includes(needle) || (document.fileName ?? "").toLowerCase().includes(needle),
      );
    }
    if (view === "recent") {
      return [...list].filter((document) => lastActivity(document) > 0).sort(byLastActivity).slice(0, RECENT_LIMIT);
    }
    return sortDocuments(list, sortKey);
  }, [library.documents, view, activeFolder, query, sortKey]);

  const copy = COPY[view];

  return (
    <PageContainer>
      <PageHeading
        title={activeFolder ? activeFolder.name : copy.title}
        description={activeFolder ? `Folder in My Library · ${folderCounts.get(activeFolder.id) ?? 0} documents` : copy.description}
        actions={
          view === "library" ? (
            <>
              <NewFolderButton onCreated={(folder) => selectFolder(folder.id)} />
              <Button onClick={() => void create()} disabled={isCreating}>
                New document
              </Button>
            </>
          ) : undefined
        }
      />

      {library.status === "unavailable" && (
        <p className="rounded-2xl border border-dashed border-border bg-surface px-6 py-8 text-center text-sm text-muted">
          This browser isn&apos;t allowing local storage, so the library can&apos;t be used here.
        </p>
      )}
      {library.status === "loading" && <div className="h-48 animate-pulse rounded-2xl bg-subtle" />}

      {library.status === "ready" && (
        <>
          {view === "library" && library.folders.length > 0 && (
            <section aria-label="Folders" className="mb-8">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => selectFolder(null)}
                  aria-pressed={!activeFolder}
                  className={`rounded-full border px-3.5 py-1.5 text-sm ${
                    !activeFolder ? "border-accent bg-accent-soft font-medium text-accent" : "border-border bg-surface text-foreground/80 hover:border-accent/40"
                  }`}
                >
                  All documents
                </button>
                {activeFolder && (
                  <button
                    type="button"
                    onClick={() => selectFolder(null)}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-sm text-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" /> Clear folder filter
                  </button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {library.folders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    count={folderCounts.get(folder.id) ?? 0}
                    isActive={folder.id === activeFolder?.id}
                    onSelect={() => selectFolder(folder.id === activeFolder?.id ? null : folder.id)}
                  />
                ))}
              </div>
            </section>
          )}

          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 sm:max-w-xs">
              <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${view === "library" ? (activeFolder ? "this folder" : "your library") : copy.title.toLowerCase()}`}
                aria-label="Filter documents"
                className="h-full min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
              />
            </div>
            {view !== "recent" && (
              <label className="flex items-center gap-2 text-sm text-muted">
                Sort by
                <select
                  value={sortKey}
                  onChange={(event) => setSortKey(event.target.value as SortKey)}
                  className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="activity">Recent activity</option>
                  <option value="name">Name</option>
                  <option value="created">Date added</option>
                  <option value="size">Size</option>
                </select>
              </label>
            )}
          </div>

          <DocumentTable
            documents={documents}
            folders={library.folders}
            columns={view === "recent" ? ["lastOpened", "type", "folder", "size"] : ["type", "lastOpened", "folder", "size"]}
            caption={copy.title}
            emptyMessage={query ? "No documents match your search." : activeFolder ? "This folder is empty. Use “Move to folder” on any document to add it." : copy.empty}
          />
        </>
      )}
    </PageContainer>
  );
}
