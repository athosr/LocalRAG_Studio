import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

export function createDbPool(connectionString: string) {
  const pool = new pg.Pool({
    connectionString,
    max: 8,
    idleTimeoutMillis: 30_000,
  });
  const db = drizzle(pool, { schema });
  return { pool, db };
}

export type DbPool = ReturnType<typeof createDbPool>;
