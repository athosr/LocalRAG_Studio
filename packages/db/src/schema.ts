import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  customType,
} from "drizzle-orm/pg-core";
/** pgvector column (768 dims); ANN index is pgvectorscale StreamingDiskANN (see migrations) */
const vector768 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(768)";
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: unknown): number[] {
    if (typeof value === "string") {
      return JSON.parse(value) as number[];
    }
    return value as number[];
  },
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourcePath: text("source_path"),
  title: text("title").notNull(),
  mime: text("mime").notNull(),
  contentHash: text("content_hash").notNull(),
  status: text("status").notNull().default("ready"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const chunks = pgTable("chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  charStart: integer("char_start"),
  charEnd: integer("char_end"),
  embedding: vector768("embedding").notNull(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const ingestionEvents = pgTable("ingestion_events", {
  time: timestamp("time", { withTimezone: true }).notNull().defaultNow(),
  documentId: uuid("document_id").references(() => documents.id, {
    onDelete: "set null",
  }),
  stage: text("stage").notNull(),
  error: text("error"),
  bytes: integer("bytes"),
  durationMs: integer("duration_ms"),
});

export const queryEvents = pgTable("query_events", {
  time: timestamp("time", { withTimezone: true }).notNull().defaultNow(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  latencyMs: integer("latency_ms"),
  topK: integer("top_k"),
  retrievedChunkIds: jsonb("retrieved_chunk_ids").$type<string[]>(),
});
