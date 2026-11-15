const CONSENT_KEY = "eyeread:assistant-document-consent";

/** Session-scoped — asked again next browser session, consistent with how the document itself persists. */
export function hasDocumentConsent(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(CONSENT_KEY) === "granted";
}

export function grantDocumentConsent(): void {
  sessionStorage.setItem(CONSENT_KEY, "granted");
}
