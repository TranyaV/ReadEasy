"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Folder, Search } from "lucide-react";
import { useOpenDocument } from "@/components/library/useOpenDocument";
import { useLibrary } from "@/lib/library/useLibrary";

type Result =
  | { kind: "document"; id: string; label: string; detail: string }
  | { kind: "folder"; id: string; label: string; detail: string };

const MAX_RESULTS = 8;

/** Searches document titles, filenames and folder names in the browser-local library. */
export function GlobalSearch() {
  const router = useRouter();
  const library = useLibrary();
  const openDocument = useOpenDocument();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const results = useMemo<Result[]>(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const folderNames = new Map(library.folders.map((folder) => [folder.id, folder.name]));
    const folders: Result[] = library.folders
      .filter((folder) => folder.name.toLowerCase().includes(needle))
      .map((folder) => ({ kind: "folder", id: folder.id, label: folder.name, detail: "Folder" }));
    const documents: Result[] = library.documents
      .filter(
        (document) =>
          document.title.toLowerCase().includes(needle) || (document.fileName ?? "").toLowerCase().includes(needle),
      )
      .map((document) => ({
        kind: "document",
        id: document.id,
        label: document.title,
        detail: [document.typeLabel, document.folderId ? folderNames.get(document.folderId) : null].filter(Boolean).join(" · "),
      }));
    return [...folders, ...documents].slice(0, MAX_RESULTS);
  }, [query, library.documents, library.folders]);

  // ⌘K / Ctrl+K focuses search from anywhere.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function choose(result: Result) {
    setIsOpen(false);
    setQuery("");
    if (result.kind === "folder") {
      router.push(`/library#folder=${encodeURIComponent(result.id)}`);
    } else {
      void openDocument(result.id);
    }
  }

  const showPanel = isOpen && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search documents and folders
      </label>
      <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-subtle/70 px-3 focus-within:border-accent focus-within:bg-surface focus-within:ring-2 focus-within:ring-accent/20">
        <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        <input
          ref={inputRef}
          id={`${listId}-input`}
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showPanel && results[activeIndex] ? `${listId}-${activeIndex}` : undefined}
          placeholder="Search documents and folders"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => Math.min(results.length - 1, index + 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(0, index - 1));
            } else if (event.key === "Enter" && results[activeIndex]) {
              event.preventDefault();
              choose(results[activeIndex]);
            } else if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        <kbd className="hidden shrink-0 rounded-md border border-border bg-surface px-1.5 py-0.5 text-[11px] text-muted md:inline">⌘K</kbd>
      </div>

      {showPanel && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-12 z-50 max-h-80 overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted">
              {library.status === "unavailable" ? "Your library isn't available in this browser." : "No matching documents or folders."}
            </li>
          ) : (
            results.map((result, index) => {
              const Icon = result.kind === "folder" ? Folder : FileText;
              return (
                <li
                  key={`${result.kind}-${result.id}`}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(result)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 ${index === activeIndex ? "bg-accent-soft" : ""}`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{result.label}</span>
                  <span className="shrink-0 text-xs text-muted">{result.detail}</span>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
