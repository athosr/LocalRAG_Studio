import { asc, desc, eq, sql } from "drizzle-orm";
import type { Db } from "../client.js";
import { conversations, messages, type MessageMetadata } from "../schema.js";

export type ChatMessageRow = {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  metadata: MessageMetadata | null | undefined;
  createdAt: Date;
};

export async function getLatestConversationId(db: Db): Promise<string | null> {
  const rows = await db
    .select({ id: conversations.id })
    .from(conversations)
    .orderBy(desc(conversations.createdAt))
    .limit(1);
  return rows[0]?.id ?? null;
}

export async function getOrCreateDefaultConversationId(db: Db): Promise<string> {
  const existing = await getLatestConversationId(db);
  if (existing) return existing;
  const [row] = await db
    .insert(conversations)
    .values({ title: "Library chat" })
    .returning({ id: conversations.id });
  return row!.id;
}

export async function listMessagesForLatestConversation(db: Db): Promise<ChatMessageRow[]> {
  const cid = await getLatestConversationId(db);
  if (!cid) return [];
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, cid))
    .orderBy(asc(messages.createdAt));
}

export async function appendUserAssistantPair(
  db: Db,
  params: {
    userContent: string;
    assistantContent: string;
    metadata: MessageMetadata;
  },
): Promise<{ userId: string; assistantId: string }> {
  const conversationId = await getOrCreateDefaultConversationId(db);
  return db.transaction(async (tx) => {
    const [u] = await tx
      .insert(messages)
      .values({
        conversationId,
        role: "user",
        content: params.userContent,
        metadata: null,
      })
      .returning({ id: messages.id });
    const [a] = await tx
      .insert(messages)
      .values({
        conversationId,
        role: "assistant",
        content: params.assistantContent,
        metadata: params.metadata,
      })
      .returning({ id: messages.id });
    return { userId: u!.id, assistantId: a!.id };
  });
}

export async function deleteAllConversations(db: Db): Promise<number> {
  const before = await db.select({ id: conversations.id }).from(conversations);
  await db.delete(conversations).where(sql`true`);
  return before.length;
}
