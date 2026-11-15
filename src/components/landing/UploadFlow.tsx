"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { useLibraryUpload } from "@/components/upload/useLibraryUpload";
import { saveDocumentForReading } from "@/lib/documentHandoff";
import { prepareDocumentForReading } from "@/lib/library/openDocument";
import { saveDocumentContent } from "@/lib/library/store";
import { wrapPlainTextAsHtml } from "@/lib/richtext/domText";
import { splitIntoParagraphs } from "@/lib/text/paragraphs";
import { ExtractionProgressView } from "./ExtractionProgressView";
import { ExtractionResults } from "./ExtractionResults";
import { useDocumentExtraction } from "./useDocumentExtraction";

export function UploadFlow() {
  const router = useRouter();
  const libraryUpload = useLibraryUpload();
  const { state, processFile, updateText, reset } = useDocumentExtraction(libraryUpload.callbacks);
  const [isOpening, setIsOpening] = useState(false);

  async function handleStartReading() {
    setIsOpening(true);
    try {
      await libraryUpload.whenSaved();
      const id = await libraryUpload.currentRecordId();
      if (id) {
        // Corrections made in the review box replace the OCR text. The page markers
        // can't be mapped onto freely edited text, so edited documents read as one flow.
        const originalText = state.pages.filter(Boolean).join("\n\n");
        if (state.text !== originalText) {
          await saveDocumentContent(id, {
            html: wrapPlainTextAsHtml(splitIntoParagraphs(state.text)),
            text: state.text,
          });
        }
        if (await prepareDocumentForReading(id)) {
          router.push("/workspace");
          return;
        }
      }
    } catch {
      // Fall through to the session-only handoff below.
    }
    // Library unavailable (e.g. private browsing): read it without saving, as before.
    saveDocumentForReading({ fileName: state.fileName, text: state.text });
    router.push("/workspace");
  }

  if (state.status === "processing") {
    return <ExtractionProgressView fileName={state.fileName} progress={state.progress} />;
  }

  if (state.status === "success") {
    return (
      <ExtractionResults
        fileName={state.fileName}
        text={state.text}
        onTextChange={updateText}
        onStartReading={() => void handleStartReading()}
        onUploadAnother={reset}
        isOpening={isOpening}
      />
    );
  }

  return <UploadDropzone onFileSelected={processFile} errorMessage={state.status === "error" ? state.error : null} />;
}
