import type { DocumentRow } from "../api/types.js";
import { docStatusBadgeClass } from "../lib/docStatusBadge.js";
import libraryStyles from "./LibraryView.module.css";

export type LibraryViewProps = {
  docs: DocumentRow[];
  busy: boolean;
  ingesting: boolean;
  onIngest: () => void | Promise<void>;
  onDeleteDoc: (id: string) => void | Promise<void>;
};

export function LibraryView({ docs, busy, ingesting, onIngest, onDeleteDoc }: LibraryViewProps) {
  return (
    <main className="view-panel view-library" aria-busy={ingesting || undefined}>
      <div className="view-panel-head">
        <div className="view-header">
          <div>
            <h1 className="view-title">Library</h1>
            <p className="view-subtitle">Files you ingest are chunked, embedded, and used for retrieval.</p>
          </div>
        </div>
        {ingesting ? (
          <div className={libraryStyles.ingestBanner} role="status" aria-live="polite">
            <span className="spinner" aria-hidden />
            <span className={libraryStyles.ingestBannerText}>
              Adding documents — chunking and embedding. This can take a little while for large files.
            </span>
          </div>
        ) : null}
      </div>
      <div className="view-panel-scroll">
        {docs.length === 0 ? (
          <div className="empty-state empty-state-lg">
            <h2 className="empty-title">No documents yet</h2>
            <p>Add PDFs or text files to build a private knowledge base on this machine.</p>
            <button
              type="button"
              className={`primary ${libraryStyles.btnWithSpinner}`}
              disabled={busy}
              onClick={() => void onIngest()}
            >
              {ingesting ? (
                <>
                  <span className="spinner spinner-on-primary" aria-hidden />
                  Adding…
                </>
              ) : (
                "Add documents…"
              )}
            </button>
          </div>
        ) : (
          <div className={`${libraryStyles.docGrid}${ingesting ? ` ${libraryStyles.docGridDimmed}` : ""}`}>
            {docs.map((d) => (
              <article className="doc doc-tile" key={d.id}>
                <div className="doc-head">
                  <h3 className="doc-title">{d.title}</h3>
                  <span className={docStatusBadgeClass(d.status)}>{d.status}</span>
                </div>
                <div className="doc-meta">
                  <span className="badge badge-muted">{d.mime}</span>
                </div>
                <div className="doc-actions">
                  <button type="button" className="danger-ghost" disabled={busy} onClick={() => void onDeleteDoc(d.id)}>
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
