"use client";

import { saveDocumentForReading } from "@/lib/documentHandoff";
import { getDocument, getDocumentContent, markOpened } from "./store";

/**
 * Hands a library document to the workspace through the existing active-document
 * handoff (sessionStorage), tagged with its library id so autosave writes back to it.
 * Returns false if the document can't be opened (missing, still processing, failed).
 */
export async function prepareDocumentForReading(id: string): Promise<boolean> {
  const [document, content] = await Promise.all([getDocument(id), getDocumentContent(id)]);
  if (!document || !content || document.status !== "ready") return false;

  saveDocumentForReading({
    documentId: document.id,
    fileName: document.fileName,
    text: content.text,
    html: content.html,
    title: document.title,
  });
  await markOpened(id);
  return true;
}
