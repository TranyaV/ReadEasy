"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { FileText } from "lucide-react";
import { getOriginalFile } from "@/lib/library/store";
import type { DocumentKind } from "@/lib/library/types";
import { loadPdfDocument, renderPdfPageToCanvas } from "@/lib/ocr/pdf";

export type OutlineItem = { index: number; level: 1 | 2 | 3; text: string };

type PagesPanelProps = {
  documentId?: string;
  kind: DocumentKind | null;
  pageCount: number;
  currentPage: number;
  /** Pages that still have a position in the (possibly edited) document. */
  navigablePages: Set<number>;
  onSelectPage: (page: number) => void;
  outline: OutlineItem[];
  onSelectHeading: (index: number) => void;
};

type Source = { kind: "pdf"; pdf: PDFDocumentProxy } | { kind: "image"; url: string } | null;

/** Loads the stored original file once, for page thumbnails. */
function useOriginalSource(documentId: string | undefined, kind: DocumentKind | null): Source {
  const [source, setSource] = useState<Source>(null);

  useEffect(() => {
    if (!documentId || !kind || kind === "text") return;
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    void (async () => {
      try {
        const file = await getOriginalFile(documentId);
        if (!file || cancelled) return;
        if (kind === "pdf") {
          const pdf = await loadPdfDocument(file.blob);
          if (cancelled) {
            void pdf.loadingTask.destroy();
            return;
          }
          cleanup = () => void pdf.loadingTask.destroy();
          setSource({ kind: "pdf", pdf });
        } else {
          const url = URL.createObjectURL(file.blob);
          cleanup = () => URL.revokeObjectURL(url);
          if (!cancelled) setSource({ kind: "image", url });
        }
      } catch {
        // Thumbnails are optional; the page list still works without them.
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [documentId, kind]);

  return source;
}

/** Renders a PDF page thumbnail only once it scrolls into view. */
function PdfThumbnail({ pdf, page }: { pdf: PDFDocumentProxy; page: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        const canvas = document.createElement("canvas");
        renderPdfPageToCanvas(pdf, page, canvas, 220)
          .then(() => {
            if (!cancelled) setUrl(canvas.toDataURL("image/png"));
          })
          .catch(() => {});
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [pdf, page]);

  return (
    <div ref={ref} className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden bg-white">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- locally rendered page image
        <img src={url} alt="" className="h-full w-full object-contain" />
      ) : (
        <FileText className="h-6 w-6 text-slate-300" aria-hidden="true" />
      )}
    </div>
  );
}

export function PagesPanel({
  documentId,
  kind,
  pageCount,
  currentPage,
  navigablePages,
  onSelectPage,
  outline,
  onSelectHeading,
}: PagesPanelProps) {
  const [tab, setTab] = useState<"pages" | "outline">(pageCount > 1 ? "pages" : "outline");
  const source = useOriginalSource(documentId, kind);
  const pages = Array.from({ length: Math.max(1, pageCount) }, (_, index) => index + 1);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [currentPage]);

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <div role="tablist" aria-label="Document navigation" className="grid grid-cols-2 rounded-xl bg-subtle p-1">
          {(["pages", "outline"] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                tab === id ? "bg-surface font-medium text-accent shadow-sm" : "text-muted hover:text-foreground"
              }`}
            >
              {id === "pages" ? "Pages" : "Outline"}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {tab === "pages" && (
          <>
            {navigablePages.size === 0 && pageCount > 1 && (
              <p className="mb-3 text-xs text-muted">This text was edited before reading, so page positions aren&apos;t available.</p>
            )}
            <ol className="flex flex-col gap-4">
              {pages.map((page) => {
                const isCurrent = page === currentPage;
                const canNavigate = navigablePages.has(page) || pageCount === 1;
                return (
                  <li key={page}>
                    <button
                      ref={isCurrent ? activeRef : undefined}
                      type="button"
                      onClick={() => onSelectPage(page)}
                      disabled={!canNavigate}
                      aria-current={isCurrent ? "page" : undefined}
                      aria-label={`Page ${page}`}
                      className="group flex w-full flex-col items-center gap-1.5 focus-visible:outline-none disabled:cursor-default"
                    >
                      <span
                        className={`block w-full overflow-hidden rounded-lg border-2 shadow-sm transition-colors ${
                          isCurrent ? "border-accent" : "border-border group-hover:border-accent/50 group-disabled:group-hover:border-border"
                        } group-focus-visible:ring-2 group-focus-visible:ring-accent/40`}
                      >
                        {source?.kind === "pdf" ? (
                          <PdfThumbnail pdf={source.pdf} page={page} />
                        ) : source?.kind === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element -- local object URL
                          <img src={source.url} alt="" className="aspect-[3/4] w-full bg-white object-contain" />
                        ) : (
                          <span className="flex aspect-[3/4] w-full items-center justify-center bg-surface">
                            <FileText className="h-6 w-6 text-muted/50" aria-hidden="true" />
                          </span>
                        )}
                      </span>
                      <span className={`text-xs ${isCurrent ? "font-semibold text-accent" : "text-muted"}`}>{page}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </>
        )}

        {tab === "outline" &&
          (outline.length > 0 ? (
            <ul className="flex flex-col gap-0.5">
              {outline.map((item) => (
                <li key={item.index}>
                  <button
                    type="button"
                    onClick={() => onSelectHeading(item.index)}
                    className={`w-full truncate rounded-lg px-2 py-1.5 text-left text-sm text-foreground/85 hover:bg-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                      item.level === 1 ? "font-medium" : item.level === 2 ? "pl-4" : "pl-7 text-[13px]"
                    }`}
                  >
                    {item.text}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-1 text-sm text-muted">
              No headings yet. Use the Heading styles in the toolbar and they&apos;ll appear here as an outline.
            </p>
          ))}
      </div>
    </div>
  );
}
