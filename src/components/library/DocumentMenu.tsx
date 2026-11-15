"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, FolderInput, MoreVertical, Pencil, Star, StarOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useOpenDocument } from "@/components/library/useOpenDocument";
import { deleteDocument, moveToFolder, renameDocument, setStarred } from "@/lib/library/store";
import type { LibraryDocument, LibraryFolder } from "@/lib/library/types";

type DocumentMenuProps = {
  document: LibraryDocument;
  folders: LibraryFolder[];
};

type DialogKind = "rename" | "move" | "delete" | null;

const itemClass =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-subtle focus-visible:bg-subtle focus-visible:outline-none";

export function DocumentMenu({ document, folders }: DocumentMenuProps) {
  const openDocument = useOpenDocument();
  const [isOpen, setIsOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [title, setTitle] = useState(document.title);
  const [folderId, setFolderId] = useState(document.folderId ?? "");
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    window.document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  function openDialog(kind: DialogKind) {
    setIsOpen(false);
    setError(null);
    setTitle(document.title);
    setFolderId(document.folderId ?? "");
    setDialog(kind);
  }

  async function run(action: () => Promise<void>) {
    try {
      await action();
      setDialog(null);
    } catch {
      setError("That change couldn't be saved. Please try again.");
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={`Actions for ${document.title}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <div role="menu" className="absolute right-0 top-9 z-40 w-52 rounded-xl border border-border bg-surface p-1.5 shadow-lg">
          {document.status === "ready" && (
            <button type="button" role="menuitem" className={itemClass} onClick={() => void openDocument(document.id)}>
              <BookOpen className="h-4 w-4 text-muted" /> Open
            </button>
          )}
          <button type="button" role="menuitem" className={itemClass} onClick={() => openDialog("rename")}>
            <Pencil className="h-4 w-4 text-muted" /> Rename
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => {
              setIsOpen(false);
              void setStarred(document.id, !document.starred);
            }}
          >
            {document.starred ? <StarOff className="h-4 w-4 text-muted" /> : <Star className="h-4 w-4 text-muted" />}
            {document.starred ? "Remove from Starred" : "Add to Starred"}
          </button>
          <button type="button" role="menuitem" className={itemClass} onClick={() => openDialog("move")}>
            <FolderInput className="h-4 w-4 text-muted" /> Move to folder
          </button>
          <div className="my-1 h-px bg-border" />
          <button type="button" role="menuitem" className={`${itemClass} text-error`} onClick={() => openDialog("delete")}>
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      )}

      {dialog === "rename" && (
        <Dialog
          title="Rename document"
          onClose={() => setDialog(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button onClick={() => void run(() => renameDocument(document.id, title))} disabled={!title.trim()}>
                Rename
              </Button>
            </>
          }
        >
          <label className="text-sm font-medium text-foreground" htmlFor={`rename-${document.id}`}>
            Document name
          </label>
          <input
            id={`rename-${document.id}`}
            value={title}
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && title.trim()) void run(() => renameDocument(document.id, title));
            }}
            className="mt-2 w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          {error && <p className="mt-2 text-sm text-error">{error}</p>}
        </Dialog>
      )}

      {dialog === "move" && (
        <Dialog
          title="Move to folder"
          onClose={() => setDialog(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button onClick={() => void run(() => moveToFolder(document.id, folderId || null))}>Move</Button>
            </>
          }
        >
          <label className="text-sm font-medium text-foreground" htmlFor={`move-${document.id}`}>
            Folder
          </label>
          <select
            id={`move-${document.id}`}
            value={folderId}
            onChange={(event) => setFolderId(event.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            <option value="">No folder</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
          {folders.length === 0 && <p className="mt-2 text-sm text-muted">Create a folder in My Library first.</p>}
          {error && <p className="mt-2 text-sm text-error">{error}</p>}
        </Dialog>
      )}

      {dialog === "delete" && (
        <Dialog
          title="Delete document?"
          onClose={() => setDialog(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <button
                type="button"
                data-autofocus
                onClick={() => void run(() => deleteDocument(document.id))}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-error px-4 py-2.5 text-sm font-medium text-on-accent hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/40"
              >
                Delete
              </button>
            </>
          }
        >
          <p className="text-sm text-muted">
            <span className="font-medium text-foreground">{document.title}</span> and its edits will be permanently removed
            from this browser. This can&apos;t be undone.
          </p>
          {error && <p className="mt-2 text-sm text-error">{error}</p>}
        </Dialog>
      )}
    </div>
  );
}
