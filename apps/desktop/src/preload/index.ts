import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("localrag", {
  listDocuments: () => ipcRenderer.invoke("documents:list"),
  deleteDocument: (id: string) => ipcRenderer.invoke("documents:delete", id),
  clearAllDocuments: () => ipcRenderer.invoke("documents:clearAll"),
  pickIngestPaths: () => ipcRenderer.invoke("documents:pickIngestPaths"),
  ingestPath: (path: string) => ipcRenderer.invoke("documents:ingestPath", path),
  ask: (question: string) => ipcRenderer.invoke("rag:ask", question),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSettings: (payload: { settings: unknown; apiKey?: string | null }) =>
    ipcRenderer.invoke("settings:set", payload),
  resetSettings: () => ipcRenderer.invoke("settings:reset"),
  listOllamaModels: () => ipcRenderer.invoke("llm:listOllamaModels"),
  listChatMessages: () => ipcRenderer.invoke("chat:listMessages"),
  appendChatExchange: (payload: {
    userContent: string;
    assistantContent: string;
    metadata: { citations: unknown[]; otherRetrieved: unknown[] } | null;
  }) => ipcRenderer.invoke("chat:appendExchange", payload),
  clearChatMessages: () => ipcRenderer.invoke("chat:clearAll"),
});
