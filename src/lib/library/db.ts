/**
 * Minimal promise wrapper around IndexedDB — no dependency needed for four stores.
 * Browser-only: every function here must be called from client code after mount.
 */

const DB_NAME = "readease-library";
const DB_VERSION = 1;

export const STORES = {
  documents: "documents",
  contents: "contents",
  files: "files",
  folders: "folders",
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

export function isIndexedDbAvailable(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

export function openLibraryDb(): Promise<IDBDatabase> {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(new Error("IndexedDB is not available in this browser."));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of Object.values(STORES)) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      // Another tab upgraded the schema: close so it can proceed; reopen lazily next time.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error("Could not open the document library."));
    };
    request.onblocked = () => {
      // Resolves once the other connection closes; nothing to do here.
    };
  });
  return dbPromise;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await openLibraryDb();
  return requestToPromise(db.transaction(store, "readonly").objectStore(store).getAll() as IDBRequest<T[]>);
}

export async function getOne<T>(store: StoreName, id: string): Promise<T | undefined> {
  const db = await openLibraryDb();
  return requestToPromise(db.transaction(store, "readonly").objectStore(store).get(id) as IDBRequest<T | undefined>);
}

/** Runs several puts/deletes across stores atomically. */
export async function writeTransaction(
  stores: StoreName[],
  work: (tx: IDBTransaction) => void,
): Promise<void> {
  const db = await openLibraryDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("The library update was cancelled."));
    work(tx);
  });
}
