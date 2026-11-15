"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { AlertCircle, FileText, Image as ImageIcon, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";

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
        className={`flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-colors duration-200 ${
          isDragging ? "border-forest bg-sage-soft/60" : "border-border bg-white/40"
        }`}
      >
        <div className="flex items-center gap-3 text-forest">
          <UploadCloud className="h-7 w-7" />
          <FileText className="h-6 w-6 opacity-70" />
          <ImageIcon className="h-6 w-6 opacity-70" />
        </div>
        <div>
          <p className="font-medium text-foreground">Drag and drop a document or image</p>
          <p className="text-sm text-foreground/60">Supports PDF, PNG and JPG files</p>
        </div>
        <Button variant="secondary" size="md" onClick={() => inputRef.current?.click()}>
          Browse files
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
      {errorMessage && (
        <p className="flex items-center gap-2 text-sm text-error">
          <AlertCircle className="h-4 w-4" />
          {errorMessage}
        </p>
      )}
    </div>
  );
}
