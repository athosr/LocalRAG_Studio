import { type RefObject } from "react";
import type { CitationRow } from "../api/types.js";
import styles from "./SourcesModal.module.css";

export type SourcesModalProps = {
  open: boolean;
  answer: {
    citations: CitationRow[];
    otherRetrieved: CitationRow[];
  } | null;
  showOtherRetrieved: boolean;
  setShowOtherRetrieved: (v: boolean | ((prev: boolean) => boolean)) => void;
  onClose: () => void;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
};

export function SourcesModal({
  open,
  answer,
  showOtherRetrieved,
  setShowOtherRetrieved,
  onClose,
  closeButtonRef,
}: SourcesModalProps) {
  if (!open || !answer) return null;

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.window}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sources-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="sources-dialog-title" className={styles.title}>
            Sources
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className={styles.close}
            aria-label="Close sources"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className={styles.body}>
          <p className="sources-hint">
            Chunk index is 0-based within each document; a short file often appears as a single chunk 0.
          </p>
          {(answer.citations ?? []).map((c) => (
            <div className="citation" key={`m-${c.chunkId}`}>
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
                    These passages were also retrieved for the model but were not referenced as <code>[#n]</code> in
                    the answer above.
                  </p>
                  {(answer.otherRetrieved ?? []).map((c) => (
                    <div className="citation citation-muted" key={`mo-${c.chunkId}`}>
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
      </div>
    </div>
  );
}
