"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CircleHelp, Menu, X } from "lucide-react";
import Link from "next/link";
import { GlobalSearch } from "@/components/library/GlobalSearch";
import { Logo } from "./Logo";
import { SideNav } from "./SideNav";

export const iconButtonClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

/** Shared chrome for every page except the reading workspace: top bar + main navigation. */
export function AppShell({ children }: { children: ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile drawer whenever the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setIsDrawerOpen(false);
  }

  useEffect(() => {
    if (!isDrawerOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setIsDrawerOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDrawerOpen]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur sm:px-6">
        <button
          type="button"
          className={`${iconButtonClass} lg:hidden`}
          aria-label="Open navigation"
          aria-expanded={isDrawerOpen}
          onClick={() => setIsDrawerOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="lg:w-[216px]">
          <Logo />
        </div>
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 lg:ml-6 lg:justify-between">
          <GlobalSearch />
          <Link href="/help" className={`${iconButtonClass} hidden sm:flex`} aria-label="Help & Support">
            <CircleHelp className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 border-r border-border bg-surface lg:block">
          <SideNav />
        </aside>

        {isDrawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-foreground/30"
              onClick={() => setIsDrawerOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-xl">
              <div className="flex h-16 items-center justify-between border-b border-border px-4">
                <Logo />
                <button type="button" className={iconButtonClass} aria-label="Close navigation" onClick={() => setIsDrawerOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <SideNav onNavigate={() => setIsDrawerOpen(false)} />
              </div>
            </div>
          </div>
        )}

        <main id="main-content" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

/** Consistent page padding + heading block for pages inside the AppShell. */
export function PageContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 lg:px-12 lg:py-10 ${className}`}>{children}</div>;
}

export function PageHeading({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2.1rem]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-base text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}
