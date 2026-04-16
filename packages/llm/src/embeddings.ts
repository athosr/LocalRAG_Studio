import type { AppSettings } from "@localrag/config";
import { ollamaEmbed } from "./ollama.js";
import { openAiCompatibleEmbed } from "./openai-compatible.js";

export async function embedText(
  settings: AppSettings,
  apiKey: string | null,
  text: string,
): Promise<number[]> {
  if (settings.activeProvider === "ollama") {
    return ollamaEmbed(
      settings.ollama.host,
      settings.ollama.embedModel,
      text,
    );
  }
  return openAiCompatibleEmbed(
    settings.customHttp.baseUrl,
    apiKey,
    settings.customHttp.embedModel,
    text,
    settings.rag.embeddingDimensions,
  );
}
