import { parseEnv } from "@localrag/config";
import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrations } from "./migrate.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRootEnv = resolve(here, "../../../.env");
const cwdEnv = resolve(process.cwd(), ".env");

const seen = new Set<string>();
for (const p of [repoRootEnv, cwdEnv]) {
  const key = resolve(p);
  if (seen.has(key)) continue;
  seen.add(key);
  if (existsSync(key)) {
    loadDotenv({ path: key, override: true });
  }
}

const env = parseEnv(process.env);
await runMigrations(env.DATABASE_URL);
// eslint-disable-next-line no-console
console.log("Migrations applied.");
