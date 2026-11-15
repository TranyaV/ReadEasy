"use client";

import { useEffect } from "react";
import { applyAppearance, useReadingProfile } from "@/lib/profile/readingProfile";

/** Keeps the light/dark class in step with the saved profile and, for "Match device", the OS. */
export function AppearanceSync() {
  const { appearance } = useReadingProfile();

  useEffect(() => {
    applyAppearance(appearance);
    if (appearance !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyAppearance("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [appearance]);

  return null;
}
