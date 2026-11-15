import type { PDFDocumentProxy } from "pdfjs-dist";
import { OcrError } from "./errors";

const MAX_RENDER_DIMENSION = 2200;
const TARGET_SCALE = 2;

let workerConfigured = false;

async function loadPdfjs() {
  const pdfjsLib = await import("pdfjs-dist");
  if (!workerConfigured) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    workerConfigured = true;
  }
  return pdfjsLib;
}

export async function loadPdfDocument(file: Blob): Promise<PDFDocumentProxy> {
  const pdfjsLib = await loadPdfjs();
  const data = await file.arrayBuffer();

  try {
    return await pdfjsLib.getDocument({ data }).promise;
  } catch {
    throw new OcrError("This PDF could not be opened. It may be corrupted or password-protected.");
  }
}

/** Renders one page into the given canvas, scaled to stay within a bounded memory footprint. */
export async function renderPdfPageToCanvas(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  /** Longest side in pixels. Defaults to the OCR render size; thumbnails pass a smaller value. */
  maxDimension: number = MAX_RENDER_DIMENSION,
): Promise<void> {
  const page = await pdf.getPage(pageNumber);

  try {
    const baseViewport = page.getViewport({ scale: 1 });
    const longestSide = Math.max(baseViewport.width, baseViewport.height);
    const scale = longestSide * TARGET_SCALE > maxDimension ? maxDimension / longestSide : TARGET_SCALE;
    const viewport = page.getViewport({ scale });

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    if (!canvas.getContext("2d")) {
      throw new OcrError("This browser does not support the canvas rendering ReadEase needs for PDF extraction.");
    }

    await page.render({ canvas, viewport }).promise;
  } finally {
    page.cleanup();
  }
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new OcrError("Failed to prepare a rendered page for text recognition."));
    }, "image/png");
  });
}
