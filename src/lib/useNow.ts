"use client";

import { useSyncExternalStore } from "react";

let current = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(() => {
      current = Date.now();
      listeners.forEach((notify) => notify());
    }, 30_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function getSnapshot(): number {
  // First client read after hydration; afterwards the interval keeps it fresh.
  if (current === 0) current = Date.now();
  return current;
}

function getServerSnapshot(): number {
  return 0;
}

/**
 * Current time for relative labels ("2 min ago"), refreshed every 30 seconds.
 * Returns 0 during prerendering — callers only render times for client-loaded data.
 */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
