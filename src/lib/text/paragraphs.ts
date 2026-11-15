/** Splits raw document text into paragraphs, collapsing in-paragraph line wraps into spaces. */
export function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((block) => block.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}
