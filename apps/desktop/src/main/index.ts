import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
loadDotenv({ path: resolve(process.cwd(), ".env") });

import { appSettingsSchema, defaultSettings, parseEnv } from "@localrag/config";
import {
  createDbPool,
  deleteDocument,
  listDocuments,
  runMigrations,
} from "@localrag/db";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import log from "electron-log";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { resolveMigrationsDirectory } from "./migrations-path.js";
import { ragAsk, ragIngest, ragListOllamaModels } from "./rag-client.js";
import {
  ragBaseUrl,
  ragPort,
  resolveRagServiceRoot,
  startRagService,
  stopRagService,
  waitForRagHealth,
} from "./rag-process.js";
import {
  loadApiKey,
  loadSettings,
  saveApiKey,
  saveSettings,
} from "./settings-store.js";

log.transports.file.level = "info";
Object.assign(console, log.functions);

let mainWindow: BrowserWindow | null = null;
let pool: ReturnType<typeof createDbPool>["pool"] | null = null;
let db: ReturnType<typeof createDbPool>["db"] | null = null;
let ragBase: string | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    webPreferences: {
      preload: join(dirname(fileURLToPath(import.meta.url)), "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    void mainWindow.loadFile(
      join(dirname(fileURLToPath(import.meta.url)), "../../renderer/index.html"),
    );
  }
}

async function bootstrapDb() {
  const env = parseEnv(process.env);
  const migrationsDir = resolveMigrationsDirectory();
  await runMigrations(env.DATABASE_URL, migrationsDir);
  const created = createDbPool(env.DATABASE_URL);
  pool = created.pool;
  db = created.db;
}

async function bootstrapRagService() {
  const env = parseEnv(process.env);
  const port = ragPort();
  ragBase = ragBaseUrl(port);
  const cwd = resolveRagServiceRoot();
  startRagService({ port, databaseUrl: env.DATABASE_URL, cwd });
  try {
    await waitForRagHealth(ragBase);
  } catch (e) {
    log.error("RAG service health check failed", e);
    dialog.showErrorBox(
      "RAG service failed",
      "Could not start the Python rag-service (uvicorn). Install Python 3.14, run: cd rag-service && pip install -e \".[dev]\"\n\n" +
        "Set LOCALRAG_PYTHON if `python` is not on PATH.\n\n" +
        String(e instanceof Error ? e.message : e),
    );
    app.quit();
    throw e;
  }
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", async () => {
  await stopRagService();
  await pool?.end();
  pool = null;
  db = null;
});

app.whenReady().then(async () => {
  try {
    await bootstrapDb();
    await bootstrapRagService();
  } catch (e) {
    log.error("Bootstrap failed", e);
    return;
  }

  ipcMain.handle("documents:list", async () => {
    if (!db) throw new Error("DB not ready");
    return listDocuments(db);
  });

  ipcMain.handle("documents:delete", async (_e, id: unknown) => {
    const schema = z.string().uuid();
    const documentId = schema.parse(id);
    if (!db) throw new Error("DB not ready");
    await deleteDocument(db, documentId);
    return { ok: true };
  });

  ipcMain.handle("documents:ingestPick", async () => {
    if (!db || !ragBase) throw new Error("Not ready");
    const res = await dialog.showOpenDialog(mainWindow ?? undefined, {
      properties: ["openFile", "multiSelections"],
      filters: [
        {
          name: "Documents",
          extensions: ["txt", "md", "markdown", "json", "pdf"],
        },
      ],
    });
    if (res.canceled || res.filePaths.length === 0) return { ok: true, results: [] };

    const settings = await loadSettings();
    const apiKey = await loadApiKey();
    const results = [];
    for (const p of res.filePaths) {
      const buffer = await readFile(p);
      const fileName = p.split(/[/\\]/).pop() ?? "file";
      const r = await ragIngest({
        baseUrl: ragBase,
        buffer,
        fileName,
        sourcePath: p,
        settings,
        apiKey,
      });
      results.push({ path: p, ...r });
    }
    return { ok: true, results };
  });

  ipcMain.handle("rag:ask", async (_e, question: unknown) => {
    const q = z.string().min(1).max(8000).parse(question);
    if (!ragBase) throw new Error("RAG not ready");
    const settings = await loadSettings();
    const apiKey = await loadApiKey();
    return ragAsk({
      baseUrl: ragBase,
      question: q,
      settings,
      apiKey,
    });
  });

  ipcMain.handle("settings:get", async () => {
    const settings = await loadSettings();
    const hasApiKey = Boolean(await loadApiKey());
    return { settings, hasApiKey };
  });

  ipcMain.handle(
    "settings:set",
    async (_e, payload: { settings: unknown; apiKey?: string | null }) => {
      const settings = appSettingsSchema.parse(payload.settings);
      await saveSettings(settings);
      if (payload.apiKey === null) await saveApiKey(null);
      else if (typeof payload.apiKey === "string" && payload.apiKey.trim().length > 0) {
        await saveApiKey(payload.apiKey.trim());
      }
      return { ok: true };
    },
  );

  ipcMain.handle("settings:reset", async () => {
    await saveSettings(defaultSettings());
    await saveApiKey(null);
    return { ok: true };
  });

  ipcMain.handle("llm:listOllamaModels", async () => {
    if (!ragBase) throw new Error("RAG not ready");
    const settings = await loadSettings();
    return ragListOllamaModels(ragBase, settings.ollama.host);
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
