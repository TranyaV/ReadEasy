import Link from "next/link";
import { Eye } from "lucide-react";

type HeaderAction = {
  label: string;
  href: string;
};

type HeaderProps = {
  eyebrow?: string;
  action?: HeaderAction;
};

export function Header({ eyebrow, action }: HeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 py-6 sm:py-8">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest text-background">
          <Eye className="h-4 w-4" />
        </span>
        <span className="font-serif text-xl tracking-tight text-foreground">EyeRead</span>
      </Link>
      <div className="flex items-center gap-5">
        {eyebrow && (
          <span className="hidden text-xs font-medium uppercase tracking-[0.18em] text-foreground/45 sm:inline">
            {eyebrow}
          </span>
        )}
        {action && (
          <Link
            href={action.href}
            className="text-sm font-medium text-forest transition-colors hover:text-forest-dark"
          >
            {action.label}
          </Link>
        )}
      </div>
    </header>
  );
}
