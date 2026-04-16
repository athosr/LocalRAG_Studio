import { app } from "electron";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Resolves SQL migrations directory for dev (repo) and packaged (extraResources) layouts.
 */
export function resolveMigrationsDirectory(): string {
  const mainFile = fileURLToPath(import.meta.url);
  const mainDir = dirname(mainFile);
  const devCandidate = join(mainDir, "../../../../packages/db/migrations");
  if (existsSync(devCandidate)) return devCandidate;

  if (app.isPackaged) {
    const packaged = join(process.resourcesPath, "migrations");
    if (existsSync(packaged)) return packaged;
  }

  return join(mainDir, "../../../../packages/db/migrations");
}
