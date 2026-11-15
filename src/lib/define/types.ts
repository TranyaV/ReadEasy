export type DefinitionSense = {
  partOfSpeech: string;
  definition: string;
  /** Only present when the dictionary provides an example for this exact definition. */
  example?: string;
};

export type DefineResult =
  | {
      status: "ok";
      word: string;
      phonetic?: string;
      /** Recorded pronunciation from the dictionary, when one exists. */
      audioUrl?: string;
      senses: DefinitionSense[];
      sourceUrl?: string;
    }
  | { status: "not_found"; message: string }
  | { status: "error"; message: string };

/** Letters (any script), with inner apostrophes/hyphens — e.g. "don't", "well-known". */
export const WORD_PATTERN = /^\p{L}[\p{L}\p{M}'’-]{0,47}$/u;
