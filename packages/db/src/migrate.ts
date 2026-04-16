import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runMigrations(
  connectionString: string,
  migrationsDirectory?: string,
): Promise<void> {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id serial PRIMARY KEY,
        name text UNIQUE NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    const migrationsDir =
      migrationsDirectory ?? join(__dirname, "../migrations");
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const name of files) {
      const existing = await client.query(
        `SELECT 1 FROM schema_migrations WHERE name = $1`,
        [name],
      );
      if (existing.rowCount && existing.rowCount > 0) continue;

      const sql = readFileSync(join(migrationsDir, name), "utf8");
      await client.query(sql);
      await client.query(`INSERT INTO schema_migrations (name) VALUES ($1)`, [
        name,
      ]);
    }
  } finally {
    await client.end();
  }
}
