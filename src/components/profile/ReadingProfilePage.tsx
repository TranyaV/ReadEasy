"use client";

import { useId, useState, type ReactNode } from "react";
import { AudioLines, CheckCircle2, Contrast, Focus, Play, RotateCcw, Type } from "lucide-react";
import { PageContainer, PageHeading } from "@/components/layout/AppShell";
import {
  ContrastControl,
  ControlRow,
  FontSelect,
  RulerControls,
  Segmented,
  TextLayoutControls,
  ThemeSwatches,
  Toggle,
} from "@/components/reading/controls";
import { FONT_OPTIONS, getBackgroundPreset, readingSurface, type ReadingSettings } from "@/components/reading/settings";
import { useAvailableVoices, useIsSpeechSupported } from "@/components/reading/useSpeech";
import { Button } from "@/components/ui/Button";
import { pickDefaultVoice, sortVoicesForDisplay } from "@/lib/speech/voices";
import {
  DEFAULT_PROFILE,
  MAX_RATE,
  MIN_RATE,
  saveReadingProfile,
  useReadingProfile,
  type Appearance,
  type ReadingProfile,
} from "@/lib/profile/readingProfile";

const SECTIONS = [
  { id: "text-layout", label: "Text & Layout", icon: Type },
  { id: "appearance", label: "Appearance & Contrast", icon: Contrast },
  { id: "focus", label: "Focus & Reading Aids", icon: Focus },
  { id: "read-aloud", label: "Read Aloud", icon: AudioLines },
];

const PREVIEW_TEXT =
  "A wave is a disturbance that transfers energy from one place to another without the permanent movement of matter. Waves can travel through solids, liquids and gases.";

function Section({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 border-b border-border pb-8 last:border-b-0">
      <h2 id={`${id}-title`} className="text-lg font-semibold text-foreground">
        {title}
      </h2>
      <p className="mb-5 text-sm text-muted">{description}</p>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}

function sameProfile(a: ReadingProfile, b: ReadingProfile): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function ReadingProfilePage() {
  const saved = useReadingProfile();
  // The form edits a draft; nothing applies until "Save changes".
  const [draft, setDraft] = useState<ReadingProfile | null>(null);
  const [status, setStatus] = useState<"idle" | "saved" | "failed">("idle");
  const current = draft ?? saved;
  const isDirty = draft !== null && !sameProfile(draft, saved);

  const isSpeechSupported = useIsSpeechSupported();
  const voices = sortVoicesForDisplay(useAvailableVoices());
  const voiceId = useId();
  const rateId = useId();

  function update(next: Partial<ReadingProfile>) {
    setStatus("idle");
    setDraft({ ...current, ...next });
  }
  function updateSettings(next: Partial<ReadingSettings>) {
    update({ settings: { ...current.settings, ...next } });
  }

  function save() {
    const ok = saveReadingProfile(current);
    setStatus(ok ? "saved" : "failed");
    if (ok) setDraft(null);
  }

  function previewVoice() {
    if (!isSpeechSupported) return;
    const utterance = new SpeechSynthesisUtterance("This is how your documents will sound when read aloud.");
    utterance.rate = current.readAloud.rate;
    const voice = voices.find((candidate) => candidate.voiceURI === current.readAloud.voiceURI) ?? pickDefaultVoice(voices);
    if (voice) utterance.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  const surface = readingSurface(current.settings);
  const savedSettings = saved.settings;
  const savedSummary = [
    FONT_OPTIONS.find((option) => option.value === savedSettings.font)?.label,
    `${savedSettings.fontSize} px`,
    `${savedSettings.lineSpacing} px lines`,
    getBackgroundPreset(savedSettings.background).label,
  ].join(" · ");

  return (
    <PageContainer className="max-w-7xl">
      <PageHeading
        title="Reading Profile"
        description="Customise your reading experience. These preferences are saved in this browser and applied to new documents."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setStatus("idle");
                setDraft(DEFAULT_PROFILE);
              }}
            >
              <RotateCcw className="h-4 w-4" /> Reset to default
            </Button>
            <Button onClick={save} disabled={!isDirty}>
              Save changes
            </Button>
          </>
        }
      />
      <p className="-mt-4 mb-6 min-h-5 text-sm" aria-live="polite">
        {status === "saved" && (
          <span className="inline-flex items-center gap-1.5 text-success">
            <CheckCircle2 className="h-4 w-4" /> Preferences saved. New documents will use them.
          </span>
        )}
        {status === "failed" && <span className="text-error">This browser didn&apos;t allow saving preferences. Check that site storage is enabled.</span>}
        {status === "idle" && isDirty && <span className="text-muted">You have unsaved changes.</span>}
      </p>

      <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[200px_minmax(0,1fr)_340px]">
        <nav aria-label="Profile sections" className="hidden lg:block">
          <ul className="sticky top-24 flex flex-col gap-1">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <a href={`#${id}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground/80 hover:bg-subtle hover:text-foreground">
                  <Icon className="h-4 w-4 text-muted" /> {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col gap-8 rounded-2xl border border-border bg-surface p-5 sm:p-7">
          <Section id="text-layout" title="Text & Layout" description="Make text easier and more comfortable to read.">
            <FontSelect value={current.settings.font} onChange={(font) => updateSettings({ font })} />
            <TextLayoutControls settings={current.settings} onChange={updateSettings} />
          </Section>

          <Section id="appearance" title="Appearance & Contrast" description="Choose a colour theme and text contrast that works for you.">
            <ControlRow label="App appearance">
              <Segmented<Appearance>
                label="App appearance"
                options={[
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                  { value: "system", label: "Match device" },
                ]}
                value={current.appearance}
                onChange={(appearance) => update({ appearance })}
              />
            </ControlRow>
            <ControlRow label="Reading background">
              <ThemeSwatches withLabels value={current.settings.background} onChange={(background) => updateSettings({ background })} />
            </ControlRow>
            <ContrastControl value={current.settings.contrast} onChange={(contrast) => updateSettings({ contrast })} />
          </Section>

          <Section id="focus" title="Focus & Reading Aids" description="Reduce distractions and keep your place while reading.">
            <RulerControls
              enabled={current.settings.rulerEnabled}
              style={current.settings.rulerStyle}
              onChange={(next) => updateSettings(next)}
            />
            <Toggle
              label="Focus mode"
              description="Open documents with navigation and side panels hidden"
              checked={current.settings.focusMode}
              onChange={(focusMode) => updateSettings({ focusMode })}
            />
          </Section>

          <Section id="read-aloud" title="Read Aloud" description="Listen to your documents with the voices available on this device.">
            {!isSpeechSupported ? (
              <p className="text-sm text-muted">Text-to-speech isn&apos;t supported in this browser.</p>
            ) : (
              <>
                <ControlRow label="Default voice" htmlFor={voiceId}>
                  <div className="flex items-center gap-2">
                    <select
                      id={voiceId}
                      value={current.readAloud.voiceURI ?? ""}
                      onChange={(event) => update({ readAloud: { ...current.readAloud, voiceURI: event.target.value || null } })}
                      className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      <option value="">Automatic (best available voice)</option>
                      {voices.map((voice) => (
                        <option key={voice.voiceURI} value={voice.voiceURI}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={previewVoice}
                      aria-label="Preview voice"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-accent hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      <Play className="h-4 w-4 fill-current" />
                    </button>
                  </div>
                </ControlRow>
                <ControlRow label="Playback speed" htmlFor={rateId} hint={`${current.readAloud.rate.toFixed(1)}×`}>
                  <input
                    id={rateId}
                    type="range"
                    min={MIN_RATE}
                    max={MAX_RATE}
                    step={0.1}
                    value={current.readAloud.rate}
                    onChange={(event) => update({ readAloud: { ...current.readAloud, rate: Number(event.target.value) } })}
                    className="w-full accent-accent"
                  />
                </ControlRow>
              </>
            )}
          </Section>
        </div>

        <aside className="flex min-w-0 flex-col gap-6 lg:col-start-2 xl:col-start-auto">
          <div className="xl:sticky xl:top-24">
            <h2 className="text-lg font-semibold text-foreground">Preview</h2>
            <p className="mb-3 text-sm text-muted">How your reading settings look.</p>
            <div className="overflow-hidden rounded-2xl border border-border p-6 shadow-sm" style={{ backgroundColor: surface.background }}>
              <p className={surface.fontClass} style={surface.textStyle}>
                {PREVIEW_TEXT}
              </p>
            </div>

            <h2 className="mt-8 text-lg font-semibold text-foreground">Your saved preferences</h2>
            <div className="mt-3 flex items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Current profile</p>
                <p className="text-xs text-muted">{savedSummary}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}
