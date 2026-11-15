export type TextMatch = { start: number; end: number };

/** Case-insensitive, non-overlapping plain-text substring search. */
export function findMatches(text: string, query: string): TextMatch[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const haystack = text.toLowerCase();
  const needle = trimmedQuery.toLowerCase();
  const matches: TextMatch[] = [];

  let index = haystack.indexOf(needle);
  while (index !== -1) {
    matches.push({ start: index, end: index + needle.length });
    index = haystack.indexOf(needle, index + needle.length);
  }

  return matches;
}
