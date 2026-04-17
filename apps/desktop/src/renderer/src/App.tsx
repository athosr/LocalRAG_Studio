import { useEffect, useState } from "react";
import { ChatView } from "./chat/ChatView.js";
import { useChatSession } from "./hooks/useChatSession.js";
import { useDocuments } from "./hooks/useDocuments.js";
import { useSettingsForm } from "./hooks/useSettingsForm.js";
import { LibraryView } from "./library/LibraryView.js";
import { SettingsView } from "./settings/SettingsView.js";
import { TopBar } from "./shell/TopBar.js";
import type { AppTab } from "./shell/types.js";

export function App() {
  const [tab, setTab] = useState<AppTab>("chat");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { docs, refreshDocs, deleteDocument } = useDocuments(setError, setBusy);
  const {
    draft,
    setDraft,
    hasApiKey,
    apiKeyInput,
    setApiKeyInput,
    ollamaModels,
    refreshSettings,
    onSaveSettings,
    onResetSettings,
    onRefreshOllamaModels,
    onClearApiKey,
    providerLabel,
  } = useSettingsForm(setError, setBusy);

  const chat = useChatSession({
    setError,
    setBusy,
    busy,
    refreshDocs,
    setTab,
    tab,
  });

  useEffect(() => {
    void refreshDocs();
    void refreshSettings();
  }, [refreshDocs, refreshSettings]);

  if (!draft) {
    return (
      <div className="app-loading" role="status" aria-live="polite">
        <span className="spinner spinner-lg" aria-hidden />
        <p>Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopBar
        tab={tab}
        setTab={setTab}
        docs={docs}
        busy={busy}
        onIngest={chat.onIngest}
        refreshDocs={refreshDocs}
      />

      {error ? (
        <div className="app-inline-alert" role="alert">
          <div className="alert-body">{error}</div>
          <button type="button" className="ghost alert-dismiss" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="app-body">
        {tab === "chat" ? (
          <ChatView
            busy={busy}
            docsCount={docs.length}
            question={chat.question}
            setQuestion={chat.setQuestion}
            onQuestionKeyDown={chat.onQuestionKeyDown}
            lastPrompt={chat.lastPrompt}
            asking={chat.asking}
            answer={chat.answer}
            sourcesOpen={chat.sourcesOpen}
            setSourcesOpen={chat.setSourcesOpen}
            showOtherRetrieved={chat.showOtherRetrieved}
            setShowOtherRetrieved={chat.setShowOtherRetrieved}
            onIngest={chat.onIngest}
            onAsk={chat.onAsk}
            chatScrollRef={chat.chatScrollRef}
            sourcesCloseRef={chat.sourcesCloseRef}
          />
        ) : null}

        {tab === "library" ? (
          <LibraryView docs={docs} busy={busy} onIngest={chat.onIngest} onDeleteDoc={deleteDocument} />
        ) : null}

        {tab === "settings" ? (
          <SettingsView
            draft={draft}
            setDraft={setDraft}
            hasApiKey={hasApiKey}
            apiKeyInput={apiKeyInput}
            setApiKeyInput={setApiKeyInput}
            ollamaModels={ollamaModels}
            busy={busy}
            onSaveSettings={onSaveSettings}
            onResetSettings={onResetSettings}
            onRefreshOllamaModels={onRefreshOllamaModels}
            onClearApiKey={onClearApiKey}
            providerLabel={providerLabel}
          />
        ) : null}
      </div>
    </div>
  );
}
