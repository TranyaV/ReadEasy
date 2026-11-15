"use client";

import { Star } from "lucide-react";
import { useOpenDocument } from "@/components/library/useOpenDocument";
import { formatBytes, formatRelativeTime } from "@/lib/format";
import { setStarred } from "@/lib/library/store";
import { useNow } from "@/lib/useNow";
import type { LibraryDocument, LibraryFolder } from "@/lib/library/types";
import { FileTypeIcon, StatusBadge } from "./DocumentBits";
import { DocumentMenu } from "./DocumentMenu";

type Column = "status" | "type" | "lastOpened" | "uploaded" | "folder" | "size";

type DocumentTableProps = {
  documents: LibraryDocument[];
  folders: LibraryFolder[];
  columns: Column[];
  emptyMessage: string;
  caption: string;
};

const COLUMN_LABELS: Record<Column, string> = {
  status: "Status",
  type: "Type",
  lastOpened: "Last opened",
  uploaded: "Uploaded",
  folder: "Folder",
  size: "Size",
};

/** Columns hidden on narrow screens to keep the table readable. */
const RESPONSIVE: Partial<Record<Column, string>> = {
  type: "hidden md:table-cell",
  folder: "hidden lg:table-cell",
  size: "hidden sm:table-cell",
  uploaded: "hidden md:table-cell",
};

export function DocumentTable({ documents, folders, columns, emptyMessage, caption }: DocumentTableProps) {
  const now = useNow();
  const openDocument = useOpenDocument();
  const folderNames = new Map(folders.map((folder) => [folder.id, folder.name]));

  if (documents.length === 0) {
    return <p className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center text-sm text-muted">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border text-[13px] text-muted">
            <th scope="col" className="py-3 pl-3 pr-4 font-medium">
              Name
            </th>
            {columns.map((column) => (
              <th key={column} scope="col" className={`px-4 py-3 font-medium ${RESPONSIVE[column] ?? ""}`}>
                {COLUMN_LABELS[column]}
              </th>
            ))}
            <th scope="col" className="w-20 py-3 pr-2">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => {
            const canOpen = document.status === "ready";
            return (
              <tr key={document.id} className="border-b border-border/70 transition-colors hover:bg-subtle/50">
                <td className="py-2.5 pl-3 pr-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <FileTypeIcon document={document} size="sm" />
                    {canOpen ? (
                      <button
                        type="button"
                        onClick={() => void openDocument(document.id)}
                        className="min-w-0 truncate text-left font-medium text-foreground hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                      >
                        {document.title}
                      </button>
                    ) : (
                      <span className="min-w-0 truncate font-medium text-foreground/80">{document.title}</span>
                    )}
                  </div>
                </td>
                {columns.map((column) => (
                  <td key={column} className={`whitespace-nowrap px-4 py-2.5 text-foreground/80 ${RESPONSIVE[column] ?? ""}`}>
                    {column === "status" && <StatusBadge document={document} now={now} />}
                    {column === "type" && document.typeLabel}
                    {column === "lastOpened" && (document.lastOpenedAt ? formatRelativeTime(document.lastOpenedAt, now) : "Not opened yet")}
                    {column === "uploaded" && formatRelativeTime(document.createdAt, now)}
                    {column === "folder" && (document.folderId ? folderNames.get(document.folderId) ?? "—" : "—")}
                    {column === "size" && formatBytes(document.size)}
                  </td>
                ))}
                <td className="py-2.5 pr-2">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => void setStarred(document.id, !document.starred)}
                      aria-pressed={document.starred}
                      aria-label={document.starred ? `Remove ${document.title} from Starred` : `Star ${document.title}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-subtle hover:text-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      <Star className={`h-4 w-4 ${document.starred ? "fill-amber-400 text-amber-500" : ""}`} />
                    </button>
                    <DocumentMenu document={document} folders={folders} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
