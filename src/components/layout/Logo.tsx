import Link from "next/link";
import { BookOpen } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      aria-label="ReadEase home"
    >
      <BookOpen className="h-7 w-7 text-accent" strokeWidth={2} aria-hidden="true" />
      {!compact && <span className="text-xl font-semibold tracking-tight text-foreground">ReadEase</span>}
    </Link>
  );
}
