import { app, safeStorage } from "electron";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { appSettingsSchema, defaultSettings, type AppSettings } from "@localrag/config";

const SETTINGS_FILE = "settings.json";
const API_KEY_FILE = "api_key.enc";

function userDataPath(name: string) {
  return join(app.getPath("userData"), name);
}

function mergeSettings(raw: unknown): AppSettings {
  const d = defaultSettings();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return d;
  const r = raw as Record<string, unknown>;
  const isObj = (v: unknown): v is Record<string, unknown> =>
    Boolean(v) && typeof v === "object" && !Array.isArray(v);

  return appSettingsSchema.parse({
    ...d,
    ...r,
    ollama: { ...d.ollama, ...(isObj(r.ollama) ? r.ollama : {}) },
    customHttp: { ...d.customHttp, ...(isObj(r.customHttp) ? r.customHttp : {}) },
    rag: { ...d.rag, ...(isObj(r.rag) ? r.rag : {}) },
  });
}

export async function loadSettings(): Promise<AppSettings> {
  const path = userDataPath(SETTINGS_FILE);
  try {
    const raw = JSON.parse(await readFile(path, "utf8")) as unknown;
    return mergeSettings(raw);
  } catch {
    return defaultSettings();
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const parsed = appSettingsSchema.parse(settings);
  const path = userDataPath(SETTINGS_FILE);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(parsed, null, 2), "utf8");
}

export async function loadApiKey(): Promise<string | null> {
  const path = userDataPath(API_KEY_FILE);
  try {
    const buf = await readFile(path);
    if (buf.length === 0) return null;
    if (!safeStorage.isEncryptionAvailable()) {
      return buf.toString("utf8").trim() || null;
    }
    try {
      return safeStorage.decryptString(buf).trim() || null;
    } catch {
      // Corrupt blob, plaintext from another build, or OS keychain mismatch — do not break the app.
      const asText = buf.toString("utf8").trim();
      return asText.length > 0 ? asText : null;
    }
  } catch {
    return null;
  }
}

export async function saveApiKey(apiKey: string | null): Promise<void> {
  const path = userDataPath(API_KEY_FILE);
  await mkdir(dirname(path), { recursive: true });
  if (!apiKey) {
    await writeFile(path, "", "utf8");
    return;
  }
  if (safeStorage.isEncryptionAvailable()) {
    await writeFile(path, safeStorage.encryptString(apiKey));
  } else {
    await writeFile(path, apiKey, "utf8");
  }
}
