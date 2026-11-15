import { NextResponse } from "next/server";
import type { AssistantRequest, AssistantResult } from "@/lib/assistant/types";

// Note: this project's next.config.ts has cacheComponents enabled, which is
// incompatible with an explicit `export const runtime` segment config — so the
// runtime is left as Next's default (Node.js) rather than declared here. Provider
// SDKs generally need Node rather than Edge, which is already what this gets.

function isConversationTurn(value: unknown): value is { role: string; content: string } {
  if (!value || typeof value !== "object") return false;
  const turn = value as Record<string, unknown>;
  return (turn.role === "user" || turn.role === "assistant") && typeof turn.content === "string";
}

function isValidRequest(value: unknown): value is AssistantRequest {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  if (body.mode !== "document" && body.mode !== "general") return false;
  if (!Array.isArray(body.turns) || !body.turns.every(isConversationTurn)) return false;
  return true;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<AssistantResult>(
      { status: "error", message: "The request body wasn't valid JSON." },
      { status: 400 },
    );
  }

  if (!isValidRequest(body)) {
    return NextResponse.json<AssistantResult>(
      { status: "error", message: "The request was missing required fields." },
      { status: 400 },
    );
  }

  // No AI provider has been selected yet — ReadEase is still reviewing providers'
  // age, usage terms, and end-user data handling before connecting one. This route
  // is otherwise complete: request validation, mode separation, and bounded
  // document context are all already in place. Connecting a provider later is meant
  // to require only:
  //   1. An adapter implementing AIProvider (see src/lib/assistant/providerInterface.ts)
  //   2. Selecting it here, e.g. `const provider: AIProvider = getConfiguredProvider();`
  //   3. Calling `await provider.complete(body)` and returning its result
  // No changes to the client, the request/response shape, or any other file.
  return NextResponse.json<AssistantResult>(
    {
      status: "not_configured",
      message:
        "The AI assistant isn't connected to a provider yet — ReadEase hasn't selected one. This feature is coming soon.",
    },
    { status: 503 },
  );
}
