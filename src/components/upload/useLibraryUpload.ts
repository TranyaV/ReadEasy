"use client";

import { useRef } from "react";
import type { ExtractionCallbacks } from "@/components/landing/useDocumentExtraction";
import { isIndexedDbAvailable } from "@/lib/library/db";
import { completeUpload, createUploadRecord, updateDocument } from "@/lib/library/store";
import { createThumbnail } from "@/lib/library/thumbnails";
import { wrapPagesAsHtml } from "@/lib/richtext/domText";
import { splitIntoParagraphs } from "@/lib/text/paragraphs";

const PROGRESS_WRITE_STEP = 0.05;

/**
 * Mirrors an OCR run into the browser-local library: a "processing" record with
 * the original file when it starts, throttled progress, then the extracted,
 * page-tagged content (or the error) when it finishes. Library failures never
 * interrupt the upload itself — the user can still read the extracted text.
 */
export function useLibraryUpload() {
  // The record is created asynchronously, so later callbacks wait on this promise.
  const recordRef = useRef<{ file: File; id: Promise<string | null> } | null>(null);
  const lastProgressRef = useRef(0);
  const completionRef = useRef<Promise<void>>(Promise.resolve());

  function idFor(file: File): Promise<string | null> {
    return recordRef.current?.file === file ? recordRef.current.id : Promise.resolve(null);
  }

  const callbacks: ExtractionCallbacks = {
    onStart(file) {
      lastProgressRef.current = 0;
      const id = isIndexedDbAvailable()
        ? createUploadRecord(file)
            .then((record) => record.id)
            .catch(() => null)
        : Promise.resolve(null);
      recordRef.current = { file, id };
    },
    onProgress(progress) {
      if (progress.progress - lastProgressRef.current < PROGRESS_WRITE_STEP && progress.progress < 1) return;
      lastProgressRef.current = progress.progress;
      const record = recordRef.current;
      if (!record) return;
      void record.id.then((id) => {
        if (id) void updateDocument(id, { processingProgress: progress.progress, pageCount: progress.totalPages || 1 }).catch(() => {});
      });
    },
    onSuccess(file, pages) {
      completionRef.current = idFor(file).then(async (id) => {
        if (!id) return;
        const html = wrapPagesAsHtml(pages.map((page) => splitIntoParagraphs(page)));
        const text = pages.filter(Boolean).join("\n\n");
        const thumbnail = await createThumbnail(file);
        await completeUpload(id, { html, text, pageCount: pages.length, thumbnail }).catch(() => {});
      });
    },
    onError(file, message) {
      void idFor(file).then((id) => {
        if (id) void updateDocument(id, { status: "error", statusMessage: message }).catch(() => {});
      });
    },
  };

  return {
    callbacks,
    /** Library id of the most recent upload, once its record exists (null if unavailable). */
    currentRecordId: (): Promise<string | null> => recordRef.current?.id ?? Promise.resolve(null),
    /** Resolves once the latest successful extraction has been written to the library. */
    whenSaved: (): Promise<void> => completionRef.current,
  };
}
