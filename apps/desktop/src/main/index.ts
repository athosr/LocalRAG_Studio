import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
loadDotenv({ path: resolve(process.cwd(), ".env") });

import { appSettingsSchema, defaultSettings, parseEnv } from "@localrag/config";
import {
  appendUserAssistantPair,
  createDbPool,
  deleteAllConversations,
  deleteAllDocuments,
  deleteDocument,
  listDocuments,
  listMessagesForLatestConversation,
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

  ipcMain.handle("documents:clearAll", async () => {
    if (!db) throw new Error("DB not ready");
    const { response } = await dialog.showMessageBox(mainWindow ?? undefined, {
      type: "warning",
      title: "Remove all documents?",
      message: "Remove every indexed document from your library?",
      detail:
        "This deletes the library index in your local database: document records, stored text chunks, and vector embeddings used for search. Files on your computer are not deleted. Chat history in the app is kept. This action cannot be undone.",
      buttons: ["Remove all documents", "Cancel"],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
    });
    if (response !== 0) {
      return { ok: false as const, cancelled: true as const };
    }
    const removed = await deleteAllDocuments(db);
    return { ok: true as const, removed };
  });

  ipcMain.handle("documents:pickIngestPaths", async () => {
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
    if (res.canceled || res.filePaths.length === 0) {
      return { ok: true as const, paths: [] as string[] };
    }
    return { ok: true as const, paths: res.filePaths };
  });

  ipcMain.handle("documents:ingestPath", async (_e, filePath: unknown) => {
    const path = z.string().min(1).parse(filePath);
    if (!db || !ragBase) throw new Error("Not ready");
    const fileName = path.split(/[/\\]/).pop() ?? "file";
    try {
      const buffer = await readFile(path);
      const settings = await loadSettings();
      const apiKey = await loadApiKey();
      const r = await ragIngest({
        baseUrl: ragBase,
        buffer,
        fileName,
        sourcePath: path,
        settings,
        apiKey,
      });
      return { path, ...r };
    } catch (e) {
      return {
        path,
        ok: false as const,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  });

  ipcMain.handle("chat:listMessages", async () => {
    if (!db) throw new Error("DB not ready");
    const rows = await listMessagesForLatestConversation(db);
    return rows.map((r) => ({
      id: r.id,
      role: r.role as "user" | "assistant",
      content: r.content,
      createdAt: r.createdAt.toISOString(),
      metadata: r.metadata ?? null,
    }));
  });

  const chatAppendExchangeSchema = z.object({
    userContent: z.string().min(1).max(32000),
    assistantContent: z.string().min(1).max(32000),
    metadata: z
      .object({
        citations: z.array(z.unknown()).optional(),
        otherRetrieved: z.array(z.unknown()).optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  });

  ipcMain.handle("chat:appendExchange", async (_e, payload: unknown) => {
    if (!db) throw new Error("DB not ready");
    const p = chatAppendExchangeSchema.parse(payload);
    const ids = await appendUserAssistantPair(db, {
      userContent: p.userContent,
      assistantContent: p.assistantContent,
      metadata: p.metadata ?? null,
    });
    return { ok: true as const, ...ids };
  });

  ipcMain.handle("chat:clearAll", async () => {
    if (!db) throw new Error("DB not ready");
    const { response } = await dialog.showMessageBox(mainWindow ?? undefined, {
      type: "warning",
      title: "Remove all chat messages?",
      message: "Delete every stored message from chat history?",
      detail:
        "All chat turns saved in the local database will be removed. Your document library is not affected. This cannot be undone.",
      buttons: ["Remove all messages", "Cancel"],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
    });
    if (response !== 0) {
      return { ok: false as const, cancelled: true as const };
    }
    const removed = await deleteAllConversations(db);
    return { ok: true as const, removed };
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
