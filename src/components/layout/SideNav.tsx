"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV, SECONDARY_NAV, isActivePath, type NavItem } from "./navigation";
import { StorageMeter } from "./StorageMeter";

type SideNavProps = {
  /** Icon-only rail, used beside the workspace's page panel. */
  compact?: boolean;
  onNavigate?: () => void;
};

function NavLink({ item, compact, active, onNavigate }: { item: NavItem; compact: boolean; active: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={compact ? item.label : undefined}
      aria-label={compact ? item.label : undefined}
      className={`flex items-center gap-3 rounded-xl text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
        compact ? "h-11 w-11 justify-center" : "px-3 py-2.5"
      } ${active ? "bg-accent-soft font-medium text-accent" : "text-foreground/80 hover:bg-subtle hover:text-foreground"}`}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
      {!compact && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

export function SideNav({ compact = false, onNavigate }: SideNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className={`flex h-full flex-col ${compact ? "items-center px-2 py-4" : "px-4 py-5"}`}>
      <ul className={`flex flex-col gap-1 ${compact ? "items-center" : ""}`}>
        {PRIMARY_NAV.map((item) => (
          <li key={item.href}>
            <NavLink item={item} compact={compact} active={isActivePath(pathname, item.href)} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>

      <div className={`mt-auto flex flex-col gap-4 pt-6 ${compact ? "items-center" : ""}`}>
        {!compact && <StorageMeter />}
        <ul className={`flex flex-col gap-1 ${compact ? "items-center" : "border-t border-border pt-4"}`}>
          {SECONDARY_NAV.map((item) => (
            <li key={item.href}>
              <NavLink item={item} compact={compact} active={isActivePath(pathname, item.href)} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
