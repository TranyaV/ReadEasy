"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { AlertCircle, FileUp, FileText } from "lucide-react";

type UploadDropzoneProps = {
  onFileSelected: (file: File) => void;
  errorMessage?: string | null;
};

export function UploadDropzone({ onFileSelected, errorMessage }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) onFileSelected(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleFiles(event.target.files);
    event.target.value = "";
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors duration-200 sm:py-14 ${
          isDragging ? "border-accent bg-accent-soft/60" : "border-accent/40 bg-surface"
        }`}
      >
        <span className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <FileText className="h-10 w-10" strokeWidth={1.5} aria-hidden="true" />
          <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-on-accent ring-4 ring-surface">
            <FileUp className="h-4 w-4" aria-hidden="true" />
          </span>
        </span>
        <div>
          <p className="text-xl font-semibold text-foreground sm:text-2xl">Drag and drop your file here</p>
          <p className="mt-1 text-muted">Or choose a file from your device</p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-[15px] font-medium text-on-accent shadow-sm transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2"
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          Browse files
        </button>
        <p className="text-sm text-muted">Supports PDF, PNG, JPG and JPEG (up to 25 MB)</p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
      {errorMessage && (
        <p className="flex items-center gap-2 text-sm text-error" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMessage}
        </p>
      )}
    </div>
  );
}
