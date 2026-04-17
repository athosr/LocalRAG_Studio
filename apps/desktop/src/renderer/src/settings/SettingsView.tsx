import type { AppSettings } from "@localrag/config";
import type { Dispatch, SetStateAction } from "react";
import settingsStyles from "./SettingsView.module.css";

export type SettingsViewProps = {
  draft: AppSettings;
  setDraft: Dispatch<SetStateAction<AppSettings>>;
  hasApiKey: boolean;
  apiKeyInput: string;
  setApiKeyInput: (v: string) => void;
  ollamaModels: string[];
  busy: boolean;
  onSaveSettings: () => void | Promise<void>;
  onResetSettings: () => void | Promise<void>;
  onRefreshOllamaModels: () => void | Promise<void>;
  onClearApiKey: () => void | Promise<void>;
  onClearChatHistory: () => void | Promise<void>;
  providerLabel: string;
};

export function SettingsView({
  draft,
  setDraft,
  hasApiKey,
  apiKeyInput,
  setApiKeyInput,
  ollamaModels,
  busy,
  onSaveSettings,
  onResetSettings,
  onRefreshOllamaModels,
  onClearApiKey,
  onClearChatHistory,
  providerLabel,
}: SettingsViewProps) {
  return (
    <main className="view-panel view-settings">
      <div className="view-panel-head">
        <div className="view-header">
          <div>
            <h1 className="view-title">Settings</h1>
            <p className="view-subtitle">Models, endpoints, and retrieval — saved locally.</p>
          </div>
        </div>
      </div>
      <div className="view-panel-scroll">
        <div className={settingsStyles.stack}>
          <section className="settings-card">
            <h2 className="settings-card-title">Model &amp; provider</h2>
            <div className="field">
              <label htmlFor="provider">Provider</label>
              <select
                id="provider"
                value={draft.activeProvider}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    activeProvider: e.target.value as AppSettings["activeProvider"],
                  })
                }
              >
                <option value="ollama">Ollama</option>
                <option value="custom_http">Custom HTTP</option>
              </select>
            </div>

            {draft.activeProvider === "ollama" ? (
              <>
                <label htmlFor="ollamaHost">Ollama host</label>
                <input
                  id="ollamaHost"
                  value={draft.ollama.host}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      ollama: { ...draft.ollama, host: e.target.value },
                    })
                  }
                />
                <label htmlFor="chatModel">Chat model</label>
                <input
                  id="chatModel"
                  value={draft.ollama.chatModel}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      ollama: { ...draft.ollama, chatModel: e.target.value },
                    })
                  }
                  list="ollama-model-suggestions"
                />
                <datalist id="ollama-model-suggestions">
                  {ollamaModels.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
                <label htmlFor="embedModel">Embedding model</label>
                <input
                  id="embedModel"
                  value={draft.ollama.embedModel}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      ollama: { ...draft.ollama, embedModel: e.target.value },
                    })
                  }
                />
                <div className="row row-tight">
                  <button type="button" disabled={busy} onClick={() => void onRefreshOllamaModels()}>
                    List Ollama models
                  </button>
                </div>
              </>
            ) : (
              <>
                <label htmlFor="baseUrl">Base URL</label>
                <input
                  id="baseUrl"
                  value={draft.customHttp.baseUrl}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      customHttp: { ...draft.customHttp, baseUrl: e.target.value },
                    })
                  }
                />
                <label htmlFor="httpModel">Chat model</label>
                <input
                  id="httpModel"
                  value={draft.customHttp.model}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      customHttp: { ...draft.customHttp, model: e.target.value },
                    })
                  }
                />
                <label htmlFor="embedModelHttp">Embedding model</label>
                <input
                  id="embedModelHttp"
                  value={draft.customHttp.embedModel}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      customHttp: { ...draft.customHttp, embedModel: e.target.value },
                    })
                  }
                />
                <label htmlFor="apiKey">API key {hasApiKey ? "(saved)" : "(not set)"}</label>
                <input
                  id="apiKey"
                  type="password"
                  autoComplete="off"
                  placeholder="Stored securely when supported by the OS"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                />
              </>
            )}
          </section>

          <section className="settings-card">
            <h2 className="settings-card-title">Chat</h2>
            <label className={settingsStyles.checkboxRow}>
              <input
                type="checkbox"
                checked={draft.chat.persistHistory}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    chat: { ...draft.chat, persistHistory: e.target.checked },
                  })
                }
              />
              <span>Save chat history to the local database (reloads when you open the app)</span>
            </label>
            <p className="sources-hint">
              When turned off, messages stay only until you close the window. Turning it on again loads saved history
              from the database.
            </p>
            <div className="row row-tight">
              <button type="button" className="danger-ghost" disabled={busy} onClick={() => void onClearChatHistory()}>
                Remove all chat messages…
              </button>
            </div>
          </section>

          <section className="settings-card">
            <h2 className="settings-card-title">Retrieval</h2>
            <label htmlFor="topK">Top K</label>
            <input
              id="topK"
              type="number"
              value={draft.rag.topK}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  rag: { ...draft.rag, topK: Number(e.target.value) },
                })
              }
            />

            <details className="settings-advanced">
              <summary>Chunking &amp; embeddings</summary>
              <div className="advanced-inner">
                <label htmlFor="chunkSize">Chunk size (characters)</label>
                <input
                  id="chunkSize"
                  type="number"
                  value={draft.rag.chunkSize}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      rag: { ...draft.rag, chunkSize: Number(e.target.value) },
                    })
                  }
                />
                <label htmlFor="chunkOverlap">Chunk overlap (characters)</label>
                <input
                  id="chunkOverlap"
                  type="number"
                  value={draft.rag.chunkOverlap}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      rag: { ...draft.rag, chunkOverlap: Number(e.target.value) },
                    })
                  }
                />
                <label htmlFor="dims">Embedding dimensions</label>
                <input
                  id="dims"
                  type="number"
                  value={draft.rag.embeddingDimensions}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      rag: { ...draft.rag, embeddingDimensions: Number(e.target.value) },
                    })
                  }
                />
                <p className="sources-hint">Dimensions must match your embedding model and database schema.</p>
              </div>
            </details>
          </section>

          <div className="settings-card settings-card-actions">
            <div className="row">
              <button type="button" className="primary" disabled={busy} onClick={() => void onSaveSettings()}>
                Save settings
              </button>
              <button type="button" disabled={busy} onClick={() => void onResetSettings()}>
                Reset
              </button>
              {draft.activeProvider === "custom_http" ? (
                <button type="button" disabled={busy} onClick={() => void onClearApiKey()}>
                  Clear API key
                </button>
              ) : null}
            </div>
            <p className="provider-footnote">Active route: {providerLabel}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
