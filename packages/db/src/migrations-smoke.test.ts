import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("migrations", () => {
  it("includes init SQL with pgvector and core tables", () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const sql = readFileSync(join(dir, "../migrations/001_init.sql"), "utf8");
    expect(sql).toContain("CREATE EXTENSION IF NOT EXISTS vector");
    expect(sql).not.toContain("timescaledb");
    expect(sql).not.toContain("create_hypertable");
    expect(sql).toContain("chunks");
    expect(sql).toContain("ingestion_events");
    expect(sql).toContain("query_events");
  });

  it("includes upgrade migration to drop Timescale if present", () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const sql = readFileSync(
      join(dir, "../migrations/003_remove_timescaledb.sql"),
      "utf8",
    );
    expect(sql).toContain("DROP EXTENSION IF EXISTS timescaledb");
  });
});
