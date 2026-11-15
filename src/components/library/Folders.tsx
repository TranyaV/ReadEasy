"use client";

import { useEffect, useRef, useState } from "react";
import { Folder, FolderPlus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { createFolder, deleteFolder, renameFolder } from "@/lib/library/store";
import type { LibraryDocument, LibraryFolder } from "@/lib/library/types";

export function NewFolderButton({ onCreated, variant = "secondary" }: { onCreated?: (folder: LibraryFolder) => void; variant?: "secondary" | "ghost" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    try {
      const folder = await createFolder(name);
      if (folder) onCreated?.(folder);
      setIsOpen(false);
      setName("");
    } catch {
      setError("The folder couldn't be created. Please try again.");
    }
  }

  return (
    <>
      <Button variant={variant} onClick={() => setIsOpen(true)}>
        <FolderPlus className="h-4 w-4" /> New folder
      </Button>
      {isOpen && (
        <Dialog
          title="New folder"
          onClose={() => setIsOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void submit()} disabled={!name.trim()}>
                Create
              </Button>
            </>
          }
        >
          <label htmlFor="new-folder-name" className="text-sm font-medium text-foreground">
            Folder name
          </label>
          <input
            id="new-folder-name"
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && name.trim()) void submit();
            }}
            className="mt-2 w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          {error && <p className="mt-2 text-sm text-error">{error}</p>}
        </Dialog>
      )}
    </>
  );
}

type FolderCardProps = {
  folder: LibraryFolder;
  count: number;
  isActive?: boolean;
  onSelect: () => void;
};

export function FolderCard({ folder, count, isActive = false, onSelect }: FolderCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);
  const [name, setName] = useState(folder.name);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isMenuOpen]);

  return (
    <div
      className={`relative flex items-center gap-3 rounded-2xl border bg-surface px-4 py-3.5 transition-colors ${
        isActive ? "border-accent ring-2 ring-accent/15" : "border-border hover:border-accent/40"
      }`}
    >
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none">
        <Folder className="h-9 w-9 shrink-0 fill-accent/25 text-accent/70" strokeWidth={1.4} aria-hidden="true" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">{folder.name}</span>
          <span className="block text-xs text-muted">
            {count} {count === 1 ? "document" : "documents"}
          </span>
        </span>
      </button>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          aria-label={`Actions for folder ${folder.name}`}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {isMenuOpen && (
          <div role="menu" className="absolute right-0 top-9 z-40 w-44 rounded-xl border border-border bg-surface p-1.5 shadow-lg">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsMenuOpen(false);
                setName(folder.name);
                setDialog("rename");
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-subtle"
            >
              <Pencil className="h-4 w-4 text-muted" /> Rename
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsMenuOpen(false);
                setDialog("delete");
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-error hover:bg-subtle"
            >
              <Trash2 className="h-4 w-4" /> Delete folder
            </button>
          </div>
        )}
      </div>

      {dialog === "rename" && (
        <Dialog
          title="Rename folder"
          onClose={() => setDialog(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button
                disabled={!name.trim()}
                onClick={() => void renameFolder(folder.id, name).then(() => setDialog(null))}
              >
                Rename
              </Button>
            </>
          }
        >
          <label htmlFor={`folder-${folder.id}`} className="text-sm font-medium text-foreground">
            Folder name
          </label>
          <input
            id={`folder-${folder.id}`}
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </Dialog>
      )}
      {dialog === "delete" && (
        <Dialog
          title="Delete folder?"
          onClose={() => setDialog(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <button
                type="button"
                data-autofocus
                onClick={() => void deleteFolder(folder.id).then(() => setDialog(null))}
                className="inline-flex items-center justify-center rounded-xl bg-error px-4 py-2.5 text-sm font-medium text-on-accent hover:opacity-90"
              >
                Delete folder
              </button>
            </>
          }
        >
          <p className="text-sm text-muted">
            The folder <span className="font-medium text-foreground">{folder.name}</span> will be removed. Its {count}{" "}
            {count === 1 ? "document stays" : "documents stay"} in My Library.
          </p>
        </Dialog>
      )}
    </div>
  );
}

export function countByFolder(documents: LibraryDocument[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const document of documents) {
    if (document.folderId) counts.set(document.folderId, (counts.get(document.folderId) ?? 0) + 1);
  }
  return counts;
}
