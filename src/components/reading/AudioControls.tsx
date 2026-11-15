"use client";

import { AlertCircle, Pause, Play, Square, Volume2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { SpeechPlaybackState } from "./useSpeech";

type AudioControlsProps = {
  state: SpeechPlaybackState;
  isSupported: boolean;
  hasContent: boolean;
  rate: number;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRateChange: (rate: number) => void;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  onVoiceChange: (voiceURI: string) => void;
  onPreviewVoice: () => void;
};

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40";

export function AudioControls({
  state,
  isSupported,
  hasContent,
  rate,
  onPlay,
  onPause,
  onResume,
  onStop,
  onRateChange,
  voices,
  selectedVoice,
  onVoiceChange,
  onPreviewVoice,
}: AudioControlsProps) {
  if (!isSupported) {
    return (
      <Card className="flex items-center gap-3 px-5 py-4">
        <AlertCircle className="h-4 w-4 shrink-0 text-error" />
        <p className="text-sm text-foreground/60">
          Text-to-speech isn&apos;t supported in this browser. Try the latest Chrome, Edge or Safari.
        </p>
      </Card>
    );
  }

  const canToggle = hasContent || state !== "idle";
  const canPreview = voices.length > 0 && state === "idle";

  function handleTogglePlay() {
    if (state === "playing") {
      onPause();
    } else if (state === "paused") {
      onResume();
    } else {
      onPlay();
    }
  }

  return (
    <Card className="flex flex-col gap-4 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={!canToggle}
            aria-label={state === "playing" ? "Pause" : state === "paused" ? "Resume" : "Play"}
            className={`flex h-11 w-11 items-center justify-center rounded-full bg-forest text-background transition-transform hover:scale-105 disabled:pointer-events-none disabled:opacity-40 ${focusRing}`}
          >
            {state === "playing" ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={onStop}
            disabled={state === "idle"}
            aria-label="Stop"
            className={`flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground/60 transition-colors hover:border-forest hover:text-forest disabled:opacity-40 ${focusRing}`}
          >
            <Square className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((bar) => (
              <span
                key={bar}
                className={`w-1 rounded-full bg-forest transition-all ${
                  state === "playing" ? "animate-pulse" : "opacity-40"
                }`}
                style={{ height: state === "playing" ? 8 + (bar % 3) * 6 : 6 }}
              />
            ))}
          </div>
        </div>
        <p className="text-xs text-foreground/50">
          {hasContent ? "Reads the document aloud, sentence by sentence." : "No text to read yet."}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <label
          htmlFor="speech-rate"
          className="shrink-0 text-xs font-medium uppercase tracking-[0.14em] text-foreground/50"
        >
          Speed · {rate.toFixed(1)}×
        </label>
        <input
          id="speech-rate"
          type="range"
          min={0.5}
          max={2}
          step={0.1}
          value={rate}
          onChange={(event) => onRateChange(Number(event.target.value))}
          aria-label={`Reading speed, currently ${rate.toFixed(1)} times normal`}
          className={`w-full accent-forest rounded ${focusRing}`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor="speech-voice"
          className="shrink-0 text-xs font-medium uppercase tracking-[0.14em] text-foreground/50"
        >
          Voice
        </label>

        {voices.length === 0 && (
          <p className="text-sm text-foreground/50">Loading available voices…</p>
        )}

        {voices.length === 1 && (
          <p className="text-sm text-foreground/50">
            Only one voice ({voices[0].name}) is available on this device.
          </p>
        )}

        {voices.length > 1 && (
          <>
            <select
              id="speech-voice"
              value={selectedVoice?.voiceURI ?? ""}
              onChange={(event) => onVoiceChange(event.target.value)}
              className={`min-w-0 flex-1 rounded-full border border-border bg-white/60 px-3 py-1.5 text-sm text-foreground focus:border-forest focus:outline-none ${focusRing}`}
            >
              {voices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onPreviewVoice}
              disabled={!canPreview}
              aria-label="Preview selected voice"
              title={state !== "idle" ? "Stop reading to preview a voice" : "Preview selected voice"}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-foreground/60 transition-colors hover:border-forest hover:text-forest disabled:opacity-40 ${focusRing}`}
            >
              <Volume2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </Card>
  );
}
