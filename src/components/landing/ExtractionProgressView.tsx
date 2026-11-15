import { FileText, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { ExtractionProgress } from "@/lib/ocr/types";

type ExtractionProgressViewProps = {
  fileName: string | null;
  progress: ExtractionProgress | null;
};

export function ExtractionProgressView({ fileName, progress }: ExtractionProgressViewProps) {
  const percent = progress ? Math.round(progress.progress * 100) : 0;
  const message = progress?.message ?? "Preparing…";

  return (
    <Card className="flex flex-col gap-5 p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest/10 text-forest">
          <FileText className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{fileName ?? "Processing document"}</p>
          <p className="text-sm text-foreground/60">Extracting text…</p>
        </div>
        <Loader2 className="ml-auto h-5 w-5 shrink-0 animate-spin text-forest" aria-hidden="true" />
      </div>
      <div>
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 w-full overflow-hidden rounded-full bg-border/60"
        >
          <div
            className="h-full rounded-full bg-forest transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-foreground/60">{message}</p>
      </div>
    </Card>
  );
}
