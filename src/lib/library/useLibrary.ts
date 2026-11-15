"use client";

import { useEffect, useState } from "react";
import { isIndexedDbAvailable } from "./db";
import { listDocuments, listFolders, subscribeToLibrary } from "./store";
import type { LibraryDocument, LibraryFolder } from "./types";

export type LibraryState = {
  status: "loading" | "ready" | "unavailable";
  documents: LibraryDocument[];
  folders: LibraryFolder[];
};

const INITIAL: LibraryState = { status: "loading", documents: [], folders: [] };

/** Live view of the browser-local library; re-reads whenever any tab changes it. */
export function useLibrary(): LibraryState {
  const [state, setState] = useState<LibraryState>(INITIAL);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isIndexedDbAvailable()) {
        if (!cancelled) setState({ status: "unavailable", documents: [], folders: [] });
        return;
      }
      try {
        const [documents, folders] = await Promise.all([listDocuments(), listFolders()]);
        if (!cancelled) setState({ status: "ready", documents, folders });
      } catch {
        if (!cancelled) setState({ status: "unavailable", documents: [], folders: [] });
      }
    }

    void load();
    const unsubscribe = subscribeToLibrary(() => void load());
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return state;
}

export function byLastOpened(a: LibraryDocument, b: LibraryDocument): number {
  return (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0);
}

/** Most recent activity of any kind: opened, edited or uploaded. */
export function lastActivity(document: LibraryDocument): number {
  return Math.max(document.lastOpenedAt ?? 0, document.updatedAt, document.createdAt);
}

export function byLastActivity(a: LibraryDocument, b: LibraryDocument): number {
  return lastActivity(b) - lastActivity(a);
}
