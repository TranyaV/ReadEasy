import type { ReadingSettings } from "@/components/reading/settings";

export type DocumentKind = "pdf" | "image" | "text";
export type DocumentStatus = "processing" | "ready" | "error";

/** Lightweight metadata — everything lists, search and the dashboard need. */
export type LibraryDocument = {
  id: string;
  title: string;
  /** Original upload filename; null for documents created in ReadEase. */
  fileName: string | null;
  kind: DocumentKind;
  /** Short type label shown in lists: PDF, PNG, JPG, TEXT. */
  typeLabel: string;
  /** Original file size in bytes, or the text size for created documents. */
  size: number;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number | null;
  status: DocumentStatus;
  /** 0–1 OCR progress while processing. */
  processingProgress?: number;
  statusMessage?: string;
  pageCount: number;
  /** Last reading position: page (1-based) and how far through the document (0–1). */
  readingProgress: { page: number; ratio: number } | null;
  starred: boolean;
  folderId: string | null;
  hasOriginal: boolean;
  /** Small PNG data URL of the first page, generated locally at upload. */
  thumbnail?: string;
  /** Per-document reading adjustments; absent means "use the Reading Profile". */
  readingSettings?: ReadingSettings;
};

export type DocumentContent = {
  id: string;
  html: string;
  text: string;
};

export type StoredFile = {
  id: string;
  blob: Blob;
  name: string;
  type: string;
};

export type LibraryFolder = {
  id: string;
  name: string;
  createdAt: number;
};

/** A processing record that hasn't reported progress for this long is treated as interrupted. */
export const PROCESSING_STALE_MS = 2 * 60 * 1000;

export function isInterrupted(document: LibraryDocument, now: number = Date.now()): boolean {
  return document.status === "processing" && now - document.updatedAt > PROCESSING_STALE_MS;
}
