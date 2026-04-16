import type { AppSettings } from "@localrag/config";
import type { ChatMessage, LlmCompleteResult, LlmProvider } from "./types.js";
import { withRetries } from "./retry.js";

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/$/, "")}${path}`;
}

export async function ollamaListModels(host: string): Promise<string[]> {
  const res = await fetch(joinUrl(host, "/api/tags"));
  if (!res.ok) throw new Error(`Ollama list models failed: ${res.status}`);
  const data = (await res.json()) as { models?: { name?: string }[] };
  return (data.models ?? []).map((m) => m.name ?? "").filter(Boolean);
}

export async function ollamaEmbed(
  host: string,
  model: string,
  input: string,
): Promise<number[]> {
  return withRetries(
    async () => {
      const res = await fetch(joinUrl(host, "/api/embeddings"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model, prompt: input }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Ollama embeddings failed: ${res.status} ${t}`);
      }
      const data = (await res.json()) as { embedding?: number[] };
      if (!data.embedding?.length) throw new Error("Ollama returned empty embedding");
      return data.embedding;
    },
    { attempts: 4, baseMs: 200, maxMs: 5000 },
  );
}

export function createOllamaLlmProvider(
  host: string,
  model: string,
): LlmProvider {
  return {
    async complete(messages: ChatMessage[]): Promise<LlmCompleteResult> {
      return withRetries(
        async () => {
          const res = await fetch(joinUrl(host, "/api/chat"), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              model,
              messages,
              stream: false,
            }),
          });
          if (!res.ok) {
            const t = await res.text();
            throw new Error(`Ollama chat failed: ${res.status} ${t}`);
          }
          const data = (await res.json()) as {
            message?: { content?: string };
          };
          const text = data.message?.content ?? "";
          return { text };
        },
        { attempts: 4, baseMs: 200, maxMs: 5000 },
      );
    },
  };
}

export function ollamaEmbeddingModel(settings: AppSettings): string {
  return settings.ollama.embedModel;
}
