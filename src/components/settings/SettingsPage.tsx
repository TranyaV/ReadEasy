"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { Database, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import { PageContainer, PageHeading } from "@/components/layout/AppShell";
import { StorageMeter } from "@/components/layout/StorageMeter";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { hasDocumentConsent, revokeDocumentConsent } from "@/lib/assistant/consent";
import { clearDocumentForReading } from "@/lib/documentHandoff";
import { formatBytes } from "@/lib/format";
import { clearLibrary } from "@/lib/library/store";
import { useLibrary } from "@/lib/library/useLibrary";
import { DEFAULT_PROFILE, saveReadingProfile } from "@/lib/profile/readingProfile";

function noopSubscribe() {
  return () => {};
}

function SettingsCard({ icon: Icon, title, children }: { icon: typeof Database; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6" aria-labelledby={`settings-${title}`}>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 id={`settings-${title}`} className="text-lg font-semibold text-foreground">
          {title}
        </h2>
      </div>
      <div className="flex flex-col gap-4 text-sm text-muted">{children}</div>
    </section>
  );
}

export function SettingsPage() {
  const library = useLibrary();
  const [confirmClear, setConfirmClear] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // sessionStorage isn't available while prerendering, so read it after hydration.
  const storedConsent = useSyncExternalStore(noopSubscribe, hasDocumentConsent, () => false);
  const [revoked, setRevoked] = useState(false);
  const consentGiven = storedConsent && !revoked;

  const totalSize = library.documents.reduce((sum, document) => sum + document.size, 0);

  async function handleClear() {
    try {
      await clearLibrary();
      clearDocumentForReading();
      setMessage("All documents and folders were deleted from this browser.");
    } catch {
      setMessage("The library couldn't be cleared. Please try again.");
    }
    setConfirmClear(false);
  }

  return (
    <PageContainer className="max-w-4xl">
      <PageHeading title="Settings" description="Manage what ReadEase keeps in this browser and how the AI assistant uses your documents." />
      <p className="mb-6 min-h-5 text-sm text-success" aria-live="polite">
        {message}
      </p>

      <div className="flex flex-col gap-6">
        <SettingsCard icon={Database} title="Storage">
          <p>
            Your library is stored only in this browser (IndexedDB) — there is no account or cloud storage. Clearing your browser&apos;s
            site data, or using a different browser or device, means these documents won&apos;t be there.
          </p>
          {library.status === "ready" && (
            <p className="text-foreground">
              {library.documents.length} {library.documents.length === 1 ? "document" : "documents"} · {library.folders.length}{" "}
              {library.folders.length === 1 ? "folder" : "folders"} · {formatBytes(totalSize)} of original files and text
            </p>
          )}
          <div className="-mx-3">
            <StorageMeter />
          </div>
          <div>
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              disabled={library.status !== "ready" || (library.documents.length === 0 && library.folders.length === 0)}
              className="rounded-xl border border-error/40 px-4 py-2.5 text-sm font-medium text-error hover:bg-error/10 disabled:opacity-40"
            >
              Delete all documents and folders
            </button>
          </div>
        </SettingsCard>

        <SettingsCard icon={Sparkles} title="AI assistant">
          <p>
            Ask ReadEase uses Google Gemini through ReadEase&apos;s server. General questions are sent on their own. A short excerpt of
            your open document is only sent when your question is about it (or you&apos;ve selected text) and you&apos;ve allowed it.
          </p>
          <p className="text-foreground">
            Document sharing for this browser session: <strong>{consentGiven ? "allowed" : "not allowed yet"}</strong>
          </p>
          {consentGiven && (
            <div>
              <Button
                variant="secondary"
                onClick={() => {
                  revokeDocumentConsent();
                  setRevoked(true);
                  setMessage("The assistant will ask again before sending any document content.");
                }}
              >
                Stop sharing document content
              </Button>
            </div>
          )}
        </SettingsCard>

        <SettingsCard icon={SlidersHorizontal} title="Reading preferences">
          <p>Fonts, spacing, colours, reading aids and read-aloud defaults live in your Reading Profile.</p>
          <div className="flex flex-wrap gap-3">
            <Button href="/profile">Open Reading Profile</Button>
            <Button
              variant="secondary"
              onClick={() => {
                const ok = saveReadingProfile(DEFAULT_PROFILE);
                setMessage(ok ? "Your Reading Profile was reset to the defaults." : "This browser didn't allow saving preferences.");
              }}
            >
              Reset Reading Profile
            </Button>
          </div>
        </SettingsCard>

        <SettingsCard icon={ShieldCheck} title="Privacy">
          <p>
            Text recognition (OCR) runs in your browser. When you look up a word, only that word is sent to the Free Dictionary API.
            Read aloud uses your device&apos;s built-in voices. See <Link href="/help" className="text-accent underline">Help &amp; Support</Link>{" "}
            for more.
          </p>
        </SettingsCard>
      </div>

      {confirmClear && (
        <Dialog
          title="Delete everything?"
          onClose={() => setConfirmClear(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmClear(false)}>
                Cancel
              </Button>
              <button
                type="button"
                data-autofocus
                onClick={() => void handleClear()}
                className="rounded-xl bg-error px-4 py-2.5 text-sm font-medium text-on-accent hover:opacity-90"
              >
                Delete everything
              </button>
            </>
          }
        >
          <p className="text-sm text-muted">
            All {library.documents.length} documents, their original files, edits and folders will be permanently removed from this
            browser. Your Reading Profile is kept. This can&apos;t be undone.
          </p>
        </Dialog>
      )}
    </PageContainer>
  );
}
