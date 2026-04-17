import { z } from "zod";

export const llmProviderSchema = z.enum(["ollama", "custom_http"]);

export const appSettingsSchema = z.object({
  activeProvider: llmProviderSchema,
  ollama: z.object({
    host: z.string().url().default("http://127.0.0.1:11434"),
    chatModel: z.string().min(1).default("llama3.2"),
    embedModel: z.string().min(1).default("nomic-embed-text-v2-moe:latest"),
  }),
  customHttp: z.object({
    baseUrl: z.string().url(),
    model: z.string().min(1),
    /** Used for embeddings when activeProvider is custom_http */
    embedModel: z.string().min(1).default("text-embedding-3-small"),
  }),
  rag: z.object({
    topK: z.number().int().min(1).max(50).default(5),
    chunkSize: z.number().int().min(200).max(8000).default(1200),
    chunkOverlap: z.number().int().min(0).max(500).default(200),
    embeddingDimensions: z.number().int().min(64).max(4096).default(768),
  }),
  chat: z
    .object({
      /** When true, messages are stored in the local database and reloaded on startup. */
      persistHistory: z.boolean().default(true),
    })
    .default({ persistHistory: true }),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;

export const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://rag:rag@127.0.0.1:5433/ragstudio"),
});

export type Env = z.infer<typeof envSchema>;

export function defaultSettings(): AppSettings {
  return appSettingsSchema.parse({
    activeProvider: "ollama",
    ollama: {},
    customHttp: {
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      embedModel: "text-embedding-3-small",
    },
    rag: {},
    chat: { persistHistory: true },
  });
}

export function parseEnv(raw: NodeJS.ProcessEnv): Env {
  return envSchema.parse({
    DATABASE_URL: raw.DATABASE_URL,
  });
}
