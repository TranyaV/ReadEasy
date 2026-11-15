import { STORES, getAll, getOne, writeTransaction } from "./db";
import type { DocumentContent, DocumentKind, LibraryDocument, LibraryFolder, StoredFile } from "./types";

/* ---------------------------------------------------------------- change events */

type Listener = () => void;
const listeners = new Set<Listener>();
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  if (!channel) {
    channel = new BroadcastChannel("readease-library");
    channel.onmessage = () => listeners.forEach((listener) => listener());
  }
  return channel;
}

/** Subscribe to library changes from this tab and other tabs. */
export function subscribeToLibrary(listener: Listener): () => void {
  getChannel();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyChange() {
  listeners.forEach((listener) => listener());
  getChannel()?.postMessage("changed");
}

/* ---------------------------------------------------------------- helpers */

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function kindAndLabelForFile(file: File): { kind: DocumentKind; typeLabel: string } {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return { kind: "pdf", typeLabel: "PDF" };
  if (file.type === "image/png" || name.endsWith(".png")) return { kind: "image", typeLabel: "PNG" };
  return { kind: "image", typeLabel: "JPG" };
}

function titleFromFileName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  return withoutExtension.trim() || fileName;
}

/* ---------------------------------------------------------------- reads */

export async function listDocuments(): Promise<LibraryDocument[]> {
  return getAll<LibraryDocument>(STORES.documents);
}

export async function listFolders(): Promise<LibraryFolder[]> {
  const folders = await getAll<LibraryFolder>(STORES.folders);
  return folders.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getDocument(id: string): Promise<LibraryDocument | undefined> {
  return getOne<LibraryDocument>(STORES.documents, id);
}

export async function getDocumentContent(id: string): Promise<DocumentContent | undefined> {
  return getOne<DocumentContent>(STORES.contents, id);
}

export async function getOriginalFile(id: string): Promise<StoredFile | undefined> {
  return getOne<StoredFile>(STORES.files, id);
}

/* ---------------------------------------------------------------- document writes */

/** Creates a "processing" record for an upload and stores the original file alongside it. */
export async function createUploadRecord(file: File): Promise<LibraryDocument> {
  const now = Date.now();
  const { kind, typeLabel } = kindAndLabelForFile(file);
  const document: LibraryDocument = {
    id: createId(),
    title: titleFromFileName(file.name),
    fileName: file.name,
    kind,
    typeLabel,
    size: file.size,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: null,
    status: "processing",
    processingProgress: 0,
    pageCount: 1,
    readingProgress: null,
    starred: false,
    folderId: null,
    hasOriginal: true,
  };
  const stored: StoredFile = { id: document.id, blob: file, name: file.name, type: file.type };
  await writeTransaction([STORES.documents, STORES.files], (tx) => {
    tx.objectStore(STORES.documents).put(document);
    tx.objectStore(STORES.files).put(stored);
  });
  notifyChange();
  return document;
}

/** Creates a blank (or pre-filled) document made in ReadEase rather than uploaded. */
export async function createTextDocument(title: string, html = "<p><br></p>", text = ""): Promise<LibraryDocument> {
  const now = Date.now();
  const document: LibraryDocument = {
    id: createId(),
    title,
    fileName: null,
    kind: "text",
    typeLabel: "TEXT",
    size: new Blob([html]).size,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: null,
    status: "ready",
    pageCount: 1,
    readingProgress: null,
    starred: false,
    folderId: null,
    hasOriginal: false,
  };
  await writeTransaction([STORES.documents, STORES.contents], (tx) => {
    tx.objectStore(STORES.documents).put(document);
    tx.objectStore(STORES.contents).put({ id: document.id, html, text } satisfies DocumentContent);
  });
  notifyChange();
  return document;
}

/** Read-modify-write inside one transaction so concurrent patches can't clobber each other. */
export async function updateDocument(
  id: string,
  patch: Partial<Omit<LibraryDocument, "id">> | ((current: LibraryDocument) => Partial<Omit<LibraryDocument, "id">>),
  options: { touch?: boolean; silent?: boolean } = {},
): Promise<void> {
  await writeTransaction([STORES.documents], (tx) => {
    const store = tx.objectStore(STORES.documents);
    const request = store.get(id);
    request.onsuccess = () => {
      const current = request.result as LibraryDocument | undefined;
      if (!current) return;
      const changes = typeof patch === "function" ? patch(current) : patch;
      const next: LibraryDocument = { ...current, ...changes, id };
      if (options.touch !== false) next.updatedAt = Date.now();
      store.put(next);
    };
  });
  if (!options.silent) notifyChange();
}

/** Saves edited content (autosave) and keeps the size/title metadata in step. */
export async function saveDocumentContent(id: string, content: { html: string; text: string; title?: string }): Promise<void> {
  await writeTransaction([STORES.documents, STORES.contents], (tx) => {
    tx.objectStore(STORES.contents).put({ id, html: content.html, text: content.text } satisfies DocumentContent);
    const store = tx.objectStore(STORES.documents);
    const request = store.get(id);
    request.onsuccess = () => {
      const current = request.result as LibraryDocument | undefined;
      if (!current) return;
      const next: LibraryDocument = { ...current, updatedAt: Date.now() };
      if (content.title !== undefined && content.title.trim()) next.title = content.title.trim();
      if (!current.hasOriginal) next.size = new Blob([content.html]).size;
      store.put(next);
    };
  });
  notifyChange();
}

/** Completes OCR for an upload record. */
export async function completeUpload(
  id: string,
  content: { html: string; text: string; pageCount: number; thumbnail?: string },
): Promise<void> {
  await writeTransaction([STORES.documents, STORES.contents], (tx) => {
    tx.objectStore(STORES.contents).put({ id, html: content.html, text: content.text } satisfies DocumentContent);
    const store = tx.objectStore(STORES.documents);
    const request = store.get(id);
    request.onsuccess = () => {
      const current = request.result as LibraryDocument | undefined;
      if (!current) return;
      store.put({
        ...current,
        status: "ready",
        processingProgress: 1,
        statusMessage: undefined,
        pageCount: Math.max(1, content.pageCount),
        thumbnail: content.thumbnail ?? current.thumbnail,
        updatedAt: Date.now(),
      } satisfies LibraryDocument);
    };
  });
  notifyChange();
}

export async function markOpened(id: string): Promise<void> {
  await updateDocument(id, { lastOpenedAt: Date.now() }, { touch: false });
}

export async function renameDocument(id: string, title: string): Promise<void> {
  const trimmed = title.trim();
  if (!trimmed) return;
  await updateDocument(id, { title: trimmed });
}

export async function setStarred(id: string, starred: boolean): Promise<void> {
  await updateDocument(id, { starred }, { touch: false });
}

export async function moveToFolder(id: string, folderId: string | null): Promise<void> {
  await updateDocument(id, { folderId }, { touch: false });
}

export async function deleteDocument(id: string): Promise<void> {
  await writeTransaction([STORES.documents, STORES.contents, STORES.files], (tx) => {
    tx.objectStore(STORES.documents).delete(id);
    tx.objectStore(STORES.contents).delete(id);
    tx.objectStore(STORES.files).delete(id);
  });
  notifyChange();
}

/* ---------------------------------------------------------------- folders */

export async function createFolder(name: string): Promise<LibraryFolder | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const folder: LibraryFolder = { id: createId(), name: trimmed, createdAt: Date.now() };
  await writeTransaction([STORES.folders], (tx) => {
    tx.objectStore(STORES.folders).put(folder);
  });
  notifyChange();
  return folder;
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  await writeTransaction([STORES.folders], (tx) => {
    const store = tx.objectStore(STORES.folders);
    const request = store.get(id);
    request.onsuccess = () => {
      const current = request.result as LibraryFolder | undefined;
      if (current) store.put({ ...current, name: trimmed });
    };
  });
  notifyChange();
}

/** Deletes a folder; its documents are kept and moved back to the top level. */
export async function deleteFolder(id: string): Promise<void> {
  const documents = await listDocuments();
  await writeTransaction([STORES.folders, STORES.documents], (tx) => {
    tx.objectStore(STORES.folders).delete(id);
    const store = tx.objectStore(STORES.documents);
    for (const document of documents) {
      if (document.folderId === id) store.put({ ...document, folderId: null });
    }
  });
  notifyChange();
}

/** Removes every document, file and folder from this browser. */
export async function clearLibrary(): Promise<void> {
  await writeTransaction([STORES.documents, STORES.contents, STORES.files, STORES.folders], (tx) => {
    tx.objectStore(STORES.documents).clear();
    tx.objectStore(STORES.contents).clear();
    tx.objectStore(STORES.files).clear();
    tx.objectStore(STORES.folders).clear();
  });
  notifyChange();
}
