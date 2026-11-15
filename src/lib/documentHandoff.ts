import { useSyncExternalStore } from "react";

const STORAGE_KEY = "eyeread:document";

export type StoredDocument = {
  /** Library (IndexedDB) id when the document lives in My Library; absent for the sample. */
  documentId?: string;
  fileName: string | null;
  text: string;
  /** Sanitized rich-text HTML from the document editor, if the document has ever been formatted. */
  html?: string;
  /** User-editable document title, independent of the original uploaded filename. */
  title?: string;
};

export function saveDocumentForReading(document: StoredDocument): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(document));
}

export function clearDocumentForReading(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

function parseStoredDocument(raw: string): StoredDocument | null {
  try {
    const parsed = JSON.parse(raw) as StoredDocument;
    if (typeof parsed.text !== "string") return null;
    const documentId = typeof parsed.documentId === "string" && parsed.documentId ? parsed.documentId : undefined;
    // A library document may legitimately be empty (a new blank document); anything
    // else without text is treated as no document.
    if (!parsed.text.trim() && !documentId) return null;

    const html = typeof parsed.html === "string" ? parsed.html : undefined;
    const title = typeof parsed.title === "string" ? parsed.title : undefined;

    return { documentId, fileName: parsed.fileName ?? null, text: parsed.text, html, title };
  } catch {
    return null;
  }
}

let cachedRaw: string | null = null;
let cachedValue: StoredDocument | null = null;

function getSnapshot(): StoredDocument | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = raw ? parseStoredDocument(raw) : null;
  }
  return cachedValue;
}

function getServerSnapshot(): StoredDocument | null {
  return null;
}

function subscribe(): () => void {
  return () => {};
}

/** Reads the document handed off from the upload flow, if any. SSR-safe: returns null until mounted in the browser. */
export function useStoredDocument(): StoredDocument | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
