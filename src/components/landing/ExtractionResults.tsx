"use client";

import { CheckCircle2, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type ExtractionResultsProps = {
  fileName: string | null;
  text: string;
  onTextChange: (text: string) => void;
  onStartReading: () => void;
  onUploadAnother: () => void;
};

export function ExtractionResults({
  fileName,
  text,
  onTextChange,
  onStartReading,
  onUploadAnother,
}: ExtractionResultsProps) {
  return (
    <Card className="flex flex-col gap-5 p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest/10 text-forest">
          <FileText className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{fileName ?? "Extracted document"}</p>
          <p className="flex items-center gap-1.5 text-sm text-forest">
            <CheckCircle2 className="h-4 w-4" />
            Text extracted — review and correct it below
          </p>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        rows={10}
        className="w-full resize-y rounded-2xl border border-border bg-white/60 p-4 font-sans text-sm leading-relaxed text-foreground focus:border-forest focus:outline-none"
        aria-label="Extracted text — edit to correct any OCR mistakes"
      />

      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={onStartReading} disabled={!text.trim()}>
          Start reading
        </Button>
        <Button variant="ghost" onClick={onUploadAnother}>
          Upload a different file
        </Button>
      </div>
    </Card>
  );
}
