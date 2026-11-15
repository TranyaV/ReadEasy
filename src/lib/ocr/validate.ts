const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

const ACCEPTED_MIME_TYPES = new Set(["image/png", "image/jpeg", "application/pdf"]);
const ACCEPTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".pdf"];

function getExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex === -1 ? "" : fileName.slice(dotIndex).toLowerCase();
}

export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || getExtension(file.name) === ".pdf";
}

export function isImageFile(file: File): boolean {
  return file.type === "image/png" || file.type === "image/jpeg" || [".png", ".jpg", ".jpeg"].includes(getExtension(file.name));
}

/** Returns an error message when the file is not usable, or null when it is valid. */
export function validateUploadFile(file: File): string | null {
  const hasAcceptedType = ACCEPTED_MIME_TYPES.has(file.type);
  const hasAcceptedExtension = ACCEPTED_EXTENSIONS.includes(getExtension(file.name));

  if (!hasAcceptedType && !hasAcceptedExtension) {
    return "Unsupported file type. Please upload a PNG, JPG or PDF file.";
  }

  if (file.size === 0) {
    return "This file appears to be empty.";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "This file is too large. Please upload a file under 25MB.";
  }

  return null;
}
