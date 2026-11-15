import { AlertCircle, CheckCircle2, Clock, FileText, Image as ImageIcon, Loader2, NotebookPen } from "lucide-react";
import { isInterrupted, type LibraryDocument } from "@/lib/library/types";

const TYPE_STYLES: Record<LibraryDocument["kind"], { icon: typeof FileText; className: string }> = {
  pdf: { icon: FileText, className: "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300" },
  image: { icon: ImageIcon, className: "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300" },
  text: { icon: NotebookPen, className: "bg-accent-soft text-accent" },
};

export function FileTypeIcon({ document, size = "md" }: { document: Pick<LibraryDocument, "kind" | "typeLabel">; size?: "sm" | "md" }) {
  const { icon: Icon, className } = TYPE_STYLES[document.kind];
  const box = size === "sm" ? "h-7 w-7 rounded-md" : "h-9 w-9 rounded-lg";
  return (
    <span className={`flex shrink-0 items-center justify-center ${box} ${className}`} title={document.typeLabel}>
      <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden="true" />
      <span className="sr-only">{document.typeLabel}</span>
    </span>
  );
}

/** Real processing status of a library document. */
export function StatusBadge({ document, now }: { document: LibraryDocument; now: number }) {
  if (document.status === "ready") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 dark:bg-green-950/40 px-2.5 py-1 text-xs font-medium text-success">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Ready
      </span>
    );
  }
  if (document.status === "error") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-950/40 px-2.5 py-1 text-xs font-medium text-error"
        title={document.statusMessage}
      >
        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> Failed
      </span>
    );
  }
  if (isInterrupted(document, now)) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-subtle px-2.5 py-1 text-xs font-medium text-muted"
        title="The page was closed before text recognition finished. Upload the file again."
      >
        <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Interrupted
      </span>
    );
  }
  const percent = Math.round((document.processingProgress ?? 0) * 100);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> OCR in progress ({percent}%)
    </span>
  );
}
