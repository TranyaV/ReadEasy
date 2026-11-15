import { CircleHelp, Clock, FolderOpen, Home, Settings, SlidersHorizontal, Star, Upload, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** The single source of navigation for every page, including the workspace's compact rail. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/library", label: "My Library", icon: FolderOpen },
  { href: "/starred", label: "Starred", icon: Star },
  { href: "/recent", label: "Recent", icon: Clock },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/profile", label: "Reading Profile", icon: SlidersHorizontal },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help & Support", icon: CircleHelp },
];

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
