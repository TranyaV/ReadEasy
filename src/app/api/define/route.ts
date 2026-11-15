import { NextResponse } from "next/server";
import { WORD_PATTERN, type DefineResult, type DefinitionSense } from "@/lib/define/types";

// Free Dictionary API (Wiktionary data, no key). Only the single looked-up word is sent.
const DICTIONARY_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/";
const AUDIO_HOST = "api.dictionaryapi.dev";
const MAX_SENSES = 3;

type RawEntry = {
  word?: string;
  phonetic?: string;
  phonetics?: { text?: string; audio?: string }[];
  meanings?: { partOfSpeech?: string; definitions?: { definition?: string; example?: string }[] }[];
  sourceUrls?: string[];
};

function respond(result: DefineResult, status: number, cacheSeconds = 0) {
  return NextResponse.json<DefineResult>(result, {
    status,
    headers: { "Cache-Control": cacheSeconds > 0 ? `public, max-age=${cacheSeconds}` : "no-store" },
  });
}

function safeAudioUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === AUDIO_HOST ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function normalize(entries: RawEntry[], fallbackWord: string): DefineResult {
  const senses: DefinitionSense[] = [];
  const seenParts = new Set<string>();
  // One plain definition per part of speech (noun, verb…), in dictionary order.
  for (const entry of entries) {
    for (const meaning of entry.meanings ?? []) {
      const partOfSpeech = meaning.partOfSpeech?.trim() ?? "";
      const first = meaning.definitions?.find((item) => item.definition?.trim());
      if (!first?.definition || seenParts.has(partOfSpeech) || senses.length >= MAX_SENSES) continue;
      seenParts.add(partOfSpeech);
      senses.push({
        partOfSpeech,
        definition: first.definition.trim(),
        example: first.example?.trim() || undefined,
      });
    }
  }
  if (senses.length === 0) return { status: "not_found", message: `No definition found for “${fallbackWord}”.` };

  const phonetics = entries.flatMap((entry) => entry.phonetics ?? []);
  const phonetic = entries.find((entry) => entry.phonetic)?.phonetic ?? phonetics.find((item) => item.text)?.text;
  const audioUrl = phonetics.map((item) => safeAudioUrl(item.audio)).find(Boolean);
  const sourceUrl = entries.flatMap((entry) => entry.sourceUrls ?? []).find((url) => url.startsWith("https://"));

  return {
    status: "ok",
    word: entries[0]?.word ?? fallbackWord,
    phonetic: phonetic || undefined,
    audioUrl,
    senses,
    sourceUrl,
  };
}

export async function GET(request: Request) {
  const word = new URL(request.url).searchParams.get("word")?.trim().replace(/’/g, "'") ?? "";
  if (!WORD_PATTERN.test(word)) {
    return respond({ status: "error", message: "That doesn't look like a single word." }, 400);
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${DICTIONARY_URL}${encodeURIComponent(word.toLowerCase())}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch {
    return respond({ status: "error", message: "The dictionary couldn't be reached. Check your connection and try again." }, 502);
  }

  if (upstream.status === 404) {
    return respond({ status: "not_found", message: `No definition found for “${word}”.` }, 404, 3600);
  }
  if (upstream.status === 429) {
    return respond({ status: "error", message: "The dictionary is busy right now. Please try again in a moment." }, 503);
  }
  if (!upstream.ok) {
    return respond({ status: "error", message: "The dictionary couldn't answer right now. Please try again." }, 502);
  }

  try {
    const data = (await upstream.json()) as unknown;
    if (!Array.isArray(data)) throw new Error("Unexpected response");
    const result = normalize(data as RawEntry[], word);
    return respond(result, result.status === "ok" ? 200 : 404, 86400);
  } catch {
    return respond({ status: "error", message: "The dictionary returned something unexpected. Please try again." }, 502);
  }
}
