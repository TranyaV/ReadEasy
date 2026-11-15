"use client";

import { loadPdfDocument, renderPdfPageToCanvas } from "@/lib/ocr/pdf";

const THUMBNAIL_MAX = 240;

/** Renders one PDF page to a small PNG data URL. */
export async function renderPdfThumbnail(file: Blob, pageNumber: number, maxDimension = THUMBNAIL_MAX): Promise<string> {
  const pdf = await loadPdfDocument(file);
  try {
    const canvas = document.createElement("canvas");
    await renderPdfPageToCanvas(pdf, Math.min(Math.max(1, pageNumber), pdf.numPages), canvas, maxDimension);
    return canvas.toDataURL("image/png");
  } finally {
    await pdf.loadingTask.destroy();
  }
}

/** Downscales an image file to a small PNG data URL. */
export async function renderImageThumbnail(file: Blob, maxDimension = THUMBNAIL_MAX): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not available.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    bitmap.close();
  }
}

/** Best-effort first-page thumbnail; resolves undefined rather than failing an upload. */
export async function createThumbnail(file: File): Promise<string | undefined> {
  try {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    return isPdf ? await renderPdfThumbnail(file, 1) : await renderImageThumbnail(file);
  } catch {
    return undefined;
  }
}
