"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveDocumentForReading } from "@/lib/documentHandoff";
import { prepareDocumentForReading } from "@/lib/library/openDocument";
import { createTextDocument } from "@/lib/library/store";

/** Creates a blank library document and opens it in the workspace. */
export function useCreateDocument() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  async function create() {
    setIsCreating(true);
    try {
      const document = await createTextDocument("Untitled document");
      if (await prepareDocumentForReading(document.id)) {
        router.push("/workspace");
        return;
      }
    } catch {
      // Library unavailable — fall back to an unsaved blank session document.
    }
    saveDocumentForReading({ fileName: null, text: " ", html: "<p><br></p>", title: "Untitled document" });
    router.push("/workspace");
    setIsCreating(false);
  }

  return { create, isCreating };
}
