"use client";

import { useEffect, useState } from "react";
import { formatBytes } from "@/lib/format";

/**
 * Shows the browser's real storage estimate for this site (IndexedDB library etc.).
 * Renders nothing where the Storage API isn't available.
 */
export function StorageMeter() {
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (typeof navigator === "undefined" || !navigator.storage?.estimate) return;
    navigator.storage
      .estimate()
      .then(({ usage, quota }) => {
        if (!cancelled && typeof usage === "number" && typeof quota === "number" && quota > 0) {
          setEstimate({ usage, quota });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!estimate) return null;
  const percent = Math.min(100, (estimate.usage / estimate.quota) * 100);

  return (
    <div className="px-3">
      <p className="text-xs text-muted">
        {formatBytes(estimate.usage)} used in this browser
      </p>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-subtle"
        role="progressbar"
        aria-label="Browser storage used"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(percent, 2)}%` }} />
      </div>
    </div>
  );
}
