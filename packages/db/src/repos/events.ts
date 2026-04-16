import type { Db } from "../client.js";
import { ingestionEvents, queryEvents } from "../schema.js";

export async function logIngestionEvent(
  db: Db,
  row: typeof ingestionEvents.$inferInsert,
) {
  await db.insert(ingestionEvents).values(row);
}

export async function logQueryEvent(
  db: Db,
  row: typeof queryEvents.$inferInsert,
) {
  await db.insert(queryEvents).values(row);
}
