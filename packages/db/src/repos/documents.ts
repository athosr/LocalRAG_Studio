import { desc, eq, sql } from "drizzle-orm";
import type { Db } from "../client.js";
import { documents } from "../schema.js";

export async function listDocuments(db: Db) {
  return db
    .select()
    .from(documents)
    .orderBy(desc(documents.createdAt));
}

export async function findDocumentByHash(db: Db, contentHash: string) {
  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.contentHash, contentHash))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertDocument(
  db: Db,
  row: typeof documents.$inferInsert,
) {
  const inserted = await db.insert(documents).values(row).returning();
  return inserted[0]!;
}

export async function deleteDocument(db: Db, id: string) {
  await db.delete(documents).where(eq(documents.id, id));
}

/** Deletes every document row; chunk rows cascade via FK. */
export async function deleteAllDocuments(db: Db): Promise<number> {
  const removed = await db.delete(documents).where(sql`true`).returning({ id: documents.id });
  return removed.length;
}

export async function getDocument(db: Db, id: string) {
  const rows = await db.select().from(documents).where(eq(documents.id, id));
  return rows[0] ?? null;
}
