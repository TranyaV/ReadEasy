import { createWorker } from "tesseract.js";
import { OcrError } from "./errors";
import { canvasToBlob, loadPdfDocument, renderPdfPageToCanvas } from "./pdf";
import type { ExtractionProgress } from "./types";
import { isImageFile, isPdfFile, validateUploadFile } from "./validate";

export type ProgressCallback = (progress: ExtractionProgress) => void;

/**
 * Joins per-page OCR output into one text, exactly as the original single-string
 * extraction did. Kept for callers that only need the combined text.
 */
export async function extractTextFromFile(file: File, onProgress: ProgressCallback): Promise<string> {
  const pages = await extractPagesFromFile(file, onProgress);
  return pages.filter(Boolean).join("\n\n");
}

/**
 * OCRs a file and returns the recognised text of each page (one entry for an image).
 * Empty pages are kept as "" so page numbers stay aligned with the original file.
 */
export async function extractPagesFromFile(file: File, onProgress: ProgressCallback): Promise<string[]> {
  const validationError = validateUploadFile(file);
  if (validationError) {
    throw new OcrError(validationError);
  }

  const pageState = { current: 1, total: 1 };

  let worker;
  try {
    worker = await createWorker("eng", 1, {
      logger: (message) => {
        if (message.status !== "recognizing text") return;
        const total = pageState.total;
        onProgress({
          stage: "recognizing-text",
          currentPage: pageState.current,
          totalPages: total,
          progress: (pageState.current - 1 + message.progress) / total,
          message: total > 1 ? `Reading page ${pageState.current} of ${total}…` : "Reading text from the image…",
        });
      },
    });
  } catch {
    throw new OcrError("The OCR engine could not start. Please check your connection and try again.");
  }

  try {
    if (isImageFile(file)) {
      onProgress({
        stage: "recognizing-text",
        currentPage: 1,
        totalPages: 1,
        progress: 0,
        message: "Reading text from the image…",
      });
      const { data } = await worker.recognize(file);
      const text = data.text.trim();
      if (!text) {
        throw new OcrError("No readable text was found in this image.");
      }
      return [text];
    }

    if (!isPdfFile(file)) {
      throw new OcrError("Unsupported file type. Please upload a PNG, JPG or PDF file.");
    }

    onProgress({ stage: "loading-document", currentPage: 0, totalPages: 1, progress: 0, message: "Opening PDF…" });
    const pdf = await loadPdfDocument(file);
    pageState.total = pdf.numPages;

    const canvas = document.createElement("canvas");
    const pageTexts: string[] = [];

    try {
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        pageState.current = pageNumber;
        onProgress({
          stage: "rendering-page",
          currentPage: pageNumber,
          totalPages: pdf.numPages,
          progress: (pageNumber - 1) / pdf.numPages,
          message: `Rendering page ${pageNumber} of ${pdf.numPages}…`,
        });

        await renderPdfPageToCanvas(pdf, pageNumber, canvas);
        const blob = await canvasToBlob(canvas);
        const { data } = await worker.recognize(blob);
        pageTexts.push(data.text.trim());
      }
    } finally {
      await pdf.loadingTask.destroy();
    }

    if (!pageTexts.some(Boolean)) {
      throw new OcrError("No readable text was found in this PDF.");
    }
    return pageTexts;
  } finally {
    await worker.terminate();
  }
}
