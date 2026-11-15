import { splitIntoParagraphs } from "./paragraphs";

export type Sentence = {
  paragraphIndex: number;
  start: number;
  end: number;
  text: string;
};

export type DocumentSegments = {
  paragraphs: string[];
  sentences: Sentence[];
};

// Matches a run of non-terminator characters up to and including one or more
// sentence-ending punctuation marks (optionally followed by a closing quote/bracket),
// or — if no terminator remains — the trailing fragment up to the end of the paragraph.
const SENTENCE_PATTERN = /[^.!?]*[.!?]+(?:["'”’)\]]+)?|[^.!?]+$/g;

function splitParagraphIntoSentences(paragraph: string): Array<Omit<Sentence, "paragraphIndex">> {
  const sentences: Array<Omit<Sentence, "paragraphIndex">> = [];

  for (const match of paragraph.matchAll(SENTENCE_PATTERN)) {
    const raw = match[0];
    const rawStart = match.index ?? 0;
    const leading = raw.match(/^\s*/)?.[0].length ?? 0;
    const trailing = raw.match(/\s*$/)?.[0].length ?? 0;
    const start = rawStart + leading;
    const end = rawStart + raw.length - trailing;

    if (end > start) {
      sentences.push({ start, end, text: paragraph.slice(start, end) });
    }
  }

  return sentences;
}

/** Segments document text into the same paragraphs the reading area renders, plus sentences with their positions preserved within each paragraph. */
export function segmentDocument(text: string): DocumentSegments {
  const paragraphs = splitIntoParagraphs(text);
  const sentences: Sentence[] = [];

  paragraphs.forEach((paragraph, paragraphIndex) => {
    splitParagraphIntoSentences(paragraph).forEach((sentence) => {
      sentences.push({ paragraphIndex, ...sentence });
    });
  });

  return { paragraphs, sentences };
}

/**
 * Converts a sentence's paragraph-relative start/end into absolute offsets within
 * `segments.paragraphs.join("\n\n")` — the same joined form rich-content rendering
 * derives its plain text in, so the two can be mapped onto the same character range.
 */
export function getAbsoluteSentenceRange(
  segments: DocumentSegments,
  sentenceIndex: number,
): { start: number; end: number } | null {
  const sentence = segments.sentences[sentenceIndex];
  if (!sentence) return null;

  let paragraphStart = 0;
  for (let i = 0; i < sentence.paragraphIndex; i += 1) {
    paragraphStart += segments.paragraphs[i].length + 2;
  }

  return { start: paragraphStart + sentence.start, end: paragraphStart + sentence.end };
}
