import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("localrag", {
  listDocuments: () => ipcRenderer.invoke("documents:list"),
  deleteDocument: (id: string) => ipcRenderer.invoke("documents:delete", id),
  ingestPick: () => ipcRenderer.invoke("documents:ingestPick"),
  ask: (question: string) => ipcRenderer.invoke("rag:ask", question),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSettings: (payload: { settings: unknown; apiKey?: string | null }) =>
    ipcRenderer.invoke("settings:set", payload),
  resetSettings: () => ipcRenderer.invoke("settings:reset"),
  listOllamaModels: () => ipcRenderer.invoke("llm:listOllamaModels"),
});
