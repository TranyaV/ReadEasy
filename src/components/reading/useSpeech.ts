"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { pickDefaultVoice, sortVoicesForDisplay } from "@/lib/speech/voices";
import { segmentDocument } from "@/lib/text/sentences";

export type SpeechPlaybackState = "idle" | "playing" | "paused";

function subscribeToNothing() {
  return () => {};
}

function getSpeechSupportSnapshot(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function getSpeechSupportServerSnapshot(): boolean {
  return false;
}

/** SSR-safe browser-capability check: false during server rendering/static generation, corrected after mount. */
export function useIsSpeechSupported(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    getSpeechSupportSnapshot,
    getSpeechSupportServerSnapshot,
  );
}

// A single shared, stable reference. useSyncExternalStore compares snapshots with
// Object.is, so getSnapshot/getServerSnapshot must each return this SAME array
// instance whenever the underlying voice list hasn't actually changed — a fresh
// `[]` literal on every call would look like a perpetually-changing store.
const EMPTY_VOICES: SpeechSynthesisVoice[] = [];

let cachedVoices: SpeechSynthesisVoice[] = EMPTY_VOICES;

function voicesAreEqual(a: SpeechSynthesisVoice[], b: SpeechSynthesisVoice[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((voice, index) => voice.voiceURI === b[index].voiceURI);
}

function getVoicesSnapshot(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return cachedVoices;
  }
  const fresh = window.speechSynthesis.getVoices();
  if (!voicesAreEqual(fresh, cachedVoices)) {
    cachedVoices = fresh;
  }
  return cachedVoices;
}

function getVoicesServerSnapshot(): SpeechSynthesisVoice[] {
  return EMPTY_VOICES;
}

function subscribeToVoices(onStoreChange: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return () => {};
  }
  window.speechSynthesis.addEventListener("voiceschanged", onStoreChange);
  return () => {
    window.speechSynthesis.removeEventListener("voiceschanged", onStoreChange);
  };
}

/** Browser voices load asynchronously in some browsers; this stays in sync via the voiceschanged event. */
export function useAvailableVoices(): SpeechSynthesisVoice[] {
  return useSyncExternalStore(subscribeToVoices, getVoicesSnapshot, getVoicesServerSnapshot);
}

/** Resolves an explicit choice if it still exists, falling back to the best available default. */
function resolveVoice(voices: SpeechSynthesisVoice[], voiceURI: string | null): SpeechSynthesisVoice | null {
  const explicit = voiceURI ? voices.find((voice) => voice.voiceURI === voiceURI) : undefined;
  return explicit ?? pickDefaultVoice(voices);
}

export type UseSpeechResult = {
  isSupported: boolean;
  state: SpeechPlaybackState;
  activeSentenceIndex: number | null;
  rate: number;
  setRate: (rate: number) => void;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setVoice: (voiceURI: string) => void;
  previewVoice: () => void;
  play: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
};

const MIN_RATE = 0.5;
const MAX_RATE = 2;
const PREVIEW_PHRASE = "This is how this voice sounds when reading your document.";

/**
 * Drives window.speechSynthesis one sentence at a time (boundary events are unreliable
 * across browsers), so pause/resume/stop and the active-sentence highlight stay in sync.
 *
 * Takes a `getText` callback rather than a text string: the document is now live-editable
 * at all times, so the text to read must be fetched fresh at the moment Play is pressed,
 * never memoized against a prop that could already be stale by the time it's used.
 */
export function useSpeech(
  getText: () => string,
  initial: { voiceURI?: string | null; rate?: number } = {},
): UseSpeechResult {
  const isSupported = useIsSpeechSupported();
  const sentencesRef = useRef<string[]>([]);

  const [state, setState] = useState<SpeechPlaybackState>("idle");
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(null);
  const [rate, setRateValue] = useState(() => Math.min(MAX_RATE, Math.max(MIN_RATE, initial.rate ?? 1)));
  const rateRef = useRef(rate);
  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  const rawVoices = useAvailableVoices();
  const voices = useMemo(() => sortVoicesForDisplay(rawVoices), [rawVoices]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(initial.voiceURI ?? null);
  const selectedVoice = useMemo(
    () => resolveVoice(voices, selectedVoiceURI),
    [voices, selectedVoiceURI],
  );
  const voiceRef = useRef(selectedVoice);
  useEffect(() => {
    voiceRef.current = selectedVoice;
  }, [selectedVoice]);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Unmount safety: never leave a stray utterance speaking after this page goes away.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function speakFrom(index: number) {
    const list = sentencesRef.current;
    if (index >= list.length) {
      utteranceRef.current = null;
      setActiveSentenceIndex(null);
      setState("idle");
      return;
    }

    setActiveSentenceIndex(index);

    const utterance = new SpeechSynthesisUtterance(list[index]);
    utterance.rate = rateRef.current;
    if (voiceRef.current) {
      utterance.voice = voiceRef.current;
    }

    utterance.onend = () => {
      if (utteranceRef.current !== utterance) return;
      speakFrom(index + 1);
    };

    utterance.onerror = (event) => {
      if (utteranceRef.current !== utterance) return;
      if (event.error === "canceled" || event.error === "interrupted") return;
      utteranceRef.current = null;
      setActiveSentenceIndex(null);
      setState("idle");
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  function play() {
    if (!isSupported) return;
    const freshSentences = segmentDocument(getText()).sentences.map((sentence) => sentence.text);
    if (freshSentences.length === 0) return;
    sentencesRef.current = freshSentences;
    window.speechSynthesis.cancel();
    setState("playing");
    speakFrom(0);
  }

  function pause() {
    if (!isSupported || state !== "playing") return;
    window.speechSynthesis.pause();
    setState("paused");
  }

  function resume() {
    if (!isSupported || state !== "paused") return;
    window.speechSynthesis.resume();
    setState("playing");
  }

  function stop() {
    if (isSupported) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setActiveSentenceIndex(null);
    setState("idle");
  }

  function setRate(nextRate: number) {
    setRateValue(Math.min(MAX_RATE, Math.max(MIN_RATE, nextRate)));
  }

  function setVoice(voiceURI: string) {
    const nextVoice = resolveVoice(voices, voiceURI);
    setSelectedVoiceURI(voiceURI);

    // No audible change (e.g. re-picking whatever was already the resolved default) —
    // update the stored preference only, don't disturb anything that's playing.
    if (nextVoice?.voiceURI === voiceRef.current?.voiceURI) {
      return;
    }

    // Apply ahead of the effect: speakFrom() below reads voiceRef synchronously, and
    // the state-driven effect sync won't have run yet within this same event handler.
    voiceRef.current = nextVoice;

    if (state === "idle" || activeSentenceIndex === null) {
      // Nothing is speaking — the new voice simply takes effect on the next Play.
      return;
    }

    const wasPaused = state === "paused";
    const indexToRestart = activeSentenceIndex;

    // Cancelling fires a "canceled" error on the in-flight utterance, which the
    // onerror guard above already ignores; speakFrom() below immediately replaces
    // utteranceRef.current, so that stale callback can never advance the sentence
    // index or speak again once it does fire.
    window.speechSynthesis.cancel();
    speakFrom(indexToRestart);

    if (wasPaused) {
      window.speechSynthesis.pause();
      setState("paused");
    } else {
      setState("playing");
    }
  }

  // Previews are independent, fire-and-forget utterances — they never touch the
  // document-reading state machine, so they can't corrupt sentence position or
  // playback state. Only allowed while idle to avoid fighting the main utterance
  // queue for window.speechSynthesis.
  function previewVoice() {
    if (!isSupported || state !== "idle") return;
    const utterance = new SpeechSynthesisUtterance(PREVIEW_PHRASE);
    utterance.rate = rateRef.current;
    if (voiceRef.current) {
      utterance.voice = voiceRef.current;
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  return {
    isSupported,
    state,
    activeSentenceIndex,
    rate,
    setRate,
    voices,
    selectedVoice,
    setVoice,
    previewVoice,
    play,
    pause,
    resume,
    stop,
  };
}
