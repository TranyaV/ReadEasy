"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_SETTINGS, normalizeSettings, type ReadingSettings } from "@/components/reading/settings";

export type Appearance = "light" | "dark" | "system";

export type ReadAloudPreferences = {
  /** null = let ReadEase pick the best available voice on this device. */
  voiceURI: string | null;
  rate: number;
};

export type ReadingProfile = {
  settings: ReadingSettings;
  readAloud: ReadAloudPreferences;
  appearance: Appearance;
};

import { PROFILE_STORAGE_KEY } from "./appearanceScript";

export { PROFILE_STORAGE_KEY };

export const DEFAULT_PROFILE: ReadingProfile = {
  settings: DEFAULT_SETTINGS,
  readAloud: { voiceURI: null, rate: 1 },
  appearance: "light",
};

export const MIN_RATE = 0.5;
export const MAX_RATE = 2;

function normalizeProfile(raw: unknown): ReadingProfile {
  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const readAloud = input.readAloud && typeof input.readAloud === "object" ? (input.readAloud as Record<string, unknown>) : {};
  const rate = typeof readAloud.rate === "number" && Number.isFinite(readAloud.rate) ? readAloud.rate : 1;
  return {
    settings: normalizeSettings(input.settings),
    readAloud: {
      voiceURI: typeof readAloud.voiceURI === "string" && readAloud.voiceURI ? readAloud.voiceURI : null,
      rate: Math.min(MAX_RATE, Math.max(MIN_RATE, rate)),
    },
    appearance: input.appearance === "dark" || input.appearance === "system" ? input.appearance : "light",
  };
}

let cachedRaw: string | null | undefined;
let cachedProfile: ReadingProfile = DEFAULT_PROFILE;
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(PROFILE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): ReadingProfile {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedProfile = raw ? normalizeProfile(JSON.parse(raw)) : DEFAULT_PROFILE;
    } catch {
      cachedProfile = DEFAULT_PROFILE;
    }
  }
  return cachedProfile;
}

function getServerSnapshot(): ReadingProfile {
  return DEFAULT_PROFILE;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  function onStorage(event: StorageEvent) {
    if (event.key === PROFILE_STORAGE_KEY) listener();
  }
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The saved Reading Profile (defaults until the user saves one). */
export function useReadingProfile(): ReadingProfile {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Reads the profile outside React (e.g. when seeding a newly opened document). */
export function readReadingProfile(): ReadingProfile {
  return typeof window === "undefined" ? DEFAULT_PROFILE : getSnapshot();
}

/** Returns false when the browser refuses to store it (e.g. storage disabled). */
export function saveReadingProfile(profile: ReadingProfile): boolean {
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalizeProfile(profile)));
  } catch {
    return false;
  }
  listeners.forEach((listener) => listener());
  applyAppearance(profile.appearance);
  return true;
}

export function resolveDark(appearance: Appearance): boolean {
  if (appearance === "system") return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  return appearance === "dark";
}

export function applyAppearance(appearance: Appearance): void {
  document.documentElement.classList.toggle("dark", resolveDark(appearance));
}
