"use client";

import { useCallback, useRef, useState } from "react";
import { extractTextFromFile } from "@/lib/ocr/engine";
import { OcrError } from "@/lib/ocr/errors";
import type { ExtractionProgress } from "@/lib/ocr/types";
import { validateUploadFile } from "@/lib/ocr/validate";

export type ExtractionStatus = "idle" | "processing" | "success" | "error";

type ExtractionState = {
  status: ExtractionStatus;
  fileName: string | null;
  progress: ExtractionProgress | null;
  text: string;
  error: string | null;
};

const INITIAL_STATE: ExtractionState = {
  status: "idle",
  fileName: null,
  progress: null,
  text: "",
  error: null,
};

export function useDocumentExtraction() {
  const [state, setState] = useState<ExtractionState>(INITIAL_STATE);
  const activeRequestId = useRef(0);

  const processFile = useCallback(async (file: File) => {
    const validationError = validateUploadFile(file);
    if (validationError) {
      activeRequestId.current += 1;
      setState({ ...INITIAL_STATE, status: "error", fileName: file.name, error: validationError });
      return;
    }

    const requestId = ++activeRequestId.current;
    setState({ status: "processing", fileName: file.name, progress: null, text: "", error: null });

    try {
      const text = await extractTextFromFile(file, (progress) => {
        if (activeRequestId.current !== requestId) return;
        setState((previous) => ({ ...previous, progress }));
      });
      if (activeRequestId.current !== requestId) return;
      setState({ status: "success", fileName: file.name, progress: null, text, error: null });
    } catch (error) {
      if (activeRequestId.current !== requestId) return;
      const message =
        error instanceof OcrError
          ? error.message
          : "Something went wrong while reading this file. Please try again.";
      setState({ status: "error", fileName: file.name, progress: null, text: "", error: message });
    }
  }, []);

  const updateText = useCallback((text: string) => {
    setState((previous) => ({ ...previous, text }));
  }, []);

  const reset = useCallback(() => {
    activeRequestId.current += 1;
    setState(INITIAL_STATE);
  }, []);

  return { state, processFile, updateText, reset };
}
