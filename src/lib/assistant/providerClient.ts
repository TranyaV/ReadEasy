import type { AssistantRequest, AssistantResult } from "./types";

const RATE_LIMIT_MESSAGE = "Too many requests. Please wait a minute and try again.";

/**
 * The browser's only point of contact with the assistant — a plain fetch to our own
 * first-party route. This file has no knowledge of any AI vendor; that's handled
 * entirely server-side, so no provider name, SDK, or key ever needs to reach the client.
 */
export async function requestAssistantReply(payload: AssistantRequest): Promise<AssistantResult> {
  try {
    const response = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Rate-limited (e.g. by the hosting firewall) — the body may not be our JSON.
    if (response.status === 429) {
      return { status: "error", message: RATE_LIMIT_MESSAGE };
    }

    const data = (await response.json()) as AssistantResult;
    return data;
  } catch {
    return {
      status: "error",
      message: "Couldn't reach the assistant. Check your connection and try again.",
    };
  }
}
