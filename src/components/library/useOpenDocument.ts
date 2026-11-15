"use client";

import { useRouter } from "next/navigation";
import { prepareDocumentForReading } from "@/lib/library/openDocument";

/** Opens a library document in the reading workspace. */
export function useOpenDocument() {
  const router = useRouter();
  return async function openDocument(id: string): Promise<boolean> {
    const ok = await prepareDocumentForReading(id);
    if (ok) router.push("/workspace");
    return ok;
  };
}
