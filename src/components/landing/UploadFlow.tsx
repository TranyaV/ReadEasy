"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { clearDocumentForReading, saveDocumentForReading } from "@/lib/documentHandoff";
import { ExtractionProgressView } from "./ExtractionProgressView";
import { ExtractionResults } from "./ExtractionResults";
import { useDocumentExtraction } from "./useDocumentExtraction";

export function UploadFlow() {
  const router = useRouter();
  const { state, processFile, updateText, reset } = useDocumentExtraction();

  function handleStartReading() {
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
        onStartReading={handleStartReading}
        onUploadAnother={reset}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <UploadDropzone
        onFileSelected={processFile}
        errorMessage={state.status === "error" ? state.error : null}
      />
      <div className="flex flex-wrap items-center gap-4">
        <Button href="/workspace" variant="secondary" size="lg" onClick={clearDocumentForReading}>
          Try a sample
        </Button>
        <span className="text-sm text-foreground/50">No upload needed</span>
      </div>
    </div>
  );
}
