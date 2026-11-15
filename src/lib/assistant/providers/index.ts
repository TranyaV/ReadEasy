import "server-only";

import type { AIProvider } from "../providerInterface";
import { DEFAULT_GEMINI_MODEL, GeminiProvider } from "./gemini";

let cached: AIProvider | null = null;

/**
 * Returns the configured provider, or null when its server-only key is missing.
 * Reads process.env only — never a NEXT_PUBLIC_ variable, so nothing is bundled
 * into client JavaScript.
 */
export function getConfiguredProvider(): AIProvider | null {
  if (cached) return cached;
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  cached = new GeminiProvider(apiKey, model);
  return cached;
}
