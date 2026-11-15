import { NextResponse } from "next/server";
import { getConfiguredProvider } from "@/lib/assistant/providers";
import type { AssistantResult } from "@/lib/assistant/types";
import { MAX_BODY_BYTES, validateAssistantRequest } from "@/lib/assistant/validation";

// Note: this project's next.config.ts has cacheComponents enabled, which is
// incompatible with an explicit `export const runtime` segment config — so the
// runtime is left as Next's default (Node.js) rather than declared here. The
// Gemini SDK needs Node rather than Edge, which is already what this gets.

function respond(result: AssistantResult, status: number) {
  return NextResponse.json<AssistantResult>(result, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return respond({ status: "error", message: "That request was too large. Try a shorter message." }, 413);
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return respond({ status: "error", message: "The request couldn't be read. Please try again." }, 400);
  }
  if (raw.length > MAX_BODY_BYTES) {
    return respond({ status: "error", message: "That request was too large. Try a shorter message." }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return respond({ status: "error", message: "The request body wasn't valid JSON." }, 400);
  }

  const validation = validateAssistantRequest(body);
  if (!validation.ok) {
    return respond({ status: "error", message: validation.message }, 400);
  }

  const provider = getConfiguredProvider();
  if (!provider) {
    return respond(
      {
        status: "not_configured",
        message: "The AI assistant isn't set up on this server yet. Please try again later.",
      },
      503,
    );
  }

  const result = await provider.complete(validation.request);
  const status = result.status === "ok" ? 200 : result.status === "not_configured" ? 503 : 502;
  return respond(result, status);
}
