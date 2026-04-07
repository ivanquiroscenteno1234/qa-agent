import { getQaLlmConfig } from "@/lib/qa/llm/config";
import { NoopLlmClient } from "@/lib/qa/llm/noop-client";
import type { QaLlmClient } from "@/lib/qa/llm/types";

let _client: QaLlmClient | null = null;

/**
 * Returns the active QaLlmClient for this process.
 * - Returns NoopLlmClient when LLM is disabled, provider is not "gemini", or the API key is absent.
 * - Returns GeminiClient when fully configured.
 *
 * The client is cached after first call. Call resetQaLlmClient() in tests to clear the cache.
 */
export function getQaLlmClient(): QaLlmClient {
  if (_client) {
    return _client;
  }

  const config = getQaLlmConfig();

  if (!config.enabled || config.provider !== "gemini" || !config.configured) {
    _client = new NoopLlmClient();
    return _client;
  }

  // Lazy-load the Gemini client to avoid importing the SDK when it is not needed.
  // This import is synchronous at module evaluation time in Node, so the dynamic
  // require pattern below is safe for server-side Next.js route handlers.
  try {
    const { GeminiClient } = require("@/lib/qa/llm/gemini-client") as { GeminiClient: new (apiKey: string, model: string) => QaLlmClient };
    _client = new GeminiClient(process.env.GEMINI_API_KEY as string, config.model);
  } catch {
    _client = new NoopLlmClient();
  }

  return _client;
}

/**
 * Resets the cached client. Intended for use in tests only.
 */
export function resetQaLlmClient(): void {
  _client = null;
}
