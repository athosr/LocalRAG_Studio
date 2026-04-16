import type { AppSettings } from "@localrag/config";
import { createOllamaLlmProvider } from "./ollama.js";
import { createOpenAiCompatibleLlmProvider } from "./openai-compatible.js";
import type { LlmProvider } from "./types.js";

export function createLlmProviderFromSettings(
  settings: AppSettings,
  apiKey: string | null,
): LlmProvider {
  if (settings.activeProvider === "ollama") {
    return createOllamaLlmProvider(
      settings.ollama.host,
      settings.ollama.chatModel,
    );
  }
  return createOpenAiCompatibleLlmProvider(
    settings.customHttp.baseUrl,
    apiKey,
    settings.customHttp.model,
  );
}
