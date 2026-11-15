"use client";

import { useSyncExternalStore } from "react";
import { WorkspaceEditor } from "@/components/workspace/WorkspaceEditor";
import { useStoredDocument } from "@/lib/documentHandoff";

function subscribeToNothing() {
  return () => {};
}
function getTrue() {
  return true;
}
function getFalse() {
  return false;
}

/**
 * The document canvas seeds itself once, permanently, on mount — it never gets a
 * second chance to pick up the "real" stored document if it mounted too early.
 * useStoredDocument() returns null during SSR and on the very first client render
 * (by design, to match server markup), resolving to the real value only once React
 * re-checks after mount. This flips false -> true on that same re-check, so gating
 * the editor's mount on it guarantees the editor only ever seeds from the correct,
 * fully-resolved document — never a placeholder that autosave could then overwrite
 * the real one with.
 */
function useHasHydrated(): boolean {
  return useSyncExternalStore(subscribeToNothing, getTrue, getFalse);
}

export default function WorkspacePage() {
  const hasHydrated = useHasHydrated();
  const storedDocument = useStoredDocument();

  return hasHydrated ? (
    <WorkspaceEditor key={storedDocument?.documentId ?? "session"} storedDocument={storedDocument} />
  ) : (
    <WorkspaceSkeleton />
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="flex h-dvh flex-col bg-background" aria-busy="true" aria-label="Loading document">
      <div className="h-16 border-b border-border bg-surface" />
      <div className="flex flex-1">
        <div className="hidden w-[18rem] border-r border-border bg-surface lg:block" />
        <div className="mx-auto mt-6 h-[70vh] w-full max-w-3xl rounded-2xl border border-border bg-surface" />
        <div className="hidden w-[22rem] border-l border-border bg-surface xl:block" />
      </div>
    </div>
  );
}
