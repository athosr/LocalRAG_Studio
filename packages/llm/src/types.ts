export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type LlmCompleteResult = {
  text: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
};

export type LlmProvider = {
  complete: (messages: ChatMessage[]) => Promise<LlmCompleteResult>;
};
