/**
 * Best-effort preference order for picking a natural-sounding default voice.
 * None of these are guaranteed to exist on any given device/browser — each
 * matcher is tried in turn and the first available match wins.
 */
const PREFERRED_VOICE_MATCHERS: Array<(voice: SpeechSynthesisVoice) => boolean> = [
  (voice) => /natural/i.test(voice.name) && voice.lang.toLowerCase().startsWith("en"),
  (voice) => /neural/i.test(voice.name) && voice.lang.toLowerCase().startsWith("en"),
  (voice) => voice.name === "Samantha",
  (voice) => /google/i.test(voice.name) && voice.lang.toLowerCase().startsWith("en"),
  (voice) => voice.lang.toLowerCase().startsWith("en") && voice.default,
  (voice) => voice.lang.toLowerCase().startsWith("en"),
];

/** Picks a reasonable default voice from whatever is available. Never assumes a specific voice exists. */
export function pickDefaultVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  for (const matches of PREFERRED_VOICE_MATCHERS) {
    const found = voices.find(matches);
    if (found) return found;
  }
  return voices[0] ?? null;
}

/** English voices first (alphabetical), then everything else grouped by language. */
export function sortVoicesForDisplay(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return [...voices].sort((a, b) => {
    const aEnglish = a.lang.toLowerCase().startsWith("en");
    const bEnglish = b.lang.toLowerCase().startsWith("en");
    if (aEnglish !== bEnglish) return aEnglish ? -1 : 1;
    if (a.lang !== b.lang) return a.lang.localeCompare(b.lang);
    return a.name.localeCompare(b.name);
  });
}
