"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { extractPagesFromFile } from "@/lib/ocr/engine";
import { OcrError } from "@/lib/ocr/errors";
import type { ExtractionProgress } from "@/lib/ocr/types";
import { validateUploadFile } from "@/lib/ocr/validate";

export type ExtractionStatus = "idle" | "processing" | "success" | "error";

type ExtractionState = {
  status: ExtractionStatus;
  fileName: string | null;
  progress: ExtractionProgress | null;
  text: string;
  /** Recognised text per original page (one entry for images). */
  pages: string[];
  error: string | null;
};

/**
 * Optional lifecycle hooks — used to mirror an upload into the library. They're
 * observers only: the extraction itself behaves exactly the same without them.
 */
export type ExtractionCallbacks = {
  onStart?: (file: File) => void;
  onProgress?: (progress: ExtractionProgress) => void;
  onSuccess?: (file: File, pages: string[]) => void;
  onError?: (file: File, message: string) => void;
};

const INITIAL_STATE: ExtractionState = {
  status: "idle",
  fileName: null,
  progress: null,
  text: "",
  pages: [],
  error: null,
};

export function useDocumentExtraction(callbacks: ExtractionCallbacks = {}) {
  const [state, setState] = useState<ExtractionState>(INITIAL_STATE);
  const activeRequestId = useRef(0);
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  const processFile = useCallback(async (file: File) => {
    const validationError = validateUploadFile(file);
    if (validationError) {
      activeRequestId.current += 1;
      setState({ ...INITIAL_STATE, status: "error", fileName: file.name, error: validationError });
      return;
    }

    const requestId = ++activeRequestId.current;
    setState({ status: "processing", fileName: file.name, progress: null, text: "", pages: [], error: null });
    callbacksRef.current.onStart?.(file);

    try {
      const pages = await extractPagesFromFile(file, (progress) => {
        callbacksRef.current.onProgress?.(progress);
        if (activeRequestId.current !== requestId) return;
        setState((previous) => ({ ...previous, progress }));
      });
      callbacksRef.current.onSuccess?.(file, pages);
      if (activeRequestId.current !== requestId) return;
      const text = pages.filter(Boolean).join("\n\n");
      setState({ status: "success", fileName: file.name, progress: null, text, pages, error: null });
    } catch (error) {
      const message =
        error instanceof OcrError
          ? error.message
          : "Something went wrong while reading this file. Please try again.";
      callbacksRef.current.onError?.(file, message);
      if (activeRequestId.current !== requestId) return;
      setState({ status: "error", fileName: file.name, progress: null, text: "", pages: [], error: message });
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
