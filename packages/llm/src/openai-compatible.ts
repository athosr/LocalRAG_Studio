import type { ChatMessage, LlmCompleteResult, LlmProvider } from "./types.js";
import { withRetries } from "./retry.js";

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/$/, "")}${path}`;
}

export async function openAiCompatibleEmbed(
  baseUrl: string,
  apiKey: string | null,
  model: string,
  input: string,
  dimensions: number,
): Promise<number[]> {
  return withRetries(
    async () => {
      const headers: Record<string, string> = {
        "content-type": "application/json",
      };
      if (apiKey) headers.authorization = `Bearer ${apiKey}`;
      const res = await fetch(joinUrl(baseUrl, "/embeddings"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          input,
          dimensions,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Embeddings failed: ${res.status} ${t}`);
      }
      const data = (await res.json()) as {
        data?: { embedding?: number[] }[];
      };
      const emb = data.data?.[0]?.embedding;
      if (!emb?.length) throw new Error("Empty embedding from API");
      return emb;
    },
    { attempts: 4, baseMs: 300, maxMs: 8000 },
  );
}

export function createOpenAiCompatibleLlmProvider(
  baseUrl: string,
  apiKey: string | null,
  model: string,
): LlmProvider {
  return {
    async complete(messages: ChatMessage[]): Promise<LlmCompleteResult> {
      return withRetries(
        async () => {
          const headers: Record<string, string> = {
            "content-type": "application/json",
          };
          if (apiKey) headers.authorization = `Bearer ${apiKey}`;
          const res = await fetch(joinUrl(baseUrl, "/chat/completions"), {
            method: "POST",
            headers,
            body: JSON.stringify({
              model,
              messages,
              temperature: 0.2,
            }),
          });
          if (!res.ok) {
            const t = await res.text();
            throw new Error(`Chat completions failed: ${res.status} ${t}`);
          }
          const data = (await res.json()) as {
            choices?: { message?: { content?: string } }[];
            usage?: { prompt_tokens?: number; completion_tokens?: number };
          };
          const text = data.choices?.[0]?.message?.content ?? "";
          return {
            text,
            usage: {
              promptTokens: data.usage?.prompt_tokens,
              completionTokens: data.usage?.completion_tokens,
            },
          };
        },
        { attempts: 4, baseMs: 300, maxMs: 8000 },
      );
    },
  };
}
