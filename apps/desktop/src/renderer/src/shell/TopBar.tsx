import type { DocumentRow } from "../api/types.js";
import type { AppTab } from "./types.js";

export type TopBarProps = {
  tab: AppTab;
  setTab: (t: AppTab) => void;
  docs: DocumentRow[];
  busy: boolean;
  ingesting: boolean;
  onIngest: () => void | Promise<void>;
  refreshDocs: () => void | Promise<void>;
  onClearLibrary: () => void | Promise<void>;
};

export function TopBar({
  tab,
  setTab,
  docs,
  busy,
  ingesting,
  onIngest,
  refreshDocs,
  onClearLibrary,
}: TopBarProps) {
  return (
    <header className="app-topbar">
      <div className="topbar-brand">
        <div className="brand-mark brand-mark-sm" aria-hidden>
          LR
        </div>
        <div className="topbar-titles">
          <span className="topbar-name">LocalRAG Studio</span>
          <span className="topbar-sub">On-device RAG</span>
        </div>
      </div>

      <nav className="topbar-nav" aria-label="Primary">
        <button
          type="button"
          className={`nav-pill${tab === "chat" ? " nav-pill-active" : ""}`}
          aria-current={tab === "chat" ? "page" : undefined}
          onClick={() => setTab("chat")}
        >
          Chat
        </button>
        <button
          type="button"
          className={`nav-pill${tab === "library" ? " nav-pill-active" : ""}${ingesting ? " nav-pill-pending" : ""}`}
          aria-current={tab === "library" ? "page" : undefined}
          aria-busy={ingesting || undefined}
          onClick={() => setTab("library")}
        >
          Library
          {ingesting ? <span className="nav-pill-spinner spinner" aria-hidden /> : null}
          {docs.length > 0 ? <span className="nav-pill-count">{docs.length}</span> : null}
        </button>
        <button
          type="button"
          className={`nav-pill${tab === "settings" ? " nav-pill-active" : ""}`}
          aria-current={tab === "settings" ? "page" : undefined}
          onClick={() => setTab("settings")}
        >
          Settings
        </button>
      </nav>

      <div className="topbar-actions">
        {tab === "library" ? (
          <>
            <button type="button" className="primary topbar-ingest" disabled={busy} onClick={() => void onIngest()}>
              {ingesting ? (
                <>
                  <span className="spinner spinner-on-primary" aria-hidden />
                  Adding…
                </>
              ) : (
                "Add documents…"
              )}
            </button>
            <button type="button" className="ghost" disabled={busy} onClick={() => void refreshDocs()}>
              Refresh
            </button>
            {docs.length > 0 ? (
              <button type="button" className="danger-ghost" disabled={busy} onClick={() => void onClearLibrary()}>
                Remove all documents
              </button>
            ) : null}
          </>
        ) : tab === "chat" ? (
          <button type="button" className="ghost topbar-linkish" disabled={busy} onClick={() => setTab("library")}>
            {docs.length === 0 ? "Add sources" : `${docs.length} source${docs.length === 1 ? "" : "s"}`}
          </button>
        ) : null}
      </div>
    </header>
  );
}
