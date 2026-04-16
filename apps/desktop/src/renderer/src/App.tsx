import { defaultSettings, type AppSettings } from "@localrag/config";
import { useCallback, useEffect, useMemo, useState } from "react";

type DocRow = Awaited<ReturnType<typeof window.localrag.listDocuments>>[number];

export function App() {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  type CitationRow = {
    refIndex: number;
    chunkId: string;
    documentId: string;
    title: string;
    chunkIndex: number;
    excerpt: string;
  };

  const [answer, setAnswer] = useState<{
    text: string;
    citations: CitationRow[];
    otherRetrieved: CitationRow[];
  } | null>(null);

  const [hasApiKey, setHasApiKey] = useState(false);
  const [draft, setDraft] = useState<AppSettings | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [asking, setAsking] = useState(false);
  const [showOtherRetrieved, setShowOtherRetrieved] = useState(false);

  const refreshDocs = useCallback(async () => {
    setError(null);
    try {
      const rows = await window.localrag.listDocuments();
      setDocs(rows);
    } catch (e) {
      setDocs([]);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    setError(null);
    try {
      const s = await window.localrag.getSettings();
      setDraft(s.settings);
      setHasApiKey(s.hasApiKey);
    } catch (e) {
      setDraft(defaultSettings());
      setHasApiKey(false);
      setError(
        `Could not load settings (${e instanceof Error ? e.message : String(e)}). Using defaults.`,
      );
    }
  }, []);

  useEffect(() => {
    void refreshDocs();
    void refreshSettings();
  }, [refreshDocs, refreshSettings]);

  useEffect(() => {
    if (answer) setShowOtherRetrieved(false);
  }, [answer]);

  const providerLabel = useMemo(() => {
    if (!draft) return "";
    return draft.activeProvider === "ollama" ? "Ollama (local)" : "Custom HTTP (OpenAI-compatible)";
  }, [draft]);

  async function onIngest() {
    setBusy(true);
    setError(null);
    try {
      const res = await window.localrag.ingestPick();
      if (!res.ok || !res.results) return;
      const failed = res.results.filter((r) => !r.ok);
      if (failed.length) {
        setError(failed.map((f) => `${f.path}: ${f.error ?? "error"}`).join("\n"));
      }
      await refreshDocs();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onAsk() {
    setBusy(true);
    setAsking(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await window.localrag.ask(question);
      setAnswer({
        text: res.text,
        citations: res.citations ?? [],
        otherRetrieved: res.otherRetrieved ?? [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAsking(false);
      setBusy(false);
    }
  }

  async function onSaveSettings() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const payload: { settings: AppSettings; apiKey?: string | null } = {
        settings: draft,
      };
      if (apiKeyInput.trim().length > 0) payload.apiKey = apiKeyInput.trim();
      await window.localrag.setSettings(payload);
      setApiKeyInput("");
      await refreshSettings();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onResetSettings() {
    setBusy(true);
    setError(null);
    try {
      await window.localrag.resetSettings();
      setApiKeyInput("");
      await refreshSettings();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onRefreshOllamaModels() {
    setBusy(true);
    setError(null);
    try {
      const models = await window.localrag.listOllamaModels();
      setOllamaModels(models);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteDoc(id: string) {
    setBusy(true);
    setError(null);
    try {
      await window.localrag.deleteDocument(id);
      await refreshDocs();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!draft) {
    return <div className="main">Loading settings…</div>;
  }

  return (
    <div className="app">
      <aside className="panel">
        <h1>LocalRAG Studio</h1>
        <div className="row">
          <button className="primary" disabled={busy} onClick={() => void onIngest()}>
            Add documents…
          </button>
          <button disabled={busy} onClick={() => void refreshDocs()}>
            Refresh
          </button>
        </div>

        <h2>Library</h2>
        {docs.length === 0 ? (
          <p>No documents yet.</p>
        ) : (
          docs.map((d) => (
            <div className="doc" key={d.id}>
              <div>
                <strong>{d.title}</strong>
              </div>
              <small>
                {d.mime} · {d.status}
              </small>
              <div className="row" style={{ marginTop: 8 }}>
                <button disabled={busy} onClick={() => void onDeleteDoc(d.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))
        )}

        <h2>LLM & RAG</h2>
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
            <div className="row" style={{ marginTop: 8 }}>
              <button disabled={busy} onClick={() => void onRefreshOllamaModels()}>
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
              placeholder="Paste key to store securely in OS storage when available"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
            />
          </>
        )}

        <label htmlFor="topK">Top K retrieval</label>
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

        <label htmlFor="dims">Embedding dimensions (must match DB / models)</label>
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

        <div className="row" style={{ marginTop: 10 }}>
          <button className="primary" disabled={busy} onClick={() => void onSaveSettings()}>
            Save settings
          </button>
          <button disabled={busy} onClick={() => void onResetSettings()}>
            Reset
          </button>
          {draft.activeProvider === "custom_http" ? (
            <button
              disabled={busy}
              onClick={async () => {
                if (!draft) return;
                setBusy(true);
                setError(null);
                try {
                  await window.localrag.setSettings({ settings: draft, apiKey: null });
                  await refreshSettings();
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Clear API key
            </button>
          ) : null}
        </div>

        <p style={{ marginTop: 12, fontSize: 12, color: "#aeb4c0" }}>{providerLabel}</p>
      </aside>

      <main className="main">
        <h1>Ask your library</h1>
        <div className="chat" aria-busy={asking}>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question grounded in your ingested documents…"
            disabled={asking}
          />
          <div className="row ask-actions">
            <button className="primary" disabled={busy || !question.trim()} onClick={() => void onAsk()}>
              Ask
            </button>
            {asking ? (
              <span className="ask-loading" aria-live="polite">
                <span className="spinner" aria-hidden />
                Retrieving context and generating an answer…
              </span>
            ) : null}
          </div>

          {error ? <div className="error">{error}</div> : null}

          {answer ? (
            <div>
              <h2>Answer</h2>
              <div style={{ whiteSpace: "pre-wrap" }}>{answer.text}</div>
              <h2>Sources</h2>
              <p className="sources-hint">
                Chunk index is 0-based within each document; a short file often appears as a single chunk
                0.
              </p>
              {(answer.citations ?? []).map((c) => (
                <div className="citation" key={`p-${c.chunkId}`}>
                  <strong>
                    [#{c.refIndex}] {c.title} · chunk {c.chunkIndex}
                  </strong>
                  <div className="citation-excerpt">{c.excerpt}</div>
                </div>
              ))}
              {(answer.otherRetrieved ?? []).length > 0 ? (
                <div className="other-retrieved">
                  <button
                    type="button"
                    className="secondary-toggle"
                    onClick={() => setShowOtherRetrieved((v) => !v)}
                  >
                    {showOtherRetrieved
                      ? "Hide other retrieved passages"
                      : `Show other retrieved passages (${(answer.otherRetrieved ?? []).length})`}
                  </button>
                  {showOtherRetrieved ? (
                    <div className="other-retrieved-list">
                      <p className="sources-hint">
                        These passages were also retrieved for the model but were not referenced as{" "}
                        <code>[#n]</code> in the answer above.
                      </p>
                      {(answer.otherRetrieved ?? []).map((c) => (
                        <div className="citation citation-muted" key={`o-${c.chunkId}`}>
                          <strong>
                            [#{c.refIndex}] {c.title} · chunk {c.chunkIndex}
                          </strong>
                          <div className="citation-excerpt">{c.excerpt}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
