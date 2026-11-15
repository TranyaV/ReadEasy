import type { AssistantRequest, AssistantResult } from "./types";

/**
 * Implemented by exactly one adapter per AI vendor (e.g. src/lib/assistant/providers/openai.ts).
 * The API route depends only on this interface, never on a specific SDK — adding a
 * provider later means writing one file that implements this and selecting it in the
 * route, with no changes anywhere else (components, the route's request/response
 * shape, or the client).
 */
export interface AIProvider {
  readonly name: string;
  complete(request: AssistantRequest): Promise<AssistantResult>;
}
