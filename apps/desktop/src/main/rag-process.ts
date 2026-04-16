import { type ChildProcess, execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import log from "electron-log";

let child: ChildProcess | null = null;

export function resolveRagServiceRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "../../../../rag-service");
}

function pythonExecutable(): string {
  return process.env.LOCALRAG_PYTHON?.trim() || (process.platform === "win32" ? "python" : "python3");
}

export function startRagService(params: {
  port: number;
  databaseUrl: string;
  cwd: string;
}): ChildProcess {
  if (child) {
    return child;
  }
  const py = pythonExecutable();
  const args = [
    "-m",
    "uvicorn",
    "rag_service.main:app",
    "--host",
    "127.0.0.1",
    "--port",
    String(params.port),
  ];
  log.info("Starting rag-service:", py, args.join(" "), "cwd=", params.cwd);
  child = spawn(py, args, {
    cwd: params.cwd,
    env: {
      ...process.env,
      DATABASE_URL: params.databaseUrl,
      PYTHONUNBUFFERED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  child.stderr?.on("data", (buf) => log.warn("[rag-service]", buf.toString()));
  child.stdout?.on("data", (buf) => log.info("[rag-service]", buf.toString()));
  child.on("error", (e) => log.error("rag-service spawn error", e));
  child.on("exit", (code, signal) => {
    log.info("rag-service exited", code, signal);
    child = null;
  });
  return child;
}

export async function waitForRagHealth(baseUrl: string, maxMs = 90_000): Promise<void> {
  const deadline = Date.now() + maxMs;
  let lastErr: unknown;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
      lastErr = new Error(`health ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function stopRagService(): Promise<void> {
  if (!child?.pid) {
    child = null;
    return;
  }
  const pid = child.pid;
  try {
    if (process.platform === "win32") {
      await execFileAsync("taskkill", ["/PID", String(pid), "/T", "/F"]);
    } else {
      child.kill("SIGTERM");
    }
  } catch (e) {
    log.warn("stopRagService", e);
  }
  child = null;
}

export function ragBaseUrl(port: number): string {
  return `http://127.0.0.1:${port}`;
}

export function ragPort(): number {
  const raw = process.env.LOCALRAG_RAG_PORT;
  const n = raw ? Number.parseInt(raw, 10) : 8787;
  return Number.isFinite(n) && n > 0 ? n : 8787;
}
